"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { RailDisplay } from "@/lib/graphql/fetchers";
import { getKnownWalletName } from "@/lib/wallet-registry";
import { formatAddress } from "@/lib/graphql/fetchers/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OperatorGroup {
  operatorAddress: string;
  operatorName: string;
  totalSettledRaw: number;
  totalSettled: string;
  activeRailCount: number;
  totalRailCount: number;
  rails: RailDisplay[];
}

function groupRailsByOperator(rails: RailDisplay[]): OperatorGroup[] {
  const groups = new Map<string, RailDisplay[]>();

  for (const rail of rails) {
    const key = rail.operatorAddress.toLowerCase() || "unknown";
    const existing = groups.get(key);
    if (existing) {
      existing.push(rail);
    } else {
      groups.set(key, [rail]);
    }
  }

  const result: OperatorGroup[] = [];
  for (const [addr, groupRails] of groups) {
    const totalSettledRaw = groupRails.reduce((sum, r) => sum + r.settledRaw, 0);
    const activeCount = groupRails.filter((r) => r.stateCode === 0).length;

    // Format total settled
    let totalSettled: string;
    if (totalSettledRaw >= 1_000_000) {
      totalSettled = `$${(totalSettledRaw / 1_000_000).toFixed(2)}M`;
    } else if (totalSettledRaw >= 1_000) {
      totalSettled = `$${(totalSettledRaw / 1_000).toFixed(2)}K`;
    } else {
      totalSettled = `$${totalSettledRaw.toFixed(2)}`;
    }

    result.push({
      operatorAddress: addr,
      operatorName:
        getKnownWalletName(addr) || formatAddress(addr),
      totalSettledRaw,
      totalSettled,
      activeRailCount: activeCount,
      totalRailCount: groupRails.length,
      rails: groupRails,
    });
  }

  // Sort by total settled descending
  result.sort((a, b) => b.totalSettledRaw - a.totalSettledRaw);
  return result;
}

interface OperatorGroupedRailsProps {
  rails: RailDisplay[];
  counterpartyEnsNames: Map<string, string | null>;
  /** "payer" = showing payee counterparties; "payee" = showing payer counterparties */
  perspective: "payer" | "payee";
}

export function OperatorGroupedRails({
  rails,
  counterpartyEnsNames,
  perspective,
}: OperatorGroupedRailsProps) {
  const [expandedOperators, setExpandedOperators] = useState<Set<string>>(
    new Set()
  );

  const groups = useMemo(() => groupRailsByOperator(rails), [rails]);

  if (rails.length === 0) {
    return (
      <div className="bg-gray-50 border rounded-lg p-8 text-center text-gray-500">
        No payment rails found
      </div>
    );
  }

  const toggleOperator = (addr: string) => {
    setExpandedOperators((prev) => {
      const next = new Set(prev);
      if (next.has(addr)) {
        next.delete(addr);
      } else {
        next.add(addr);
      }
      return next;
    });
  };

  const counterpartyLabel = perspective === "payer" ? "Payee (SP)" : "Payer";
  const counterpartyLink =
    perspective === "payer" ? "/payee-accounts" : "/payer-accounts";

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-medium w-8"></TableHead>
            <TableHead className="font-medium">Operator</TableHead>
            <TableHead className="font-medium">Active Rails</TableHead>
            <TableHead className="font-medium">Total Settled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const isExpanded = expandedOperators.has(group.operatorAddress);
            return (
              <GroupRow
                key={group.operatorAddress}
                group={group}
                isExpanded={isExpanded}
                onToggle={() => toggleOperator(group.operatorAddress)}
                counterpartyEnsNames={counterpartyEnsNames}
                counterpartyLabel={counterpartyLabel}
                counterpartyLink={counterpartyLink}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function GroupRow({
  group,
  isExpanded,
  onToggle,
  counterpartyEnsNames,
  counterpartyLabel,
  counterpartyLink,
}: {
  group: OperatorGroup;
  isExpanded: boolean;
  onToggle: () => void;
  counterpartyEnsNames: Map<string, string | null>;
  counterpartyLabel: string;
  counterpartyLink: string;
}) {
  return (
    <>
      {/* Operator summary row (always visible) */}
      <TableRow
        className="cursor-pointer hover:bg-blue-50 transition-colors"
        onClick={onToggle}
      >
        <TableCell className="w-8 text-center">
          <span
            className="inline-block transition-transform duration-200"
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ▶
          </span>
        </TableCell>
        <TableCell className="font-medium">{group.operatorName}</TableCell>
        <TableCell>
          <span className="text-green-700 font-medium">
            {group.activeRailCount}
          </span>
          <span className="text-gray-400 text-sm">
            {" "}
            / {group.totalRailCount}
          </span>
        </TableCell>
        <TableCell className="font-medium">{group.totalSettled}</TableCell>
      </TableRow>

      {/* Expanded detail rows */}
      {isExpanded && (
        <>
          {/* Sub-header */}
          <TableRow className="bg-gray-100">
            <TableCell></TableCell>
            <TableCell className="text-xs font-medium text-gray-500 uppercase">
              {counterpartyLabel}
            </TableCell>
            <TableCell className="text-xs font-medium text-gray-500 uppercase">
              Status
            </TableCell>
            <TableCell className="text-xs font-medium text-gray-500 uppercase">
              Settled
            </TableCell>
          </TableRow>
          {group.rails.map((rail, index) => (
            <TableRow
              key={rail.id}
              className={`${
                index % 2 === 0 ? "bg-white" : "bg-gray-50"
              } border-l-4 border-l-blue-200`}
            >
              <TableCell></TableCell>
              <TableCell>
                <Link
                  href={`${counterpartyLink}?address=${rail.counterpartyAddress}`}
                  className="hover:underline"
                >
                  {counterpartyEnsNames.get(
                    rail.counterpartyAddress?.toLowerCase()
                  ) ? (
                    <span className="text-blue-600 font-medium">
                      {counterpartyEnsNames.get(
                        rail.counterpartyAddress?.toLowerCase()
                      )}
                    </span>
                  ) : (
                    <span className="font-mono text-sm text-blue-600">
                      {rail.counterpartyFormatted}
                    </span>
                  )}
                </Link>
              </TableCell>
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
              <TableCell>{rail.settled}</TableCell>
            </TableRow>
          ))}
        </>
      )}
    </>
  );
}
