"use client";

import { useEffect, useState } from "react";
import { Payer } from "@/components/dashboard/TopPayersTable";
import { fetchAllPayers } from "@/lib/graphql/fetchers";
import { batchResolveENS } from "@/lib/ens";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PayerAccountsPage() {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"settled" | "locked" | "start">("settled");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchAllPayers();
        setPayers(data);
        setError(null);
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
        aVal = parseFloat(a.settled.replace(/[$,K]/g, "")) || 0;
        bVal = parseFloat(b.settled.replace(/[$,K]/g, "")) || 0;
        break;
      case "locked":
        aVal = parseFloat(a.locked.replace(/[$,K]/g, "")) || 0;
        bVal = parseFloat(b.locked.replace(/[$,K]/g, "")) || 0;
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

  const handleSort = (field: "settled" | "locked" | "start") => {
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payer Accounts</h1>
        <p className="text-sm text-gray-500">{payers.length} total payers</p>
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
          Showing {sortedPayers.length} of {payers.length} payers
        </span>
      </div>

      {/* Payers Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-medium">Address</TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("locked")}
              >
                Locked {sortField === "locked" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("settled")}
              >
                Settled {sortField === "settled" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead className="font-medium">Runway</TableHead>
              <TableHead
                className="font-medium cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("start")}
              >
                Start {sortField === "start" && (sortDirection === "desc" ? "↓" : "↑")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No payers found
                </TableCell>
              </TableRow>
            ) : (
              sortedPayers.map((payer, index) => (
                <TableRow
                  key={payer.fullAddress || index}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <TableCell>
                    {payer.ensName ? (
                      <span className="text-blue-600 font-medium">{payer.ensName}</span>
                    ) : (
                      <span className="font-mono text-sm">{payer.address}</span>
                    )}
                  </TableCell>
                  <TableCell>{payer.locked}</TableCell>
                  <TableCell>{payer.settled}</TableCell>
                  <TableCell>{payer.runway}</TableCell>
                  <TableCell>{payer.start}</TableCell>
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
