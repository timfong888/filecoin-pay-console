"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TopPayersTable, mockPayers, Payer } from "@/components/dashboard/TopPayersTable";
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
  topPayers: Payer[];
  dailyMetrics: {
    uniquePayers: number[];
    terminations: number[];
    activeRails: number[];
    dates: string[];
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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
