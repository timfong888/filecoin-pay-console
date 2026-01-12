"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PayeeDisplay, fetchAllPayees, fetchAccountDetail, AccountDetail, formatDataSize } from "@/lib/graphql/fetchers";
import { batchResolveENS, resolveENS } from "@/lib/ens";
import {
  FILECOIN_PAY_CONTRACT,
  GOLDSKY_ENDPOINT,
  SUBGRAPH_VERSION,
  NETWORK,
} from "@/lib/graphql/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Hero Metric Card Component - Purple theme
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
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 flex-1">
      <p className="text-sm text-purple-600 font-medium">{title}</p>
      <p className="text-3xl font-bold text-purple-900 mt-1">{value}</p>
      {subtitle && <p className="text-sm text-purple-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Payee Detail View Component
function PayeeDetailView({ address }: { address: string }) {
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/payee-accounts" className="text-purple-600 hover:underline">
            ← Back to Payees
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-purple-900">Payee Details</h1>
        <div className="h-96 bg-purple-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/payee-accounts" className="text-purple-600 hover:underline">
            ← Back to Payees
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-purple-900">Payee Details</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error || "Account not found"}</p>
          <p className="text-xs mt-2 font-mono">{address}</p>
        </div>
      </div>
    );
  }

  // Calculate totals from payee rails
  // Use netPayeeAmountRaw for accurate payee received amounts (net after fees)
  let totalReceived = 0;
  let totalGrossSettled = 0;
  let totalPaymentRate = 0;
  let activeRailsCount = 0;
  const uniquePayers = new Set<string>();
  for (const rail of account.payeeRails) {
    totalReceived += rail.netPayeeAmountRaw;
    totalGrossSettled += rail.settledRaw;
    if (rail.counterpartyAddress) {
      uniquePayers.add(rail.counterpartyAddress.toLowerCase());
    }
    // Sum payment rates from active rails for run rate
    if (rail.stateCode === 0 && rail.rateRaw > 0) {
      totalPaymentRate += rail.rateRaw;
      activeRailsCount++;
    }
  }

  // Calculate monthly run rate: rate/epoch × epochs/day × 30 days
  // Rate is per epoch (30 seconds), so multiply by 2880 epochs/day × 30 days
  const SECONDS_PER_MONTH = 30 * 24 * 60 * 60; // 2,592,000
  const EPOCH_DURATION = 30; // seconds
  const monthlyRunRate = totalPaymentRate * (SECONDS_PER_MONTH / EPOCH_DURATION);
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Link href="/payee-accounts" className="text-purple-600 hover:underline">
          ← Back to Payees
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">Payee Details</h1>
          <div className="flex items-center gap-2 mt-1">
            {ensName ? (
              <>
                <span className="text-purple-600 font-medium text-lg">{ensName}</span>
                <span className="text-gray-400 text-sm font-mono">({account.address})</span>
              </>
            ) : (
              <span className="font-mono text-lg">{account.address}</span>
            )}
          </div>
        </div>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors">
          Settle Now
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600">Claimable Now</p>
          <p className="text-2xl font-bold text-purple-900">{account.totalPayout}</p>
          <p className="text-xs text-purple-500 mt-1">From UserToken.payout</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600">Total Received (Net)</p>
          <p className="text-2xl font-bold text-purple-900">${totalReceived.toLocaleString()}</p>
          <p className="text-xs text-purple-500 mt-1">After fees from all rails</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600">Unique Payers</p>
          <p className="text-2xl font-bold text-purple-900">{uniquePayers.size}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600">Monthly Run Rate</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(monthlyRunRate)}</p>
          <p className="text-xs text-purple-500 mt-1">
            From {activeRailsCount} active rail{activeRailsCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Incoming Rails */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-purple-900">Incoming Rails</h2>
        {account.payeeRails.length === 0 ? (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center text-purple-600">
            No incoming rails found
          </div>
        ) : (
          <div className="rounded-md border border-purple-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-purple-50">
                  <TableHead className="font-medium text-purple-800">Payer</TableHead>
                  <TableHead className="font-medium text-purple-800">Received (Net)</TableHead>
                  <TableHead className="font-medium text-purple-800">Status</TableHead>
                  <TableHead className="font-medium text-purple-800">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.payeeRails.map((rail, index) => (
                  <TableRow
                    key={rail.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-purple-50/50"}
                  >
                    <TableCell>
                      <Link
                        href={`/payer-accounts?address=${rail.counterpartyAddress}`}
                        className="font-mono text-sm text-purple-600 hover:underline"
                      >
                        {rail.counterpartyFormatted}
                      </Link>
                    </TableCell>
                    <TableCell>{rail.netPayeeAmount}</TableCell>
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

      {/* Data source indicator */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 text-sm">
        <div className="font-medium text-purple-700">Data Source</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-purple-600">
          <div>Network:</div>
          <div className="font-mono">{NETWORK}</div>
          <div>Contract:</div>
          <div className="font-mono text-xs">
            <a
              href={`https://filfox.info/en/address/${FILECOIN_PAY_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
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

// List View Component
function PayeeListView() {
  const [payees, setPayees] = useState<PayeeDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"received" | "payers" | "start" | "dataSize">("received");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchAllPayees();
        setPayees(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch payees:", err);
        setError("Failed to load payees from subgraph");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Resolve ENS names after data loads
  useEffect(() => {
    if (payees.length === 0) return;

    async function resolveNames() {
      const addresses = payees
        .filter((p) => p.fullAddress && !p.ensName)
        .map((p) => p.fullAddress);

      if (addresses.length === 0) return;

      try {
        const ensNames = await batchResolveENS(addresses);

        setPayees((prevPayees) =>
          prevPayees.map((payee) => {
            const ensName = ensNames.get(payee.fullAddress?.toLowerCase());
            if (ensName && !payee.ensName) {
              return { ...payee, ensName };
            }
            return payee;
          })
        );
      } catch (err) {
        console.error("Failed to resolve ENS names:", err);
      }
    }

    resolveNames();
  }, [payees.length]);

  // Calculate hero metrics
  const uniquePayeesCount = payees.length;
  const totalReceived = payees.reduce((sum, p) => {
    const val = parseFloat(p.received.replace(/[$,KM]/g, "")) || 0;
    const multiplier = p.received.includes("M") ? 1000000 : p.received.includes("K") ? 1000 : 1;
    return sum + val * multiplier;
  }, 0);

  // Calculate total data stored from PDP data
  const totalDataStoredGB = payees.reduce((sum, p) => sum + (p.pdp?.datasetSizeGB || 0), 0);
  const storageProviderCount = payees.filter(p => p.isStorageProvider).length;

  // Filter payees by search
  const filteredPayees = payees.filter((p) => {
    const matchesSearch =
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fullAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.ensName && p.ensName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Sort payees
  const sortedPayees = [...filteredPayees].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortField) {
      case "received":
        aVal = parseFloat(a.received.replace(/[$,KM]/g, "")) || 0;
        bVal = parseFloat(b.received.replace(/[$,KM]/g, "")) || 0;
        break;
      case "payers":
        aVal = a.payers;
        bVal = b.payers;
        break;
      case "start":
        aVal = a.startTimestamp;
        bVal = b.startTimestamp;
        break;
      case "dataSize":
        aVal = a.pdp?.datasetSizeGB || 0;
        bVal = b.pdp?.datasetSizeGB || 0;
        break;
      default:
        return 0;
    }

    return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
  });

  // Pagination
  const totalPages = Math.ceil(sortedPayees.length / itemsPerPage);
  const paginatedPayees = sortedPayees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: "received" | "payers" | "start" | "dataSize") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-purple-900">Payee Accounts</h1>
        <div className="h-96 bg-purple-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-purple-900">Payee Accounts</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>

        {/* Default Hero Metrics (placeholder for error state) */}
        <div className="flex gap-6">
          <HeroMetricCard
            title="Total Received (Net)"
            value="--"
            subtitle="Sum of payeeRails.totalNetPayeeAmount"
          />
          <HeroMetricCard
            title="Unique Payees"
            value="--"
            subtitle="Storage providers"
          />
          <HeroMetricCard
            title="Total Data Stored"
            value="--"
            subtitle="From PDP Explorer"
          />
        </div>

        {/* Data source indicator */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 text-sm">
          <div className="font-medium text-purple-700">Data Source</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-purple-600">
            <div>Network:</div>
            <div className="font-mono">{NETWORK}</div>
            <div>Contract:</div>
            <div className="font-mono text-xs">
              <a
                href={`https://filfox.info/en/address/${FILECOIN_PAY_CONTRACT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
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

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-purple-900">Payee Accounts</h1>
      </div>

      {/* Hero Metrics */}
      <div className="flex gap-6">
        <HeroMetricCard
          title="Total Received (Net)"
          value={formatCurrency(totalReceived)}
          subtitle="Sum of payeeRails.totalNetPayeeAmount"
        />
        <HeroMetricCard
          title="Unique Payees"
          value={uniquePayeesCount.toLocaleString()}
          subtitle="Storage providers"
        />
        <HeroMetricCard
          title="Total Data Stored"
          value={formatDataSize(totalDataStoredGB)}
          subtitle={`From ${storageProviderCount} storage providers`}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by address or ENS name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-purple-200 rounded-md w-96 focus:border-purple-400 focus:ring-purple-400"
        />
        <span className="text-sm text-purple-600">
          Showing {paginatedPayees.length} of {sortedPayees.length} payees
        </span>
      </div>

      {/* Payees Table */}
      <div className="rounded-md border border-purple-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-purple-50">
              <TableHead className="font-medium text-purple-800">Address</TableHead>
              <TableHead
                className="font-medium text-purple-800 cursor-pointer hover:bg-purple-100"
                onClick={() => handleSort("received")}
              >
                Total Received (Net) {sortField === "received" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium text-purple-800 cursor-pointer hover:bg-purple-100"
                onClick={() => handleSort("dataSize")}
              >
                Data Stored {sortField === "dataSize" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium text-purple-800 cursor-pointer hover:bg-purple-100"
                onClick={() => handleSort("payers")}
              >
                Unique Payers {sortField === "payers" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium text-purple-800 cursor-pointer hover:bg-purple-100"
                onClick={() => handleSort("start")}
              >
                Started {sortField === "start" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPayees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-purple-500">
                  No payees found
                </TableCell>
              </TableRow>
            ) : (
              paginatedPayees.map((payee, index) => (
                <TableRow
                  key={payee.fullAddress || index}
                  className={index % 2 === 0 ? "bg-white" : "bg-purple-50/50"}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/payee-accounts?address=${payee.fullAddress}`}
                        className="hover:underline"
                      >
                        {payee.ensName ? (
                          <span className="text-purple-600 font-medium">{payee.ensName}</span>
                        ) : (
                          <span className="font-mono text-sm text-purple-600">{payee.address}</span>
                        )}
                      </Link>
                      {payee.isStorageProvider && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          SP
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{payee.received}</TableCell>
                  <TableCell>{payee.dataSize}</TableCell>
                  <TableCell>{payee.payers}</TableCell>
                  <TableCell>{payee.start}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-purple-600">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-purple-200 rounded-md text-sm text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50"
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
                      ? "bg-purple-600 text-white border-purple-600"
                      : "border-purple-200 text-purple-600 hover:bg-purple-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-purple-200 rounded-md text-sm text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Data source indicator */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 text-sm">
        <div className="font-medium text-purple-700">Data Sources</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-purple-600">
          <div>Network:</div>
          <div className="font-mono">{NETWORK}</div>
          <div>Contract:</div>
          <div className="font-mono text-xs">
            <a
              href={`https://filfox.info/en/address/${FILECOIN_PAY_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
            >
              {FILECOIN_PAY_CONTRACT}
            </a>
          </div>
          <div>Filecoin Pay Subgraph:</div>
          <div className="font-mono">{SUBGRAPH_VERSION}</div>
          <div>PDP Explorer:</div>
          <div className="font-mono text-xs">
            <a
              href="https://pdp.vxb.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
            >
              pdp-explorer/mainnet311
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inner component that uses useSearchParams
function PayeeAccountsContent() {
  const searchParams = useSearchParams();
  const address = searchParams.get("address");

  if (address) {
    return <PayeeDetailView address={address} />;
  }

  return <PayeeListView />;
}

// Main Page Component - wrapped in Suspense for useSearchParams
export default function PayeeAccountsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-purple-900">Loading...</h1>
        <div className="h-96 bg-purple-100 rounded-lg animate-pulse" />
      </div>
    }>
      <PayeeAccountsContent />
    </Suspense>
  );
}
