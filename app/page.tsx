"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { TopPayersTable, mockPayers, Payer } from "@/components/dashboard/TopPayersTable";
import { DataSourcePanel } from "@/components/dashboard/DataSourcePanel";
import { fetchDashboardData, fetchChurnedWalletsCount } from "@/lib/graphql/fetchers";
import { batchResolveENS } from "@/lib/ens";
import { isGAMode, features } from "@/lib/config/mode";

// Dynamic import for charts - only loads recharts bundle when needed (prototype mode)
const DashboardCharts = dynamic(
  () => import("@/components/dashboard/DashboardCharts").then(mod => mod.DashboardCharts),
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

// Dynamic import for auction stats charts
const AuctionStatsCharts = dynamic(
  () => import("@/components/dashboard/AuctionStatsCharts").then(mod => mod.AuctionStatsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-100 rounded-lg h-80 animate-pulse" />
          <div className="bg-gray-100 rounded-lg h-80 animate-pulse" />
          <div className="bg-gray-100 rounded-lg h-80 animate-pulse" />
          <div className="bg-gray-100 rounded-lg h-80 animate-pulse" />
        </div>
      </div>
    ),
  }
);

interface DashboardData {
  globalMetrics: {
    uniquePayers: number;
    uniquePayees: number;
    totalTerminations: number;
    totalActiveRails: number;
  };
  totalSettled: {
    total: number;
    last30Days: number;
    totalFormatted: string;
    last30DaysFormatted: string;
  };
  topPayers: Payer[];
  runRate: {
    monthly: number;
    monthlyFormatted: string;
    annualized: number;
    annualizedFormatted: string;
    activeRailsCount: number;
  };
  // Total locked USDFC across all accounts
  totalLockedUSDFC: {
    total: number;
    formatted: string;
  };
  // Active Payers: at least one ACTIVE rail AND lockupRate > 0
  activePayers: number;
  // Churned wallets (GA mode): payers where ALL rails are TERMINATED
  churnedWallets: number;
  // Cumulative chart data
  cumulativePayers: number[];
  cumulativeSettled: number[];
  chartDates: string[];
}

// Hero Metric Card Component (no sparklines)
function HeroMetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="bg-white border rounded-lg p-6 flex-1">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hostname, setHostname] = useState("");

  // Filter payers by search and date range
  const filterPayers = (payers: Payer[]) => {
    return payers.filter(p => {
      // Search filter
      const matchesSearch =
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.ensName && p.ensName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Date filter using startTimestamp
      if (fromDate || toDate) {
        const payerStartTime = p.startTimestamp;

        if (fromDate) {
          const fromTime = new Date(fromDate).getTime();
          if (payerStartTime < fromTime) return false;
        }

        if (toDate) {
          // Add 1 day to toDate to include the entire day
          const toTime = new Date(toDate).getTime() + 24 * 60 * 60 * 1000;
          if (payerStartTime > toTime) return false;
        }
      }

      return true;
    });
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const dashboardData = await fetchDashboardData();

        // Fetch churned wallets count (used in GA mode instead of Settled 7d)
        const churnedWallets = isGAMode ? await fetchChurnedWalletsCount() : 0;

        setData({ ...dashboardData, churnedWallets });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load data from subgraph');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Set hostname on client side
  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  // Prepare chart data with cumulative values - MUST be before any early returns (Rules of Hooks)
  const chartData = useMemo(() => {
    if (!data) return [];
    const { chartDates, cumulativePayers, cumulativeSettled } = data;
    return chartDates.map((date, i) => ({
      date: date,
      payers: cumulativePayers[i],
      settled: cumulativeSettled[i],
    }));
  }, [data]);

  // Resolve ENS names after data loads
  useEffect(() => {
    if (!data || data.topPayers.length === 0) return;

    async function resolveNames() {
      const addresses = data!.topPayers
        .filter(p => p.fullAddress && !p.ensName)
        .map(p => p.fullAddress);

      if (addresses.length === 0) return;

      try {
        const ensNames = await batchResolveENS(addresses);

        // Update payers with resolved ENS names
        setData(prevData => {
          if (!prevData) return prevData;

          const updatedPayers = prevData.topPayers.map(payer => {
            const ensName = ensNames.get(payer.fullAddress?.toLowerCase());
            if (ensName && !payer.ensName) {
              return { ...payer, ensName };
            }
            return payer;
          });

          return { ...prevData, topPayers: updatedPayers };
        });
      } catch (err) {
        console.error('Failed to resolve ENS names:', err);
      }
    }

    resolveNames();
  }, [data?.topPayers.length]);

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Show error state with fallback to mock data
  if (error || !data) {
    return (
      <div className="space-y-6">
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Using mock data</p>
            <p className="text-sm">{error}. Displaying sample data instead.</p>
          </div>
        )}
        <div className="flex gap-6">
          <HeroMetricCard title="Active Payers" value="--" subtitle="At least 1 ACTIVE rail AND lockup rate > 0" />
          <HeroMetricCard title="Locked USDFC" value="--" subtitle="Total locked across all accounts" />
          <HeroMetricCard title="USDFC Settled" value="--" />
          <HeroMetricCard title="Churned Wallets" value="--" subtitle="All rails = TERMINATED" />
          <HeroMetricCard
            title="FIL Burned"
            value="--"
            subtitle="From USDFC/FIL settlements + auction (coming soon)"
          />
        </div>

        {/* Auction Stats Charts - Placeholder mockups (both modes) */}
        {features.showAuctionStats && <AuctionStatsCharts />}

        {/* Top Payers Section - Prototype mode only */}
        {features.showTop10Tables && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Top 10 Payers</h2>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="🔍 search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-md w-48"
                />
                <div className="flex items-center gap-2 text-sm">
                  <span>From Date:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2 py-1 border rounded-md text-sm"
                  />
                  <span>To Date:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-2 py-1 border rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
            <TopPayersTable payers={filterPayers(mockPayers)} />
          </div>
        )}

        {/* Data source indicator */}
        <DataSourcePanel hostname={hostname} />
      </div>
    );
  }

  // Render with real data
  const { totalSettled, topPayers, activePayers, churnedWallets, totalLockedUSDFC } = data;

  return (
    <div className="space-y-6">
      {/* Hero Metric Cards */}
      <div className="flex gap-6">
        <HeroMetricCard
          title="Active Payers"
          value={activePayers.toLocaleString()}
          subtitle="At least 1 ACTIVE rail AND lockup rate > 0"
        />
        <HeroMetricCard
          title="Locked USDFC"
          value={totalLockedUSDFC.formatted}
          subtitle="Total locked across all accounts"
        />
        <HeroMetricCard
          title="USDFC Settled"
          value={totalSettled.totalFormatted}
        />
        <HeroMetricCard
          title="Churned Wallets"
          value={churnedWallets.toLocaleString()}
          subtitle="All rails = TERMINATED"
        />
        <HeroMetricCard
          title="FIL Burned"
          value="--"
          subtitle="From USDFC/FIL settlements + auction (coming soon)"
        />
      </div>

      {/* Auction Stats Charts - Placeholder mockups (both modes) */}
      {features.showAuctionStats && <AuctionStatsCharts />}

      {/* Cumulative Line Charts - Prototype mode only, dynamically loaded */}
      {features.showCharts && chartData.length > 0 && (
        <DashboardCharts chartData={chartData} />
      )}

      {/* Top Payers Section - Prototype mode only */}
      {features.showTop10Tables && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top 10 Payers</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="🔍 search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-md w-48"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>From Date:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2 py-1 border rounded-md text-sm"
                />
                <span>To Date:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2 py-1 border rounded-md text-sm"
                />
              </div>
            </div>
          </div>
          <TopPayersTable payers={filterPayers(topPayers.length > 0 ? topPayers : mockPayers)} />
        </div>
      )}

      {/* Data source indicator */}
      <DataSourcePanel hostname={hostname} />
    </div>
  );
}
