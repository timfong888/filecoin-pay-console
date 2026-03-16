/**
 * FWSS (Filecoin Warm Storage Service) subgraph client.
 *
 * Correlates a payer's Filecoin Pay rails with FWSS datasets via pdpRailId
 * to show per-piece CIDs with size-weighted cost calculations.
 *
 * Flow:
 * 1. Get payer's rails from Filecoin Pay (by payer wallet address)
 * 2. Query FWSS for datasets matching those rail IDs (pdpRailId_in)
 * 3. Join rail payment data with FWSS piece data for cost-per-piece
 *
 * Note: FWSS `payer` field is the operator/contract address, NOT the
 * Filecoin Pay wallet. That's why we join via rail IDs, not payer address.
 */

import { SUBGRAPHS } from '../graphql/client';
import { GOLDSKY_ENDPOINT } from '../graphql/client';
import {
  DataSetDisplayData,
  PieceDisplayData,
} from '../pdp/types';
import { formatBytesSize } from '../pdp/fetchers';

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

/** Get all rails for a payer from Filecoin Pay */
const FILPAY_RAILS_BY_PAYER = `
  query RailsByPayer($payerAddress: String!, $first: Int!, $skip: Int!) {
    rails(
      where: { payer: $payerAddress }
      first: $first
      skip: $skip
    ) {
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

/** Get FWSS datasets by matching pdpRailId to Filecoin Pay rail IDs */
const FWSS_DATASETS_BY_RAIL_IDS = `
  query DataSetsByRailIds($railIds: [String!]!, $first: Int!, $skip: Int!) {
    dataSets(
      where: { pdpRailId_in: $railIds }
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
      status
      pieces(first: 1000) {
        pieceCID
        size
      }
    }
  }
`;

// ── Fetch helpers ────────────────────────────────────────────────────

async function querySubgraph<T>(endpoint: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Subgraph query failed: HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.data) return json.data as T;

  const msg = json.errors?.map((e: { message: string }) => e.message).join('; ') || 'Unknown subgraph error';
  throw new Error(msg);
}

// ── Main fetcher ─────────────────────────────────────────────────────

/**
 * Fetch FWSS datasets for a payer, joined with Filecoin Pay rail data.
 *
 * Strategy: Filecoin Pay rails (by payer wallet) → rail IDs → FWSS datasets (by pdpRailId).
 * This works because FWSS `payer` is the operator contract, not the wallet address.
 *
 * Returns DataSetDisplayData[] with per-piece cost fields populated.
 * Returns empty array if the payer has no FWSS datasets (e.g., non-FWSS payers like Storacha).
 */
export async function fetchFWSSDataSetsForPayer(
  payerAddress: string
): Promise<DataSetDisplayData[]> {
  const normalizedPayer = payerAddress.toLowerCase();

  // 1. Get payer's rails from Filecoin Pay
  let allRails: FilPayRail[] = [];
  let skip = 0;
  const PAGE_SIZE = 100;

  while (true) {
    const data = await querySubgraph<FilPayRailsResponse>(GOLDSKY_ENDPOINT, FILPAY_RAILS_BY_PAYER, {
      payerAddress: normalizedPayer,
      first: PAGE_SIZE,
      skip,
    });

    if (!data.rails || data.rails.length === 0) break;
    allRails = allRails.concat(data.rails);
    if (data.rails.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  if (allRails.length === 0) return [];

  // Build rail lookup by railId
  const railMap = new Map<string, FilPayRail>();
  const railIds: string[] = [];
  for (const rail of allRails) {
    railMap.set(rail.railId, rail);
    railIds.push(rail.railId);
  }

  // 2. Query FWSS for datasets matching those rail IDs
  let allDataSets: FWSSDataSet[] = [];
  skip = 0;

  while (true) {
    const data = await querySubgraph<FWSSDataSetsResponse>(FWSS_ENDPOINT, FWSS_DATASETS_BY_RAIL_IDS, {
      railIds,
      first: PAGE_SIZE,
      skip,
    });

    if (!data.dataSets || data.dataSets.length === 0) break;
    allDataSets = allDataSets.concat(data.dataSets);
    if (data.dataSets.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  if (allDataSets.length === 0) return [];

  const now = Date.now();

  // 3. Transform to DataSetDisplayData with per-piece costs
  return allDataSets.map((ds) => {
    const providerAddress = ds.payee.id;
    const totalSizeBytes = BigInt(ds.totalSize);
    const totalSizeNum = Number(totalSizeBytes);

    // Get the matching rail for cost calculations
    const rail = ds.pdpRailId ? railMap.get(ds.pdpRailId) : undefined;

    let totalPaidUSDFC = 0;
    let costPerGBMonth: number | null = null;
    let paymentRatePerSecond = BigInt(0);
    let railCreatedAtMs = 0;
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
        const monthlyWei = paymentRatePerSecond * BigInt(SECONDS_PER_MONTH);
        const monthlyUSDFC = Number(monthlyWei) / 1e18;
        costPerMonth = Math.round(monthlyUSDFC * sizeWeight * 10000) / 10000;
        totalSettled = Math.round(railTotalSettled * sizeWeight * 10000) / 10000;
      }

      return {
        dataSetId: ds.dataSetId,
        pieceId: String(index),
        pieceCID: piece.pieceCID,
        pieceCIDHex: '',
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
      lastProvenEpoch: null,
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
