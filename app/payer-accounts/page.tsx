"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
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
} from "@/lib/graphql/fetchers";
import {
  FILECOIN_PAY_CONTRACT,
  GOLDSKY_ENDPOINT,
  SUBGRAPH_VERSION,
  NETWORK,
} from "@/lib/graphql/client";
import { batchResolveENS, resolveENS } from "@/lib/ens";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  payersWoWChange: string;
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
  wowChange,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  wowChange?: string;
}) {
  const isPositiveChange = wowChange && parseFloat(wowChange) >= 0;

  return (
    <div className="bg-white border rounded-lg p-6 flex-1">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <div className="flex items-baseline gap-3 mt-1">
        <p className="text-3xl font-bold">{value}</p>
        {wowChange && (
          <span
            className={`text-sm font-medium ${
              isPositiveChange ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositiveChange ? "+" : ""}
            {wowChange}% WoW
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
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Funds</p>
          <p className="text-2xl font-bold">{account.totalFunds}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Locked</p>
          <p className="text-2xl font-bold">{account.totalLocked}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Settled</p>
          <p className="text-2xl font-bold">{account.totalSettled}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Payment Rails</p>
          <p className="text-2xl font-bold">{account.payerRails.length}</p>
        </div>
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
            wowChange={metrics.payersWoWChange}
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
                    tickFormatter={(value) => {
                      if (!value) return "";
                      const date = new Date(value);
                      if (isNaN(date.getTime())) return "";
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
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
                    tickFormatter={(value) => {
                      if (!value) return "";
                      const date = new Date(value);
                      if (isNaN(date.getTime())) return "";
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}`}
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
