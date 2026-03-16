"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OperatorDisplay } from "@/lib/graphql/fetchers/operators";

interface OperatorBreakdownTableProps {
  operators: OperatorDisplay[];
}

type SortField = "activeRails" | "totalRails" | "uniquePayers" | "settledUSDFC" | "settledFIL";

export function OperatorBreakdownTable({ operators }: OperatorBreakdownTableProps) {
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

  const sortedOperators = [...operators].sort((a, b) => {
    if (!sortField) return 0;

    let aVal: number, bVal: number;

    switch (sortField) {
      case "activeRails":
        aVal = a.activeRails;
        bVal = b.activeRails;
        break;
      case "totalRails":
        aVal = a.totalRails;
        bVal = b.totalRails;
        break;
      case "uniquePayers":
        aVal = a.uniquePayers;
        bVal = b.uniquePayers;
        break;
      case "settledUSDFC":
        aVal = a.settledUSDFCRaw;
        bVal = b.settledUSDFCRaw;
        break;
      case "settledFIL":
        aVal = a.settledFILRaw;
        bVal = b.settledFILRaw;
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
            <TableHead className="font-medium">Operator</TableHead>
            <TableHead
              className="font-medium cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("activeRails")}
            >
              Active Rails{getSortIndicator("activeRails")}
            </TableHead>
            <TableHead
              className="font-medium cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("totalRails")}
            >
              Total Rails{getSortIndicator("totalRails")}
            </TableHead>
            <TableHead
              className="font-medium cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("uniquePayers")}
            >
              Payers{getSortIndicator("uniquePayers")}
            </TableHead>
            <TableHead
              className="font-medium cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("settledUSDFC")}
            >
              Settled USDFC{getSortIndicator("settledUSDFC")}
            </TableHead>
            <TableHead
              className="font-medium cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("settledFIL")}
            >
              Settled FIL{getSortIndicator("settledFIL")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOperators.map((op, index) => (
            <TableRow key={op.fullAddress} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <TableCell>
                <span className="font-mono text-sm">{op.address}</span>
              </TableCell>
              <TableCell>{op.activeRails.toLocaleString()}</TableCell>
              <TableCell>{op.totalRails.toLocaleString()}</TableCell>
              <TableCell>{op.uniquePayers.toLocaleString()}</TableCell>
              <TableCell>{op.settledUSDFC}</TableCell>
              <TableCell>{op.settledFIL}</TableCell>
            </TableRow>
          ))}
          {sortedOperators.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500 py-4">
                No operators found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
