"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TopPayersTable, mockPayers } from "@/components/dashboard/TopPayersTable";
import { fetchDashboardData } from "@/lib/graphql/fetchers";

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
  topPayers: Array<{
    address: string;
    ensName?: string;
    locked: string;
    settled: string;
    runway: string;
    start: string;
  }>;
  dailyMetrics: {
    uniquePayers: number[];
    terminations: number[];
    activeRails: number[];
    dates: string[];
  };
}

// Parse "Nov 15 '24" or "Dec 1 '24" format to Date
function parseStartDate(dateStr: string): Date | null {
  const months: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  const match = dateStr.match(/^([A-Za-z]+)\s+(\d+)\s+'(\d+)$/);
  if (!match) return null;

  const [, monthStr, day, year] = match;
  const month = months[monthStr];
  if (month === undefined) return null;

  const fullYear = 2000 + parseInt(year);
  return new Date(fullYear, month, parseInt(day));
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Filter payers by search and date range
  const filterPayers = (payers: typeof mockPayers) => {
    return payers.filter(p => {
      // Search filter
      const matchesSearch =
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.ensName && p.ensName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Date filter
      if (fromDate || toDate) {
        const startDate = parseStartDate(p.start);
        if (!startDate) return true; // Can't parse, include it

        if (fromDate) {
          const from = new Date(fromDate);
          if (startDate < from) return false;
        }

        if (toDate) {
          const to = new Date(toDate);
          if (startDate > to) return false;
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
        setData(dashboardData);
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

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Unique Payers"
            value="120"
            sparklineData={[85, 90, 88, 95, 100, 105, 120]}
          />
          <MetricCard
            title="USDFC Settled"
            value="$50.23"
            subtitle="Total"
            secondaryValue="$20.19"
            secondaryLabel="Last 30D"
            sparklineData={[15, 22, 18, 35, 28, 42, 50]}
          />
          <MetricCard
            title="Wallet Terminations"
            value="19"
            sparklineData={[5, 8, 3, 10, 6, 12, 19]}
          />
        </div>
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
      </div>
    );
  }

  // Render with real data
  const { globalMetrics, totalSettled, topPayers, dailyMetrics } = data;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Unique Payers"
          value={globalMetrics.uniquePayers.toString()}
          sparklineData={dailyMetrics.uniquePayers.length > 0 ? dailyMetrics.uniquePayers : undefined}
        />
        <MetricCard
          title="USDFC Settled"
          value={totalSettled.totalFormatted}
          subtitle="Total"
          secondaryValue={totalSettled.last30DaysFormatted}
          secondaryLabel="Last 30D"
          sparklineData={dailyMetrics.activeRails.length > 0 ? dailyMetrics.activeRails : undefined}
        />
        <MetricCard
          title="Wallet Terminations"
          value={globalMetrics.totalTerminations.toString()}
          sparklineData={dailyMetrics.terminations.length > 0 ? dailyMetrics.terminations : undefined}
        />
      </div>

      {/* Top Payers Section */}
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

      {/* Data source indicator */}
      <div className="text-xs text-gray-400 text-right">
        Data from Goldsky subgraph • Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}
