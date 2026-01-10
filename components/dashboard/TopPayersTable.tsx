"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Payer {
  address: string;
  fullAddress: string; // Full address for ENS resolution
  ensName?: string;
  locked: string;
  lockedRaw?: number;
  settled: string;
  settledRaw?: number;
  runway: string;
  runwayDays?: number;
  start: string;
  startTimestamp: number; // Unix timestamp in ms for filtering
}

interface TopPayersTableProps {
  payers: Payer[];
}

// Mock data for initial development
export const mockPayers: Payer[] = [
  { address: "0x1a2b...3c4d", fullAddress: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t", ensName: "myapp.filpay.eth", locked: "$12,450", lockedRaw: 12450, settled: "$45,200", settledRaw: 45200, runway: "45 days", runwayDays: 45, start: "Nov 15 '24", startTimestamp: new Date('2024-11-15').getTime() },
  { address: "0x2b3c...4d5e", fullAddress: "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u", locked: "$8,200", lockedRaw: 8200, settled: "$23,100", settledRaw: 23100, runway: "23 days", runwayDays: 23, start: "Nov 20 '24", startTimestamp: new Date('2024-11-20').getTime() },
  { address: "0x3c4d...5e6f", fullAddress: "0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v", ensName: "demo.filpay.eth", locked: "$0", lockedRaw: 0, settled: "$5,600", settledRaw: 5600, runway: "-", runwayDays: -1, start: "Oct 1 '24", startTimestamp: new Date('2024-10-01').getTime() },
  { address: "0x4d5e...6f7g", fullAddress: "0x4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w", locked: "$45,000", lockedRaw: 45000, settled: "$120,000", settledRaw: 120000, runway: "180 days", runwayDays: 180, start: "Dec 1 '24", startTimestamp: new Date('2024-12-01').getTime() },
  { address: "0x5e6f...7g8h", fullAddress: "0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x", ensName: "test.filpay.eth", locked: "$500", lockedRaw: 500, settled: "$1,200", settledRaw: 1200, runway: "7 days", runwayDays: 7, start: "Dec 5 '24", startTimestamp: new Date('2024-12-05').getTime() },
  { address: "0x6f7g...8h9i", fullAddress: "0x6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y", locked: "$3,200", lockedRaw: 3200, settled: "$8,900", settledRaw: 8900, runway: "15 days", runwayDays: 15, start: "Dec 8 '24", startTimestamp: new Date('2024-12-08').getTime() },
  { address: "0x7g8h...9i0j", fullAddress: "0x7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z", ensName: "prod.filpay.eth", locked: "$25,000", lockedRaw: 25000, settled: "$78,500", settledRaw: 78500, runway: "90 days", runwayDays: 90, start: "Oct 15 '24", startTimestamp: new Date('2024-10-15').getTime() },
  { address: "0x8h9i...0j1k", fullAddress: "0x8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a", locked: "$1,800", lockedRaw: 1800, settled: "$4,200", settledRaw: 4200, runway: "12 days", runwayDays: 12, start: "Dec 10 '24", startTimestamp: new Date('2024-12-10').getTime() },
  { address: "0x9i0j...1k2l", fullAddress: "0x9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b", locked: "$6,500", lockedRaw: 6500, settled: "$19,300", settledRaw: 19300, runway: "28 days", runwayDays: 28, start: "Nov 28 '24", startTimestamp: new Date('2024-11-28').getTime() },
  { address: "0x0j1k...2l3m", fullAddress: "0x0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c", ensName: "app.filpay.eth", locked: "$15,000", lockedRaw: 15000, settled: "$52,000", settledRaw: 52000, runway: "60 days", runwayDays: 60, start: "Nov 1 '24", startTimestamp: new Date('2024-11-01').getTime() },
];

// Parse currency string to number for sorting
function parseCurrency(value: string): number {
  const cleaned = value.replace(/[$,KM]/g, "");
  const num = parseFloat(cleaned) || 0;
  if (value.includes("M")) return num * 1000000;
  if (value.includes("K")) return num * 1000;
  return num;
}

// Parse runway string to days for sorting
function parseRunway(value: string): number {
  if (value === "-" || value === "< 1 day") return -1;
  const match = value.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    if (value.includes("y")) return num * 365;
    return num;
  }
  return -1;
}

type SortField = "locked" | "settled" | "runway" | "start";

export function TopPayersTable({ payers }: TopPayersTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedPayers = [...payers].sort((a, b) => {
    if (!sortField) return 0;

    let aVal: number, bVal: number;

    switch (sortField) {
      case "locked":
        aVal = a.lockedRaw ?? parseCurrency(a.locked);
        bVal = b.lockedRaw ?? parseCurrency(b.locked);
        break;
      case "settled":
        aVal = a.settledRaw ?? parseCurrency(a.settled);
        bVal = b.settledRaw ?? parseCurrency(b.settled);
        break;
      case "runway":
        aVal = a.runwayDays ?? parseRunway(a.runway);
        bVal = b.runwayDays ?? parseRunway(b.runway);
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

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDirection === "desc" ? " ↓" : " ↑";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-medium">Address</TableHead>
            <TableHead
              className="font-medium cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("locked")}
            >
              Locked{getSortIndicator("locked")}
            </TableHead>
            <TableHead
              className="font-medium cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("settled")}
            >
              Settled{getSortIndicator("settled")}
            </TableHead>
            <TableHead
              className="font-medium cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("runway")}
            >
              Runway{getSortIndicator("runway")}
            </TableHead>
            <TableHead
              className="font-medium cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("start")}
            >
              Start{getSortIndicator("start")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPayers.map((payer, index) => (
            <TableRow key={payer.fullAddress || index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <TableCell>
                <Link
                  href={`/payer-accounts?address=${payer.fullAddress}`}
                  className="hover:underline"
                >
                  {payer.ensName ? (
                    <span className="text-blue-600 font-medium">{payer.ensName}</span>
                  ) : (
                    <span className="font-mono text-sm text-blue-600">{payer.address}</span>
                  )}
                </Link>
              </TableCell>
              <TableCell>{payer.locked}</TableCell>
              <TableCell>{payer.settled}</TableCell>
              <TableCell>{payer.runway}</TableCell>
              <TableCell>{payer.start}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
