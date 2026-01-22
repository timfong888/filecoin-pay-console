"use client";

import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Payer } from "@/components/dashboard/TopPayersTable";
import {
  fetchAllPayersExtended,
  fetchAccountDetail,
  fetchPayerListMetrics,
  enrichPayersWithPDP,
  enrichPayersWithSettled7d,
  AccountDetail,
  PayerDisplayExtended,
} from "@/lib/graphql/fetchers";
import {
  FILECOIN_PAY_CONTRACT,
  GOLDSKY_ENDPOINT,
  SUBGRAPH_VERSION,
  NETWORK,
} from "@/lib/graphql/client";
import { batchResolveENS, resolveENS } from "@/lib/ens";
import {
  fetchDataSetsWithRootsByCorrelation,
  calculateStorageSummary,
  formatBytesSize,
} from "@/lib/pdp/fetchers";
import { RailDataSetCorrelation } from "@/lib/pdp/types";
import { PDPDataSetWithRoots, PieceDisplayData } from "@/lib/pdp/types";
import {
  fetchPieceMetadata,
  hexCidToBase32,
  truncateCID,
} from "@/lib/stateview/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Dynamic import for charts - defers recharts bundle loading
const PayerListCharts = dynamic(
  () => import("@/components/dashboard/PayerListCharts").then(mod => mod.PayerListCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-100 rounded-lg h-80 animate-pulse" />
        <div className="bg-gray-100 rounded-lg h-80 animate-pulse" />
      </div>
    ),
  }
);

// Types
interface PayerListMetrics {
  activePayers: number;  // Payers with ACTIVE rail AND lockupRate > 0
  totalPayers: number;   // All payers (for reference)
  payersWoWChange: string; // Legacy field
  // New fields for "Last 7 days" display
  newPayersLast7d: number;      // Absolute count of new payers in last 7 days
  newPayersPrev7d: number;      // New payers in prior 7 days (for comparison)
  payersLast7dPercentChange: string; // Percentage change vs prior 7 days
  payersGoalProgress: number;
  settledTotal: number;
  settledFormatted: string;
  settledGoalProgress: number;
  // Settled in last 7 days
  settled7d: number;
  settled7dFormatted: string;
  // Monthly run rate (kept for reference but not displayed in hero)
  monthlyRunRate: number;
  monthlyRunRateFormatted: string;
  annualizedRunRate: number;
  annualizedRunRateFormatted: string;
  runRateGoalProgress: number;
  activeRailsCount: number;
  // Cumulative data for charts (total at each point in time)
  cumulativePayers: number[];
  cumulativeSettled: number[];
  chartDates: string[];
}

// Hero Metric Card Component
function HeroMetricCard({
  title,
  value,
  subtitle,
  last7dChange,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  last7dChange?: { count: number; percentChange: string } | null;
}) {
  const isPositiveChange = last7dChange && parseFloat(last7dChange.percentChange) >= 0;

  return (
    <div className="bg-white border rounded-lg p-6 flex-1">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <div className="flex items-baseline gap-3 mt-1">
        <p className="text-3xl font-bold">{value}</p>
        {last7dChange && (
          <span
            className={`text-sm font-medium ${
              isPositiveChange ? "text-green-600" : "text-red-600"
            }`}
            title={`${last7dChange.count} new accounts in last 7 days (${isPositiveChange ? "+" : ""}${last7dChange.percentChange}% vs prior week)`}
          >
            +{last7dChange.count} last 7d ({isPositiveChange ? "+" : ""}{last7dChange.percentChange}%)
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// Filter Controls Component
function FilterControls({
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  onApply,
}: {
  fromDate: string;
  toDate: string;
  setFromDate: (v: string) => void;
  setToDate: (v: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">From:</label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-white"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">To:</label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-white"
        />
      </div>

      <button
        onClick={onApply}
        className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Apply
      </button>
    </div>
  );
}

// Detail View Component
function PayerDetailView({ address }: { address: string }) {
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [counterpartyEnsNames, setCounterpartyEnsNames] = useState<Map<string, string | null>>(new Map());

  // My Data state
  const [dataSets, setDataSets] = useState<PDPDataSetWithRoots[]>([]);
  const [pieceData, setPieceData] = useState<PieceDisplayData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  // Provider ENS names - reserved for future use when we correlate DataSets with Rails
  // const [providerEnsNames, setProviderEnsNames] = useState<Map<string, string | null>>(new Map());

  // CID Lookup state
  const [cidSearchQuery, setCidSearchQuery] = useState("");
  const [cidSearchResult, setCidSearchResult] = useState<PieceDisplayData | null>(null);
  const [cidSearching, setCidSearching] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!address) return;

      try {
        setLoading(true);
        const data = await fetchAccountDetail(address);

        if (!data) {
          setError("Account not found");
          return;
        }

        setAccount(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch account:", err);
        setError("Failed to load account from subgraph");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [address]);

  // Resolve ENS name
  useEffect(() => {
    if (!address) return;

    async function resolveAccountENS() {
      try {
        const name = await resolveENS(address);
        if (name) {
          setEnsName(name);
        }
      } catch (err) {
        console.error("Failed to resolve ENS:", err);
      }
    }

    resolveAccountENS();
  }, [address]);

  // Resolve ENS names for counterparties in rail tables
  useEffect(() => {
    if (!account) return;

    // Collect all unique counterparty addresses from both payer and payee rails
    const addresses = new Set<string>();
    for (const rail of account.payerRails) {
      if (rail.counterpartyAddress) {
        addresses.add(rail.counterpartyAddress);
      }
    }
    for (const rail of account.payeeRails) {
      if (rail.counterpartyAddress) {
        addresses.add(rail.counterpartyAddress);
      }
    }

    if (addresses.size === 0) return;

    async function resolveCounterpartyNames(addressList: string[]) {
      try {
        const ensNames = await batchResolveENS(addressList);
        setCounterpartyEnsNames(ensNames);
      } catch (err) {
        console.error("Failed to resolve counterparty ENS names:", err);
      }
    }

    resolveCounterpartyNames(Array.from(addresses));
  }, [account]);

  // Fetch My Data (DataSets and pieces) - depends on account data for rail correlations
  useEffect(() => {
    // Wait for both address and account data to be available
    if (!address || !account || loading) return;

    async function loadMyData() {
      // Re-check account since it could change during async execution
      if (!account) return;

      try {
        setDataLoading(true);

        // Build rail correlations from account's payer rails
        // DataSets are owned by SPs (payees), so we correlate by payee + timestamp
        const railCorrelations: RailDataSetCorrelation[] = account.payerRails.map(rail => ({
          payeeAddress: rail.counterpartyAddress,
          railCreatedAt: Math.floor(rail.createdAtTimestamp / 1000).toString(), // Convert ms to seconds
        }));

        // Fetch DataSets with roots using rail correlations
        const fetchedDataSets = await fetchDataSetsWithRootsByCorrelation(railCorrelations);
        setDataSets(fetchedDataSets);

        // Transform to PieceDisplayData
        // Provider (SP) is the DataSet owner
        const pieces: PieceDisplayData[] = [];

        for (const ds of fetchedDataSets) {
          const providerAddress = ds.owner?.address || "";
          for (const root of ds.roots || []) {
            // Convert hex CID to base32
            const pieceCIDBase32 = hexCidToBase32(root.cid);

            pieces.push({
              dataSetId: ds.setId,
              pieceId: root.rootId,
              pieceCID: pieceCIDBase32,
              pieceCIDHex: root.cid,
              ipfsCID: null, // Will be fetched from StateView
              size: formatBytesSize(BigInt(root.rawSize)),
              sizeBytes: BigInt(root.rawSize),
              provider: providerAddress,
              providerFormatted: providerAddress ? `${providerAddress.slice(0, 6)}...${providerAddress.slice(-4)}` : "—",
              isActive: ds.isActive,
            });
          }
        }

        setPieceData(pieces);

        // Fetch IPFS CIDs from StateView (in background, may be slow)
        const enrichedPieces = await Promise.all(
          pieces.map(async (piece) => {
            try {
              const metadata = await fetchPieceMetadata(piece.dataSetId, piece.pieceId);
              return {
                ...piece,
                ipfsCID: metadata.ipfsRootCID,
              };
            } catch {
              return piece;
            }
          })
        );

        setPieceData(enrichedPieces);
      } catch (err) {
        console.error("Failed to load My Data:", err);
      } finally {
        setDataLoading(false);
      }
    }

    loadMyData();
  }, [address, account, loading]);

  // CID search handler
  const handleCidSearch = useCallback(async () => {
    if (!cidSearchQuery.trim()) return;

    setCidSearching(true);
    setCidSearchResult(null);

    const query = cidSearchQuery.trim().toLowerCase();

    // Search in pieceData
    const found = pieceData.find(
      (p) =>
        p.pieceCID.toLowerCase().includes(query) ||
        p.pieceCIDHex.toLowerCase().includes(query) ||
        (p.ipfsCID && p.ipfsCID.toLowerCase().includes(query))
    );

    if (found) {
      setCidSearchResult(found);
    }

    setCidSearching(false);
  }, [cidSearchQuery, pieceData]);

  // Calculate storage summary
  const storageSummary = useMemo(() => {
    return calculateStorageSummary(dataSets);
  }, [dataSets]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/payer-accounts" className="text-blue-600 hover:underline">
            ← Back to Payers
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Payer Details</h1>
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/payer-accounts" className="text-blue-600 hover:underline">
            ← Back to Payers
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Payer Details</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error || "Account not found"}</p>
          <p className="text-xs mt-2 font-mono">{address}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Link href="/payer-accounts" className="text-blue-600 hover:underline">
          ← Back to Payers
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payer Details</h1>
          <div className="flex items-center gap-2 mt-1">
            {ensName ? (
              <>
                <span className="text-blue-600 font-medium text-lg">{ensName}</span>
                <span className="text-gray-400 text-sm font-mono">({account.address})</span>
              </>
            ) : (
              <span className="font-mono text-lg">{account.address}</span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            Available Funds
            <span
              className="text-gray-400 cursor-help"
              title="Funds that can be withdrawn. Total deposited minus locked amount."
            >
              ⓘ
            </span>
          </p>
          <p className="text-2xl font-bold">{account.totalFunds}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            Locked Funds
            <span
              className="text-gray-400 cursor-help"
              title="Funds committed to payment rails. Reserved for future settlements to SPs."
            >
              ⓘ
            </span>
          </p>
          <p className="text-2xl font-bold">{account.totalLocked}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Storage</p>
          <p className="text-2xl font-bold">
            {dataLoading ? "..." : storageSummary.totalStorageFormatted || "-"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {dataLoading ? "" : `across ${storageSummary.totalPieces} CIDs`}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Runway</p>
          <p className="text-2xl font-bold">
            {storageSummary.runwayDays !== null ? `${storageSummary.runwayDays} days` : "-"}
          </p>
          <p className="text-xs text-gray-400 mt-1">at current rate</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Bandwidth</p>
          <p className="text-2xl font-bold text-gray-400">Coming Soon</p>
        </div>
      </div>

      {/* My Data Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            My Data {storageSummary.totalPieces > 0 && `(${storageSummary.totalPieces.toLocaleString()})`}
          </h2>
        </div>

        {/* CID Lookup */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Enter IPFS CID or Piece CID to lookup..."
              value={cidSearchQuery}
              onChange={(e) => setCidSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCidSearch()}
              className="flex-1 px-4 py-2 border rounded-md"
            />
            <button
              onClick={handleCidSearch}
              disabled={cidSearching || !cidSearchQuery.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {cidSearching ? "..." : "Search"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Supports bidirectional lookup: IPFS CID → Piece CID or Piece CID → IPFS CID
          </p>

          {/* Search Result */}
          {cidSearchResult && (
            <div className="mt-4 p-3 bg-white border rounded-md">
              <p className="text-sm font-medium text-green-600 mb-2">Found match:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Piece CID:</span>{" "}
                  <span className="font-mono">{truncateCID(cidSearchResult.pieceCID)}</span>
                </div>
                <div>
                  <span className="text-gray-500">IPFS CID:</span>{" "}
                  <span className="font-mono">{cidSearchResult.ipfsCID ? truncateCID(cidSearchResult.ipfsCID) : "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Size:</span> {cidSearchResult.size}
                </div>
                <div>
                  <span className="text-gray-500">Provider:</span>{" "}
                  <span className="text-gray-400">{cidSearchResult.providerFormatted}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My Data Table */}
        {dataLoading ? (
          <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        ) : pieceData.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-8 text-center text-gray-500">
            No data sets found for this payer
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-medium">Piece CID</TableHead>
                  <TableHead className="font-medium">IPFS CID</TableHead>
                  <TableHead className="font-medium">Size</TableHead>
                  <TableHead className="font-medium">Provider</TableHead>
                  <TableHead className="font-medium">Data Set</TableHead>
                  <TableHead className="font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pieceData.map((piece, index) => (
                  <TableRow
                    key={`${piece.dataSetId}-${piece.pieceId}`}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm" title={piece.pieceCID}>
                          {truncateCID(piece.pieceCID)}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(piece.pieceCID)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy Piece CID"
                        >
                          📋
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {piece.ipfsCID ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm" title={piece.ipfsCID}>
                            {truncateCID(piece.ipfsCID)}
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText(piece.ipfsCID!)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy IPFS CID"
                          >
                            📋
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>{piece.size}</TableCell>
                    <TableCell>
                      {piece.provider ? (
                        <Link
                          href={`/payee-accounts?address=${piece.provider}`}
                          className="text-blue-600 hover:underline font-mono text-sm"
                          title={piece.provider}
                        >
                          {piece.providerFormatted}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-blue-600 font-medium">DS-{piece.dataSetId.slice(-3).padStart(3, "0")}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const url = piece.ipfsCID
                              ? `https://dweb.link/ipfs/${piece.ipfsCID}`
                              : `https://data.filecoin.io/piece/${piece.pieceCID}`;
                            navigator.clipboard.writeText(url);
                          }}
                          className="text-blue-600 hover:underline text-sm"
                          title="Copy retrieval URL"
                        >
                          Copy URL
                        </button>
                        {piece.ipfsCID && (
                          <a
                            href={`https://dweb.link/ipfs/${piece.ipfsCID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Note about IPFS CID */}
        <p className="text-xs text-gray-400">
          Note: IPFS CID shows &quot;—&quot; when not set (Synapse SDK users). Piece CID is always available.
        </p>
      </div>

      {/* Payment Rails (as Payer) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Payment Rails (Paying To)</h2>
        {account.payerRails.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-8 text-center text-gray-500">
            No payment rails found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-medium">Payee</TableHead>
                  <TableHead className="font-medium">Settled</TableHead>
                  <TableHead className="font-medium">Rate</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.payerRails.map((rail, index) => (
                  <TableRow
                    key={rail.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <TableCell>
                      <Link
                        href={`/payee-accounts?address=${rail.counterpartyAddress}`}
                        className="hover:underline"
                      >
                        {counterpartyEnsNames.get(rail.counterpartyAddress?.toLowerCase()) ? (
                          <span className="text-blue-600 font-medium">
                            {counterpartyEnsNames.get(rail.counterpartyAddress?.toLowerCase())}
                          </span>
                        ) : (
                          <span className="font-mono text-sm text-blue-600">
                            {rail.counterpartyFormatted}
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>{rail.settled}</TableCell>
                    <TableCell>{rail.rate}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          rail.stateCode === 0
                            ? "bg-green-100 text-green-800"
                            : rail.stateCode === 1
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {rail.state}
                      </span>
                    </TableCell>
                    <TableCell>{rail.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Incoming Rails (as Payee) */}
      {account.payeeRails.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Incoming Rails (Receiving From)</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-medium">Payer</TableHead>
                  <TableHead className="font-medium">Received</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.payeeRails.map((rail, index) => (
                  <TableRow
                    key={rail.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <TableCell>
                      <Link
                        href={`/payer-accounts?address=${rail.counterpartyAddress}`}
                        className="hover:underline"
                      >
                        {counterpartyEnsNames.get(rail.counterpartyAddress?.toLowerCase()) ? (
                          <span className="text-blue-600 font-medium">
                            {counterpartyEnsNames.get(rail.counterpartyAddress?.toLowerCase())}
                          </span>
                        ) : (
                          <span className="font-mono text-sm text-blue-600">
                            {rail.counterpartyFormatted}
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>{rail.settled}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          rail.stateCode === 0
                            ? "bg-green-100 text-green-800"
                            : rail.stateCode === 1
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {rail.state}
                      </span>
                    </TableCell>
                    <TableCell>{rail.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Data source indicator */}
      <div className="text-xs text-gray-400 text-right">
        Data from Goldsky subgraph
      </div>
    </div>
  );
}

// Helper to get default date range (last 30 days)
function getDefaultDateRange() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  return {
    fromDate: thirtyDaysAgo.toISOString().split('T')[0],
    toDate: today.toISOString().split('T')[0],
  };
}

// List View Component with Hero Metrics and Charts
function PayerListView() {
  const defaultDates = getDefaultDateRange();
  const [payers, setPayers] = useState<PayerDisplayExtended[]>([]);
  const [metrics, setMetrics] = useState<PayerListMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"settled" | "settled7d" | "dataSize" | "locked" | "rails" | "runway" | "start">("settled");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pdpLoading, setPdpLoading] = useState(false);
  const [fromDate, setFromDate] = useState(defaultDates.fromDate);
  const [toDate, setToDate] = useState(defaultDates.toDate);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [payersData, metricsData] = await Promise.all([
          fetchAllPayersExtended(),
          fetchPayerListMetrics(),
        ]);
        setPayers(payersData);
        setMetrics(metricsData);
        setError(null);

        // Progressively load PDP and settled7d data
        setPdpLoading(true);
        try {
          const [enrichedWithPDP, enrichedWithSettled7d] = await Promise.all([
            enrichPayersWithPDP(payersData),
            enrichPayersWithSettled7d(payersData),
          ]);

          // Merge enrichments
          const mergedPayers = payersData.map((payer, i) => ({
            ...payer,
            ...enrichedWithPDP[i],
            settled7d: enrichedWithSettled7d[i].settled7d,
            settled7dFormatted: enrichedWithSettled7d[i].settled7dFormatted,
          }));
          setPayers(mergedPayers);
        } catch (err) {
          console.error("Failed to enrich payers:", err);
        } finally {
          setPdpLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch payers:", err);
        setError("Failed to load payers from subgraph");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Resolve ENS names after data loads
  useEffect(() => {
    if (payers.length === 0) return;

    async function resolveNames() {
      const addresses = payers
        .filter((p) => p.fullAddress && !p.ensName)
        .map((p) => p.fullAddress);

      if (addresses.length === 0) return;

      try {
        const ensNames = await batchResolveENS(addresses);

        setPayers((prevPayers) =>
          prevPayers.map((payer) => {
            const ensName = ensNames.get(payer.fullAddress?.toLowerCase());
            if (ensName && !payer.ensName) {
              return { ...payer, ensName };
            }
            return payer;
          })
        );
      } catch (err) {
        console.error("Failed to resolve ENS names:", err);
      }
    }

    resolveNames();
  }, [payers.length]);

  // Prepare chart data with cumulative values (total at each point in time)
  const chartData = useMemo(() => {
    if (!metrics) return [];
    return metrics.chartDates.map((date, i) => ({
      date: date,
      payers: metrics.cumulativePayers[i],
      settled: metrics.cumulativeSettled[i],
    }));
  }, [metrics]);

  // Filter payers by search
  const filteredPayers = payers.filter((p) => {
    const matchesSearch =
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fullAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ensName && p.ensName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Sort payers
  const sortedPayers = [...filteredPayers].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortField) {
      case "settled":
        aVal = a.settledRaw || 0;
        bVal = b.settledRaw || 0;
        break;
      case "settled7d":
        aVal = a.settled7d || 0;
        bVal = b.settled7d || 0;
        break;
      case "dataSize":
        aVal = a.totalDataSizeGB || 0;
        bVal = b.totalDataSizeGB || 0;
        break;
      case "locked":
        aVal = a.lockedRaw || 0;
        bVal = b.lockedRaw || 0;
        break;
      case "rails":
        aVal = a.railsCount;
        bVal = b.railsCount;
        break;
      case "runway":
        aVal = a.runwayDays;
        bVal = b.runwayDays;
        break;
      case "start":
        aVal = a.startTimestamp;
        bVal = b.startTimestamp;
        break;
      default:
        return 0;
    }

    return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
  });

  // Pagination
  const totalPages = Math.ceil(sortedPayers.length / itemsPerPage);
  const paginatedPayers = sortedPayers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: "settled" | "settled7d" | "dataSize" | "locked" | "rails" | "runway" | "start") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleApplyFilters = async () => {
    // Re-fetch metrics with date range
    try {
      setLoading(true);
      const startDate = fromDate ? new Date(fromDate) : undefined;
      const endDate = toDate ? new Date(toDate) : undefined;
      const metricsData = await fetchPayerListMetrics(startDate, endDate);
      setMetrics(metricsData);
    } catch (err) {
      console.error("Failed to apply filters:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Payer Accounts</h1>
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Payer Accounts</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>

        {/* Default Hero Metrics (placeholder for error state) */}
        <div className="flex gap-6">
          <HeroMetricCard
            title="Active Payers"
            value="--"
            subtitle="At least 1 ACTIVE rail AND lockup rate > 0"
          />
          <HeroMetricCard
            title="Total Settled (USDFC)"
            value="--"
          />
          <HeroMetricCard
            title="Settled (7d)"
            value="--"
            subtitle="USDFC settled in the last 7 days"
          />
        </div>

        {/* Data source indicator */}
        <div className="bg-gray-50 border rounded-lg p-4 space-y-2 text-sm">
          <div className="font-medium text-gray-700">Data Source</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
            <div>Network:</div>
            <div className="font-mono">{NETWORK}</div>
            <div>Contract:</div>
            <div className="font-mono text-xs">
              <a
                href={`https://filfox.info/en/address/${FILECOIN_PAY_CONTRACT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {FILECOIN_PAY_CONTRACT}
              </a>
            </div>
            <div>Subgraph Version:</div>
            <div className="font-mono">{SUBGRAPH_VERSION}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payer Accounts</h1>
      </div>

      {/* Hero Metrics Bar (3 cards) */}
      {metrics && (
        <div className="flex gap-6">
          <HeroMetricCard
            title="Active Payers"
            value={metrics.activePayers.toLocaleString()}
            subtitle="At least 1 ACTIVE rail AND lockup rate > 0"
            last7dChange={{
              count: metrics.newPayersLast7d,
              percentChange: metrics.payersLast7dPercentChange,
            }}
          />
          <HeroMetricCard
            title="Total Settled (USDFC)"
            value={metrics.settledFormatted}
          />
          <HeroMetricCard
            title="Settled (7d)"
            value={metrics.settled7dFormatted}
            subtitle="USDFC settled in the last 7 days"
          />
        </div>
      )}

      {/* Filter Controls */}
      <FilterControls
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        onApply={handleApplyFilters}
      />

      {/* Charts - dynamically loaded */}
      {chartData.length > 0 && (
        <PayerListCharts chartData={chartData} />
      )}

      {/* Search and Register Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search by address or ENS name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border rounded-md w-96"
          />
          <span className="text-sm text-gray-500">
            Showing {paginatedPayers.length} of {sortedPayers.length} payers
          </span>
        </div>
        <button className="border border-blue-600 text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors">
          Register filpay.eth name
        </button>
      </div>

      {/* Payers Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-medium">Address</TableHead>
              <TableHead className="font-medium" title="ACTIVE rail AND lockup rate > 0">
                Active
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("rails")}
              >
                Rails {sortField === "rails" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("dataSize")}
              >
                Data Size {sortField === "dataSize" && (sortDirection === "desc" ? "↓" : "↑")}
                {pdpLoading && <span className="ml-1 text-xs text-gray-400">...</span>}
              </TableHead>
              <TableHead className="font-medium">
                Proven
                {pdpLoading && <span className="ml-1 text-xs text-gray-400">...</span>}
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("settled")}
              >
                Total Settled {sortField === "settled" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("settled7d")}
              >
                Settled (7d) {sortField === "settled7d" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("locked")}
              >
                Locked {sortField === "locked" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("runway")}
              >
                Runway {sortField === "runway" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("start")}
              >
                First Active {sortField === "start" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  No payers found
                </TableCell>
              </TableRow>
            ) : (
              paginatedPayers.map((payer, index) => (
                <TableRow
                  key={payer.fullAddress || index}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <TableCell>
                    <Link
                      href={`/payer-accounts?address=${payer.fullAddress}`}
                      className="hover:underline"
                    >
                      {payer.ensName ? (
                        <span className="text-blue-600 font-medium">{payer.ensName}</span>
                      ) : (
                        <span className="font-mono text-sm text-blue-600">{payer.address}</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {payer.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" title="ACTIVE rail AND lockup rate > 0">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600" title={`ACTIVE rail: ${payer.hasActiveRail ? 'Yes' : 'No'}, Lockup rate > 0: ${payer.hasPositiveLockupRate ? 'Yes' : 'No'}`}>
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{payer.railsCount}</TableCell>
                  <TableCell>
                    {pdpLoading ? (
                      <span className="text-gray-400">...</span>
                    ) : (
                      payer.totalDataSizeFormatted || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {pdpLoading ? (
                      <span className="text-gray-400">...</span>
                    ) : payer.proofStatus === "proven" ? (
                      <span className="text-green-600" title="Proofs submitted within 24h">Yes</span>
                    ) : payer.proofStatus === "stale" ? (
                      <span className="text-yellow-600" title="Proofs older than 24h">Stale</span>
                    ) : (
                      <span className="text-gray-400" title="No PDP data">-</span>
                    )}
                  </TableCell>
                  <TableCell>{payer.settled}</TableCell>
                  <TableCell>{payer.settled7dFormatted || "-"}</TableCell>
                  <TableCell>{payer.locked}</TableCell>
                  <TableCell>{payer.runway}</TableCell>
                  <TableCell>{payer.start}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 border rounded-md text-sm ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Data source indicator */}
      <div className="bg-gray-50 border rounded-lg p-4 space-y-2 text-sm">
        <div className="font-medium text-gray-700">Data Source</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
          <div>Network:</div>
          <div className="font-mono">{NETWORK}</div>
          <div>Contract:</div>
          <div className="font-mono text-xs">
            <a
              href={`https://filfox.info/en/address/${FILECOIN_PAY_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {FILECOIN_PAY_CONTRACT}
            </a>
          </div>
          <div>Subgraph Version:</div>
          <div className="font-mono">{SUBGRAPH_VERSION}</div>
          <div>Subgraph URL:</div>
          <div className="font-mono text-xs truncate max-w-md">
            <a
              href={GOLDSKY_ENDPOINT}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {GOLDSKY_ENDPOINT.replace('https://api.goldsky.com/api/public/', '...')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inner component that uses useSearchParams
function PayerAccountsContent() {
  const searchParams = useSearchParams();
  const address = searchParams.get("address");

  if (address) {
    return <PayerDetailView address={address} />;
  }

  return <PayerListView />;
}

// Main Page Component - wrapped in Suspense for useSearchParams
export default function PayerAccountsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Loading...</h1>
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    }>
      <PayerAccountsContent />
    </Suspense>
  );
}
