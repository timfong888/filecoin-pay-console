"use client";

import { useEffect, useState } from "react";
import { PayeeDisplay, fetchAllPayees } from "@/lib/graphql/fetchers";
import { batchResolveENS } from "@/lib/ens";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PayeeAccountsPage() {
  const [payees, setPayees] = useState<PayeeDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"received" | "payers" | "start">("received");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
      default:
        return 0;
    }

    return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (field: "received" | "payers" | "start") => {
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
        <h1 className="text-2xl font-bold">Payee Accounts</h1>
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Payee Accounts</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payee Accounts</h1>
        <p className="text-sm text-gray-500">{payees.length} total payees</p>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by address or ENS name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-md w-96"
        />
        <span className="text-sm text-gray-500">
          Showing {sortedPayees.length} of {payees.length} payees
        </span>
      </div>

      {/* Payees Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-medium">Address</TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("received")}
              >
                Received {sortField === "received" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("payers")}
              >
                Payers {sortField === "payers" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("start")}
              >
                First Payment {sortField === "start" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No payees found
                </TableCell>
              </TableRow>
            ) : (
              sortedPayees.map((payee, index) => (
                <TableRow
                  key={payee.fullAddress || index}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <TableCell>
                    {payee.ensName ? (
                      <span className="text-blue-600 font-medium">{payee.ensName}</span>
                    ) : (
                      <span className="font-mono text-sm">{payee.address}</span>
                    )}
                  </TableCell>
                  <TableCell>{payee.received}</TableCell>
                  <TableCell>{payee.payers}</TableCell>
                  <TableCell>{payee.start}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Data source indicator */}
      <div className="text-xs text-gray-400 text-right">
        Data from Goldsky subgraph
      </div>
    </div>
  );
}
