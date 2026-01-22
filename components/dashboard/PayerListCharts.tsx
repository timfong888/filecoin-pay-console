"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatChartDate, formatChartCurrency } from "@/lib/graphql/fetchers";

interface ChartDataPoint {
  date: string;
  payers: number;
  settled: number;
}

interface PayerListChartsProps {
  chartData: ChartDataPoint[];
}

export function PayerListCharts({ chartData }: PayerListChartsProps) {
  if (chartData.length === 0) {
    return null;
  }

  return (
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
  );
}
