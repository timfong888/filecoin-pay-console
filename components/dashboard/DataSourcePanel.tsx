'use client';

import {
  CONTRACTS,
  SUBGRAPHS,
  NETWORK,
} from '@/lib/graphql/client';

/**
 * Panel showing data source information (network, contracts, subgraph versions).
 */
export function DataSourcePanel() {
  return (
    <div className="bg-gray-50 border rounded-lg p-4 text-sm">
      <div className="font-medium text-gray-700 mb-2">Data Source</div>
      <dl className="space-y-1 text-gray-600">
        <DataSourceRow label="Network:" value={NETWORK} />
        <div className="flex gap-2">
          <dt className="w-32 flex-shrink-0">Contracts:</dt>
          <dd className="font-mono text-xs space-y-1">
            <div>
              <span className="text-gray-600">{CONTRACTS.FILECOIN_PAY.name}: </span>
              <a
                href={`https://filfox.info/en/address/${CONTRACTS.FILECOIN_PAY.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {CONTRACTS.FILECOIN_PAY.address}
              </a>
            </div>
            <div>
              <span className="text-gray-600">{CONTRACTS.FWSS.name}: </span>
              <a
                href={`https://filfox.info/en/address/${CONTRACTS.FWSS.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {CONTRACTS.FWSS.address}
              </a>
            </div>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 flex-shrink-0">Subgraphs:</dt>
          <dd className="font-mono text-xs space-y-1">
            <div>
              <span className="text-gray-600">{SUBGRAPHS.FILECOIN_PAY.name}: </span>
              <a
                href={SUBGRAPHS.FILECOIN_PAY.endpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                v{SUBGRAPHS.FILECOIN_PAY.version}
              </a>
            </div>
            <div>
              <span className="text-gray-600">{SUBGRAPHS.FWSS.name}: </span>
              <a
                href={SUBGRAPHS.FWSS.endpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                v{SUBGRAPHS.FWSS.version}
              </a>
            </div>
          </dd>
        </div>
        <DataSourceRow label="Last Updated:" value={new Date().toLocaleString()} />
      </dl>
    </div>
  );
}

interface DataSourceRowProps {
  label: string;
  value: string;
  className?: string;
}

function DataSourceRow({ label, value, className = '' }: DataSourceRowProps) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 flex-shrink-0">{label}</dt>
      <dd className={`font-mono ${className}`}>{value}</dd>
    </div>
  );
}

export default DataSourcePanel;
