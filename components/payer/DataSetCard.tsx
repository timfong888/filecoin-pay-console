"use client";

import { useState } from "react";
import Link from "next/link";
import { DataSetDisplayData, PieceDisplayData } from "@/lib/pdp/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { truncateCID } from "@/lib/stateview/client";

interface DataSetCardProps {
  dataSet: DataSetDisplayData;
  defaultExpanded?: boolean;
  onSearchMatch?: boolean; // Highlight if search matched
}

/**
 * Format currency value for display
 */
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else if (value >= 1) {
    return `$${value.toFixed(2)}`;
  } else if (value > 0) {
    return `$${value.toFixed(4)}`;
  }
  return "$0.00";
}

/**
 * Expandable card component for displaying DataSet details.
 *
 * Shows collapsed summary with expand/collapse toggle.
 * Expanded view shows inline pieces table.
 */
export function DataSetCard({
  dataSet,
  defaultExpanded = false,
  onSearchMatch = false,
}: DataSetCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || onSearchMatch);

  // Determine proven status color
  const getProvenStatusColor = () => {
    if (!dataSet.lastProvenFormatted) return "text-gray-400";
    // If proven within last 24 hours (roughly), show green
    if (
      dataSet.lastProvenFormatted.includes("m ago") ||
      dataSet.lastProvenFormatted.includes("h ago") ||
      dataSet.lastProvenFormatted === "just now"
    ) {
      return "text-green-600";
    }
    // If within last week, show yellow
    if (dataSet.lastProvenFormatted.includes("d ago")) {
      return "text-yellow-600";
    }
    // Older than a week, show orange/red
    return "text-orange-600";
  };

  const providerDisplay = dataSet.providerENS || dataSet.providerFormatted;

  return (
    <div
      className={`bg-white border rounded-lg overflow-hidden transition-all ${
        onSearchMatch ? "ring-2 ring-blue-500" : ""
      }`}
    >
      {/* Collapsed Header - Always Visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          {/* Left side: DataSet ID and Provider */}
          <div className="flex items-center gap-4">
            {/* Expand/Collapse Toggle */}
            <button
              className="text-gray-400 hover:text-gray-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${
                  expanded ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* DataSet ID */}
            <div>
              <span className="text-blue-600 font-semibold text-lg">
                DS-{dataSet.setId.slice(-3).padStart(3, "0")}
              </span>
              {dataSet.hasFaults && (
                <span
                  className="ml-2 text-yellow-500"
                  title={`${dataSet.faultedPeriods} faulted periods`}
                >
                  ⚠️
                </span>
              )}
            </div>

            {/* Storage Provider */}
            <div className="text-sm text-gray-600">
              <span className="text-gray-400 mr-1">SP:</span>
              <Link
                href={`/payee-accounts?address=${dataSet.providerAddress}`}
                className="text-blue-600 hover:underline font-mono"
                onClick={(e) => e.stopPropagation()}
                title={dataSet.providerAddress}
              >
                {providerDisplay}
              </Link>
            </div>
          </div>

          {/* Right side: Metrics */}
          <div className="flex items-center gap-6 text-sm">
            {/* Size */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Size:</span>
              <span className="font-medium">{dataSet.totalSizeFormatted}</span>
            </div>

            {/* Piece Count */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Pieces:</span>
              <span className="font-medium">{dataSet.pieceCount}</span>
            </div>

            {/* Cost Paid */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Paid:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(dataSet.totalPaidUSDFC)}
              </span>
            </div>

            {/* Cost per GB */}
            {dataSet.costPerGBMonth !== null && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Rate:</span>
                <span className="font-medium">
                  {formatCurrency(dataSet.costPerGBMonth)}/GB/mo
                </span>
              </div>
            )}

            {/* Last Proven */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Proven:</span>
              <span className={`font-medium ${getProvenStatusColor()}`}>
                {dataSet.lastProvenFormatted || "—"}
              </span>
            </div>

            {/* Status Badge */}
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                dataSet.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {dataSet.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Content - Pieces Table */}
      {expanded && (
        <div className="border-t bg-gray-50 p-4">
          {dataSet.pieces.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No pieces found in this DataSet
            </p>
          ) : (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium">Piece CID</TableHead>
                    <TableHead className="font-medium">IPFS CID</TableHead>
                    <TableHead className="font-medium">Size</TableHead>
                    <TableHead className="font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataSet.pieces.map((piece, index) => (
                    <PieceRow key={`${piece.dataSetId}-${piece.pieceId}`} piece={piece} index={index} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual piece row in the expanded table
 */
function PieceRow({ piece, index }: { piece: PieceDisplayData; index: number }) {
  return (
    <TableRow className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm" title={piece.pieceCID}>
            {truncateCID(piece.pieceCID)}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(piece.pieceCID)}
            className="text-gray-400 hover:text-gray-600"
            title="Copy Piece CID"
          >
            📋
          </button>
        </div>
      </TableCell>
      <TableCell>
        {piece.ipfsCID ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm" title={piece.ipfsCID}>
              {truncateCID(piece.ipfsCID)}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(piece.ipfsCID!)}
              className="text-gray-400 hover:text-gray-600"
              title="Copy IPFS CID"
            >
              📋
            </button>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell>{piece.size}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const url = piece.ipfsCID
                ? `https://dweb.link/ipfs/${piece.ipfsCID}`
                : `https://data.filecoin.io/piece/${piece.pieceCID}`;
              navigator.clipboard.writeText(url);
            }}
            className="text-blue-600 hover:underline text-sm"
            title="Copy retrieval URL"
          >
            Copy URL
          </button>
          {piece.ipfsCID && (
            <a
              href={`https://dweb.link/ipfs/${piece.ipfsCID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              View
            </a>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default DataSetCard;
