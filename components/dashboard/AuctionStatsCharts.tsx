"use client";

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
  Legend,
} from "recharts";

// Mock data for placeholder charts - will be replaced with real auction data
const mockBiddersData = [
  { date: "Jan 13", bidders: 3 },
  { date: "Jan 14", bidders: 5 },
  { date: "Jan 15", bidders: 4 },
  { date: "Jan 16", bidders: 7 },
  { date: "Jan 17", bidders: 6 },
  { date: "Jan 18", bidders: 8 },
  { date: "Jan 19", bidders: 10 },
];

const mockPriceData = [
  { date: "Jan 13", auctionPrice: 0.85, targetPrice: 0.90 },
  { date: "Jan 14", auctionPrice: 0.87, targetPrice: 0.90 },
  { date: "Jan 15", auctionPrice: 0.89, targetPrice: 0.90 },
  { date: "Jan 16", auctionPrice: 0.88, targetPrice: 0.90 },
  { date: "Jan 17", auctionPrice: 0.91, targetPrice: 0.90 },
  { date: "Jan 18", auctionPrice: 0.90, targetPrice: 0.90 },
  { date: "Jan 19", auctionPrice: 0.92, targetPrice: 0.90 },
];

const mockPiecesSettledData = [
  { date: "Jan 13", pieces: 12 },
  { date: "Jan 14", pieces: 18 },
  { date: "Jan 15", pieces: 15 },
  { date: "Jan 16", pieces: 22 },
  { date: "Jan 17", pieces: 28 },
  { date: "Jan 18", pieces: 35 },
  { date: "Jan 19", pieces: 42 },
];

const mockDurationData = [
  { date: "Jan 13", avgDurationHours: 24 },
  { date: "Jan 14", avgDurationHours: 22 },
  { date: "Jan 15", avgDurationHours: 26 },
  { date: "Jan 16", avgDurationHours: 20 },
  { date: "Jan 17", avgDurationHours: 18 },
  { date: "Jan 18", avgDurationHours: 16 },
  { date: "Jan 19", avgDurationHours: 15 },
];

// Placeholder badge component
function PlaceholderBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
      Mock Data
    </span>
  );
}

export function AuctionStatsCharts() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Auction Stats</h2>
        <PlaceholderBadge />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Chart 1: Number of Bidders */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Number of Bidders</h3>
          <p className="text-sm text-gray-500 mb-4">
            Daily count of unique bidders participating in auctions
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockBiddersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [value, "Bidders"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="bidders" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Auction Price vs Target Price */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Auction Price vs Target Price</h3>
          <p className="text-sm text-gray-500 mb-4">
            Comparison of actual auction prices against target prices (FIL/TiB)
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockPriceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  domain={[0.8, 1.0]}
                />
                <Tooltip
                  formatter={(value) => [`$${(value as number)?.toFixed(2) ?? '0.00'}`, ""]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="auctionPrice"
                  name="Auction Price"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="targetPrice"
                  name="Target Price"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Number of Pieces Settled */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Number of Pieces Settled</h3>
          <p className="text-sm text-gray-500 mb-4">
            Cumulative count of data pieces settled through auctions
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockPiecesSettledData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [value, "Pieces"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="pieces"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  fill="#3b82f6"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Duration from Published to Settlement */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Duration: Published to Settlement</h3>
          <p className="text-sm text-gray-500 mb-4">
            Average time (hours) from piece publication to settlement
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockDurationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}h`}
                />
                <Tooltip
                  formatter={(value) => [`${value} hours`, "Avg Duration"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="avgDurationHours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
