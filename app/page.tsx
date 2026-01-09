"use client";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { TopPayersTable, mockPayers } from "@/components/dashboard/TopPayersTable";

// Mock sparkline data
const uniquePayersSparkline = [85, 90, 88, 95, 100, 105, 120];
const settledSparkline = [15, 22, 18, 35, 28, 42, 50];
const terminationsSparkline = [5, 8, 3, 10, 6, 12, 19];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Unique Payers"
          value="120"
          sparklineData={uniquePayersSparkline}
        />
        <MetricCard
          title="USDFC Settled"
          value="$50.23"
          subtitle="Total"
          secondaryValue="$20.19"
          secondaryLabel="Last 30D"
          sparklineData={settledSparkline}
        />
        <MetricCard
          title="Wallet Terminations"
          value="19"
          sparklineData={terminationsSparkline}
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
                className="px-3 py-1.5 text-sm border rounded-md w-48"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>From Date:</span>
              <input type="date" className="px-2 py-1 border rounded-md text-sm" />
              <span>To Date:</span>
              <input type="date" className="px-2 py-1 border rounded-md text-sm" />
            </div>
          </div>
        </div>
        <TopPayersTable payers={mockPayers} />
      </div>
    </div>
  );
}
