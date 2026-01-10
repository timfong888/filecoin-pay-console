"use client";

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
  ensName?: string;
  locked: string;
  settled: string;
  runway: string;
  start: string;
  startTimestamp: number; // Unix timestamp in ms for filtering
}

interface TopPayersTableProps {
  payers: Payer[];
}

// Mock data for initial development
export const mockPayers: Payer[] = [
  { address: "0x1a2b...3c4d", ensName: "myapp.filpay.eth", locked: "$12,450", settled: "$45,200", runway: "45 days", start: "Nov 15 '24", startTimestamp: new Date('2024-11-15').getTime() },
  { address: "0x2b3c...4d5e", locked: "$8,200", settled: "$23,100", runway: "23 days", start: "Nov 20 '24", startTimestamp: new Date('2024-11-20').getTime() },
  { address: "0x3c4d...5e6f", ensName: "demo.filpay.eth", locked: "$0", settled: "$5,600", runway: "-", start: "Oct 1 '24", startTimestamp: new Date('2024-10-01').getTime() },
  { address: "0x4d5e...6f7g", locked: "$45,000", settled: "$120,000", runway: "180 days", start: "Dec 1 '24", startTimestamp: new Date('2024-12-01').getTime() },
  { address: "0x5e6f...7g8h", ensName: "test.filpay.eth", locked: "$500", settled: "$1,200", runway: "7 days", start: "Dec 5 '24", startTimestamp: new Date('2024-12-05').getTime() },
  { address: "0x6f7g...8h9i", locked: "$3,200", settled: "$8,900", runway: "15 days", start: "Dec 8 '24", startTimestamp: new Date('2024-12-08').getTime() },
  { address: "0x7g8h...9i0j", ensName: "prod.filpay.eth", locked: "$25,000", settled: "$78,500", runway: "90 days", start: "Oct 15 '24", startTimestamp: new Date('2024-10-15').getTime() },
  { address: "0x8h9i...0j1k", locked: "$1,800", settled: "$4,200", runway: "12 days", start: "Dec 10 '24", startTimestamp: new Date('2024-12-10').getTime() },
  { address: "0x9i0j...1k2l", locked: "$6,500", settled: "$19,300", runway: "28 days", start: "Nov 28 '24", startTimestamp: new Date('2024-11-28').getTime() },
  { address: "0x0j1k...2l3m", ensName: "app.filpay.eth", locked: "$15,000", settled: "$52,000", runway: "60 days", start: "Nov 1 '24", startTimestamp: new Date('2024-11-01').getTime() },
];

export function TopPayersTable({ payers }: TopPayersTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-medium">Address</TableHead>
            <TableHead className="font-medium">Locked</TableHead>
            <TableHead className="font-medium">Settled</TableHead>
            <TableHead className="font-medium">Runway</TableHead>
            <TableHead className="font-medium">Start</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payers.map((payer, index) => (
            <TableRow key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
