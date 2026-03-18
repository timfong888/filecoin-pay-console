"use client";

import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Payer } from "@/components/dashboard/TopPayersTable";
import {
  fetchAllPayersExtended,
  fetchAccountDetail,
  fetchPayerListMetrics,
  enrichPayersWithPDP,
  enrichPayersWithSettled7d,
  AccountDetail,
  PayerDisplayExtended,
  formatChartDate,
  formatChartCurrency,
  RailDisplay,
} from "@/lib/graphql/fetchers";
import { SettleRailDialog, RailForSettle } from "@/components/settle/SettleRailDialog";
import { useAccount } from "wagmi";
import {
  FILECOIN_PAY_CONTRACT,
  GOLDSKY_ENDPOINT,
  SUBGRAPH_VERSION,
  NETWORK,
} from "@/lib/graphql/client";
import { batchResolveENS } from "@/lib/ens";
import { getKnownWalletName } from "@/lib/wallet-registry";
import { useEnsName } from "@/lib/hooks/useEnsResolution";
import {
  calculateDataSetsSummary,
} from "@/lib/pdp/fetchers";
import { DataSetDisplayData, PieceDisplayData } from "@/lib/pdp/types";
import {
  truncateCID,
} from "@/lib/stateview/client";
import { fetchFWSSDataSetsForPayer } from "@/lib/fwss/fetchers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataSetCard } from "@/components/payer/DataSetCard";
import { OperatorGroupedRails } from "@/components/payer/OperatorGroupedRails";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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
  const { ensName, resolving: resolvingName } = useEnsName(address);
  const [counterpartyEnsNames, setCounterpartyEnsNames] = useState<Map<string, string | null>>(new Map());

  // Settle dialog state
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedRail, setSelectedRail] = useState<RailForSettle | null>(null);
  const { isConnected } = useAccount();

  // Helper to convert RailDisplay to RailForSettle
  const toRailForSettle = (rail: RailDisplay): RailForSettle => ({
    id: rail.id,
    railId: rail.railId,
    payerAddress: rail.payerAddress,
    payeeAddress: rail.payeeAddress,
    tokenSymbol: rail.tokenSymbol,
    tokenDecimals: rail.tokenDecimals,
    paymentRate: rail.paymentRate,
    totalSettledAmount: rail.settledRaw.toString(),
    state: rail.state.toUpperCase(),
    settledUpto: rail.settledUpto,
  });

  // Handle settle button click
  const handleSettleClick = (rail: RailDisplay) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    setSelectedRail(toRailForSettle(rail));
    setSettleDialogOpen(true);
  };

  // My Data state
  const [pieceData, setPieceData] = useState<PieceDisplayData[]>([]);
  const [dataSetDisplay, setDataSetDisplay] = useState<DataSetDisplayData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  // Provider ENS names for DataSet cards
  const [providerEnsNames, setProviderEnsNames] = useState<Map<string, string | null>>(new Map());

  // CID Lookup state
  const [cidSearchQuery, setCidSearchQuery] = useState("");
  const [cidSearchResult, setCidSearchResult] = useState<PieceDisplayData | null>(null);
  const [cidSearching, setCidSearching] = useState(false);
  const [matchingDataSetId, setMatchingDataSetId] = useState<string | null>(null);

  // Expand all/collapse all state
  const [allExpanded, setAllExpanded] = useState(false);

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
      if (!account) return;

      try {
        setDataLoading(true);

        // Fetch datasets from FWSS subgraph (has direct payer field + pieces with CIDs)
        // Automatically joins with Filecoin Pay rails via pdpRailId for cost data
        const displayData = await fetchFWSSDataSetsForPayer(address);
        setDataSetDisplay(displayData);

        // Extract all pieces for CID search
        const allPieces: PieceDisplayData[] = displayData.flatMap(ds => ds.pieces);
        setPieceData(allPieces);

        // Resolve provider ENS names
        const providerAddresses = [...new Set(displayData.map(ds => ds.providerAddress).filter(Boolean))];
        if (providerAddresses.length > 0) {
          const ensNames = await batchResolveENS(providerAddresses);
          setProviderEnsNames(ensNames);

          setDataSetDisplay(prev => prev.map(ds => ({
            ...ds,
            providerENS: ensNames.get(ds.providerAddress.toLowerCase()) || null,
          })));
        }

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

    // Search in pieceData by Piece CID (commP)
    const found = pieceData.find(
      (p) =>
        p.pieceCID.toLowerCase().includes(query) ||
        p.pieceCIDHex.toLowerCase().includes(query)
    );

    if (found) {
      setCidSearchResult(found);
      setMatchingDataSetId(found.dataSetId);
    } else {
      setMatchingDataSetId(null);
    }

    setCidSearching(false);
  }, [cidSearchQuery, pieceData]);

  // Calculate storage summary
  const storageSummary = useMemo(() => {
    // Derive storage summary from FWSS display data
    let totalStorageBytes = BigInt(0);
    let totalPieces = 0;
    for (const ds of dataSetDisplay) {
      totalStorageBytes += ds.totalSizeBytes;
      totalPieces += ds.pieceCount;
    }
    const totalStorageGB = Number(totalStorageBytes) / (1024 ** 3);
    return {
      totalStorageBytes,
      totalStorageFormatted: totalStorageGB >= 1024
        ? `${(totalStorageGB / 1024).toFixed(2)} TB`
        : totalStorageGB >= 1
        ? `${totalStorageGB.toFixed(2)} GB`
        : totalStorageGB > 0
        ? `${(totalStorageGB * 1024).toFixed(2)} MB`
        : '-',
      totalPieces,
      totalDataSets: dataSetDisplay.length,
      runwayDays: null as number | null,
    };
  }, [dataSetDisplay]);

  // Calculate DataSets summary with payment info
  const dataSetsSummary = useMemo(() => {
    return calculateDataSetsSummary(dataSetDisplay);
  }, [dataSetDisplay]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Payer Details</h1>
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="space-y-6">
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Payer Details</h1>
            {resolvingName && (
              <span className="text-sm text-gray-400 animate-pulse">· Resolving names…</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {ensName ? (
              <>
                <span className="text-blue-600 font-medium text-lg">{ensName}</span>
                <span className="text-gray-400 text-sm font-mono">({account.address})</span>
              </>
            ) : (
              <span className={`font-mono text-lg ${resolvingName ? "animate-pulse" : ""}`}>{account.address}</span>
            )}
          </div>
        </div>
        {account.payerRails.length > 0 && account.payerRails.some(r => r.stateCode === 0) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const activeRail = account.payerRails.find(r => r.stateCode === 0);
                if (activeRail) handleSettleClick(activeRail);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isConnected}
            >
              Settle
            </button>
            {!isConnected && (
              <span className="text-xs text-gray-500">
                (Connect wallet)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-4">
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
          <p className="text-sm text-gray-500 flex items-center gap-1">
            Total Settled
            <span
              className="text-gray-400 cursor-help"
              title="Total amount settled to service providers across all payment rails."
            >
              ⓘ
            </span>
          </p>
          <p className="text-2xl font-bold">{account.totalSettled}</p>
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
          <p className="text-sm text-gray-500 flex items-center gap-1">
            Bandwidth
            <span
              className="text-gray-400 cursor-help"
              title="Bandwidth tracking for data retrieval will be available in a future release."
            >
              ⓘ
            </span>
          </p>
          <p className="text-2xl font-bold text-gray-300">—</p>
          <p className="text-xs text-gray-400 mt-1">Coming Q2 2026</p>
        </div>
      </div>

      {/* My Data Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">My Data</h2>
            {dataSetsSummary.totalDataSets > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {dataSetsSummary.totalDataSets} DataSet{dataSetsSummary.totalDataSets !== 1 ? "s" : ""} · {dataSetsSummary.totalPieces.toLocaleString()} pieces · {dataSetsSummary.totalSizeFormatted} · ${dataSetsSummary.totalPaidUSDFC.toFixed(2)} total paid
              </p>
            )}
          </div>
          {dataSetDisplay.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAllExpanded(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setAllExpanded(false)}
                className="text-sm text-blue-600 hover:underline"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {/* CID Lookup */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Enter Piece CID to lookup..."
              value={cidSearchQuery}
              onChange={(e) => {
                setCidSearchQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setCidSearchResult(null);
                  setMatchingDataSetId(null);
                }
              }}
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
            Search by Piece CID (commP) across all DataSets
          </p>

          {/* Search Result */}
          {cidSearchResult && (
            <div className="mt-4 p-3 bg-white border rounded-md">
              <p className="text-sm font-medium text-green-600 mb-2">Found match in DataSet DS-{cidSearchResult.dataSetId.slice(-3).padStart(3, "0")}:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Piece CID:</span>{" "}
                  <span className="font-mono">{truncateCID(cidSearchResult.pieceCID)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Size:</span> {cidSearchResult.size}
                </div>
                <div>
                  <span className="text-gray-500">Cost/mo:</span>{" "}
                  <span className="font-medium">{cidSearchResult.costPerMonth !== null ? `$${cidSearchResult.costPerMonth.toFixed(4)}` : "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Provider:</span>{" "}
                  <span className="text-gray-400">{cidSearchResult.providerFormatted}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DataSet Cards */}
        {dataLoading ? (
          <div className="space-y-4">
            <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ) : dataSetDisplay.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-8 text-center text-gray-500">
            No data sets found for this payer
          </div>
        ) : (
          <div className="space-y-3">
            {dataSetDisplay.map((ds) => (
              <DataSetCard
                key={ds.setId}
                dataSet={ds}
                defaultExpanded={allExpanded}
                onSearchMatch={matchingDataSetId === ds.setId}
              />
            ))}
          </div>
        )}

        {/* Note about cost calculation */}
        <p className="text-xs text-gray-400">
          Per-piece costs are size-weighted from the rail payment rate. Total settled reflects on-chain settlement amounts.
        </p>
      </div>

      {/* Payment Rails grouped by Operator */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Payments by Operator</h2>
        <OperatorGroupedRails
          rails={account.payerRails}
          counterpartyEnsNames={counterpartyEnsNames}
          perspective="payer"
        />
      </div>

      {/* Incoming Rails grouped by Operator */}
      {account.payeeRails.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Incoming Payments by Operator</h2>
          <OperatorGroupedRails
            rails={account.payeeRails}
            counterpartyEnsNames={counterpartyEnsNames}
            perspective="payee"
          />
        </div>
      )}

      {/* Data source indicator */}
      <div className="text-xs text-gray-400 text-right">
        Data from Goldsky subgraph
      </div>

      {/* Settle Dialog */}
      {selectedRail && (
        <SettleRailDialog
          rail={selectedRail}
          open={settleDialogOpen}
          onOpenChange={setSettleDialogOpen}
        />
      )}
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
  const [sortField, setSortField] = useState<"settled" | "claimable" | "dataSize" | "locked" | "rails" | "runway" | "start">("settled");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pdpLoading, setPdpLoading] = useState(false);
  const [resolvingNames, setResolvingNames] = useState(false);
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

          // Merge enrichments while preserving any resolved ENS names
          // Note: We explicitly copy only PDP-specific fields to avoid overwriting ensName
          // because spreading the whole object might have ensName: undefined which would overwrite
          setPayers((currentPayers) =>
            currentPayers.map((payer, i) => {
              const pdpData = enrichedWithPDP[i];
              const settled7dData = enrichedWithSettled7d[i];
              return {
                ...payer,
                // Explicitly copy only PDP-specific fields
                totalDataSizeGB: pdpData.totalDataSizeGB,
                totalDataSizeFormatted: pdpData.totalDataSizeFormatted,
                proofStatus: pdpData.proofStatus,
                // Settled 7d data
                settled7d: settled7dData.settled7d,
                settled7dFormatted: settled7dData.settled7dFormatted,
              };
            })
          );
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

  // Resolve wallet names: known names sync, unknown via async ENS
  useEffect(() => {
    if (payers.length === 0) return;

    const needsAsync: string[] = [];
    const knownUpdates = new Map<string, string>();

    for (const payer of payers) {
      if (payer.ensName || !payer.fullAddress) continue;
      const known = getKnownWalletName(payer.fullAddress);
      if (known) {
        knownUpdates.set(payer.fullAddress.toLowerCase(), known);
      } else {
        needsAsync.push(payer.fullAddress);
      }
    }

    if (knownUpdates.size > 0) {
      setPayers((prev) =>
        prev.map((p) => {
          const name = knownUpdates.get(p.fullAddress?.toLowerCase());
          return name && !p.ensName ? { ...p, ensName: name } : p;
        })
      );
    }

    if (needsAsync.length === 0) return;

    setResolvingNames(true);
    batchResolveENS(needsAsync)
      .then((ensNames) => {
        setPayers((prev) =>
          prev.map((p) => {
            const name = ensNames.get(p.fullAddress?.toLowerCase());
            return name && !p.ensName ? { ...p, ensName: name } : p;
          })
        );
      })
      .catch((err) => console.error("Failed to resolve ENS names:", err))
      .finally(() => setResolvingNames(false));
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
      case "claimable":
        aVal = a.claimableRaw || 0;
        bVal = b.claimableRaw || 0;
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

  const handleSort = (field: "settled" | "claimable" | "dataSize" | "locked" | "rails" | "runway" | "start") => {
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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Payer Accounts</h1>
          {resolvingNames && (
            <span className="text-sm text-gray-400 animate-pulse">· Resolving names…</span>
          )}
        </div>
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

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
          {/* Chart 1: Total Unique Payers */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Total Unique Payers</h3>
            <p className="text-sm text-gray-500 mb-4">
              Cumulative count of unique payer wallets over time
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatChartDate}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [value ?? 0, "Total Payers"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="payers"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Total USDFC Settled */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Total USDFC Settled</h3>
            <p className="text-sm text-gray-500 mb-4">
              Cumulative settlement volume over time
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatChartDate}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatChartCurrency}
                  />
                  <Tooltip
                    formatter={(value) => [`$${(value as number)?.toFixed(2) ?? 0}`, "Total Settled"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="settled"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
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
                onClick={() => handleSort("claimable")}
                title="Σ(payout) - Funds accrued, not yet collected"
              >
                Claimable {sortField === "claimable" && (sortDirection === "desc" ? "↓" : "↑")}
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
                  <TableCell>{payer.claimable || "-"}</TableCell>
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
