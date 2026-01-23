"use client";

// Placeholder badge component
function PlaceholderBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
      Mock Data
    </span>
  );
}

// Auction stat metric card matching the mockup design
function AuctionMetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="bg-white border rounded-lg p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
      <p className="text-xs text-gray-500 mt-auto">{description}</p>
    </div>
  );
}

export function AuctionStatsCharts() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Auction Stats</h2>
        <PlaceholderBadge />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <AuctionMetricCard
          title="Current Auction Price"
          value="--"
          description="The most recent highest bid that participants are competing against in the auction"
        />
        <AuctionMetricCard
          title="Available Quantity (USDFC)"
          value="--"
          description="The amount of USDFC currently available for bidding"
        />
        <AuctionMetricCard
          title="Total Auction Volume"
          value="--"
          description="The cumulative amount of USDFC bid so far in the auction"
        />
        <AuctionMetricCard
          title="Total Auction Participants"
          value="--"
          description="Number of unique participants in the auction"
        />
      </div>
    </div>
  );
}
