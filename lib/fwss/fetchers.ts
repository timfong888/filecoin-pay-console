/**
 * FWSS (Filecoin Warm Storage Service) subgraph client.
 *
 * Queries FWSS for datasets and pieces by payer address, then joins with
 * Filecoin Pay rails via pdpRailId for payment/cost data.
 *
 * Unlike PDP (which owns datasets by SP address), FWSS has a direct
 * `payer` field on DataSet, enabling straightforward payer-filtered queries.
 */

import { SUBGRAPHS } from '../graphql/client';
import { GOLDSKY_ENDPOINT } from '../graphql/client';
import {
  DataSetDisplayData,
  PieceDisplayData,
} from '../pdp/types';
import { formatBytesSize, formatTimeAgo } from '../pdp/fetchers';

// FWSS subgraph endpoint
const FWSS_ENDPOINT = SUBGRAPHS.FWSS.endpoint;

// ── Raw FWSS response types ──────────────────────────────────────────

interface FWSSPiece {
  pieceCID: string;   // CommP CID, base32 (bafkz...)
  size: string;       // Bytes as string
}

interface FWSSDataSet {
  dataSetId: string;
  payer: { id: string };
  payee: { id: string };
  totalPieces: number;
  totalSize: string;     // Bytes as string
  pdpRailId: string;     // Join key to Filecoin Pay
  cacheMissRailId: string | null;
  cdnRailId: string | null;
  status: string;        // "Active" | "Terminated"
  pieces: FWSSPiece[];
}

interface FWSSDataSetsResponse {
  dataSets: FWSSDataSet[];
}

// ── Filecoin Pay rail types ──────────────────────────────────────────

interface FilPayRail {
  id: string;          // Hex ID (0x01)
  railId: string;      // Numeric string
  paymentRate: string;  // Wei per second
  totalSettledAmount: string; // Wei
  createdAt: string;    // Unix timestamp
  payer: { address: string };
  payee: { address: string };
  token: { symbol: string; decimals: number };
  state: string;
}

interface FilPayRailsResponse {
  rails: FilPayRail[];
}

// ── Constants ────────────────────────────────────────────────────────

const BYTES_PER_GB = 1024 ** 3;
const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

// ── GraphQL queries ──────────────────────────────────────────────────

const FWSS_DATASETS_BY_PAYER = `
  query DataSetsByPayer($payerAddress: String!, $first: Int!, $skip: Int!) {
    dataSets(
      where: { payer: $payerAddress }
      first: $first
      skip: $skip
      orderBy: dataSetId
      orderDirection: desc
    ) {
      dataSetId
      payer { id }
      payee { id }
      totalPieces
      totalSize
      pdpRailId
      cacheMissRailId
      cdnRailId
      status
      pieces(first: 1000) {
        pieceCID
        size
      }
    }
  }
`;

const FILPAY_RAILS_BY_IDS = `
  query RailsByIds($railIds: [String!]!) {
    rails(where: { railId_in: $railIds }) {
      id
      railId
      paymentRate
      totalSettledAmount
      createdAt
      payer { address }
      payee { address }
      token { symbol decimals }
      state
    }
  }
`;

// ── Fetch helpers ────────────────────────────────────────────────────

async function queryFWSS<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(FWSS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`FWSS query failed: HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.data) return json.data as T;

  const msg = json.errors?.map((e: { message: string }) => e.message).join('; ') || 'Unknown FWSS error';
  throw new Error(msg);
}

async function queryFilPay<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`FilPay query failed: HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.data) return json.data as T;

  const msg = json.errors?.map((e: { message: string }) => e.message).join('; ') || 'Unknown FilPay error';
  throw new Error(msg);
}

// ── Main fetcher ─────────────────────────────────────────────────────

/**
 * Fetch FWSS datasets for a payer address, joined with Filecoin Pay
 * rail data for cost calculations.
 *
 * Returns DataSetDisplayData[] with per-piece cost fields populated.
 */
export async function fetchFWSSDataSetsForPayer(
  payerAddress: string
): Promise<DataSetDisplayData[]> {
  const normalizedPayer = payerAddress.toLowerCase();

  // 1. Fetch all datasets from FWSS for this payer
  let allDataSets: FWSSDataSet[] = [];
  let skip = 0;
  const PAGE_SIZE = 100;

  while (true) {
    const data = await queryFWSS<FWSSDataSetsResponse>(FWSS_DATASETS_BY_PAYER, {
      payerAddress: normalizedPayer,
      first: PAGE_SIZE,
      skip,
    });

    if (!data.dataSets || data.dataSets.length === 0) break;
    allDataSets = allDataSets.concat(data.dataSets);
    if (data.dataSets.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  if (allDataSets.length === 0) return [];

  // 2. Collect unique rail IDs for Filecoin Pay lookup
  const railIds = new Set<string>();
  for (const ds of allDataSets) {
    if (ds.pdpRailId) railIds.add(ds.pdpRailId);
    if (ds.cacheMissRailId) railIds.add(ds.cacheMissRailId);
    if (ds.cdnRailId) railIds.add(ds.cdnRailId);
  }

  // 3. Fetch rail data from Filecoin Pay
  const railMap = new Map<string, FilPayRail>();
  if (railIds.size > 0) {
    try {
      const railData = await queryFilPay<FilPayRailsResponse>(FILPAY_RAILS_BY_IDS, {
        railIds: Array.from(railIds),
      });
      for (const rail of railData.rails || []) {
        railMap.set(rail.railId, rail);
      }
    } catch (error) {
      console.error('Failed to fetch Filecoin Pay rails for FWSS join:', error);
    }
  }

  const now = Date.now();

  // 4. Transform to DataSetDisplayData
  return allDataSets.map((ds) => {
    const providerAddress = ds.payee.id;
    const totalSizeBytes = BigInt(ds.totalSize);
    const totalSizeNum = Number(totalSizeBytes);

    // Get primary rail (pdpRailId) for cost calculations
    const rail = ds.pdpRailId ? railMap.get(ds.pdpRailId) : undefined;

    let totalPaidUSDFC = 0;
    let costPerGBMonth: number | null = null;
    let paymentRatePerSecond = BigInt(0);
    let railCreatedAtMs = 0;

    // Also accumulate totalSettledAmount from rail
    let railTotalSettled = 0;

    if (rail) {
      paymentRatePerSecond = BigInt(rail.paymentRate);
      railCreatedAtMs = parseInt(rail.createdAt) * 1000;

      // Total paid = rate × duration
      const durationSeconds = Math.floor((now - railCreatedAtMs) / 1000);
      if (durationSeconds > 0 && paymentRatePerSecond > BigInt(0)) {
        const totalPaidWei = paymentRatePerSecond * BigInt(durationSeconds);
        totalPaidUSDFC = Number(totalPaidWei) / 1e18;
      }

      // Total settled from subgraph (actual on-chain settlements)
      railTotalSettled = Number(BigInt(rail.totalSettledAmount)) / 1e18;

      // Cost per GB per month
      const sizeGB = totalSizeNum / BYTES_PER_GB;
      if (sizeGB > 0 && paymentRatePerSecond > BigInt(0)) {
        const monthlyWei = paymentRatePerSecond * BigInt(SECONDS_PER_MONTH);
        const monthlyUSDFC = Number(monthlyWei) / 1e18;
        costPerGBMonth = Math.round((monthlyUSDFC / sizeGB) * 100) / 100;
      }
    }

    // Transform pieces with size-weighted cost
    const pieces: PieceDisplayData[] = ds.pieces.map((piece, index) => {
      const sizeBytes = BigInt(piece.size);
      const sizeNum = Number(sizeBytes);
      const sizeWeight = totalSizeNum > 0 ? sizeNum / totalSizeNum : 0;

      let costPerMonth: number | null = null;
      let totalSettled: number | null = null;

      if (rail && paymentRatePerSecond > BigInt(0)) {
        // Size-weighted monthly cost
        const monthlyWei = paymentRatePerSecond * BigInt(SECONDS_PER_MONTH);
        const monthlyUSDFC = Number(monthlyWei) / 1e18;
        costPerMonth = Math.round(monthlyUSDFC * sizeWeight * 10000) / 10000;

        // Size-weighted total settled
        totalSettled = Math.round(railTotalSettled * sizeWeight * 10000) / 10000;
      }

      return {
        dataSetId: ds.dataSetId,
        pieceId: String(index),
        pieceCID: piece.pieceCID,
        pieceCIDHex: '',  // FWSS provides base32 natively
        ipfsCID: null,
        size: formatBytesSize(sizeBytes),
        sizeBytes,
        provider: providerAddress,
        providerFormatted: formatAddress(providerAddress),
        isActive: ds.status === 'Active',
        costPerMonth,
        totalSettled,
      };
    });

    return {
      setId: ds.dataSetId,
      providerAddress,
      providerENS: null,
      providerFormatted: formatAddress(providerAddress),
      totalSizeBytes,
      totalSizeFormatted: formatBytesSize(totalSizeBytes),
      pieceCount: ds.totalPieces,
      isActive: ds.status === 'Active',
      lastProvenEpoch: null,  // FWSS doesn't track proving
      lastProvenFormatted: null,
      hasFaults: false,
      faultedPeriods: 0,
      createdAt: '',
      railId: ds.pdpRailId || null,
      paymentRatePerSecond,
      railCreatedAtMs,
      totalPaidUSDFC: Math.round(totalPaidUSDFC * 100) / 100,
      costPerGBMonth,
      pieces,
    };
  });
}

function formatAddress(address: string): string {
  if (!address || address.length < 10) return address || '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
