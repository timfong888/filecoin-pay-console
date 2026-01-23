'use client';

import {
  CONTRACTS,
  SUBGRAPHS,
  NETWORK,
  DASHBOARD_VERSION,
} from '@/lib/graphql/client';
import { CONSOLE_MODE, isGAMode } from '@/lib/config/mode';

interface DataSourcePanelProps {
  hostname?: string;
  showDeploymentInfo?: boolean;
}

/**
 * Reusable panel showing data source information (network, contract, subgraph).
 * Optionally shows deployment info (version, mode, URL) and subgraph URL.
 */
export function DataSourcePanel({
  hostname,
  showDeploymentInfo = true,
}: DataSourcePanelProps) {
  return (
    <div className="bg-gray-50 border rounded-lg p-4 text-sm">
      <div className={`grid grid-cols-1 ${showDeploymentInfo ? 'md:grid-cols-2' : ''} gap-6`}>
        {/* Data Source Column */}
        <div>
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

        {/* Deployment Info Column */}
        {showDeploymentInfo && (
          <div>
            <div className="font-medium text-gray-700 mb-2">Dashboard Deployment (PinMe/IPFS)</div>
            <dl className="space-y-1 text-gray-600">
              <DataSourceRow
                label="Version:"
                value={`v${DASHBOARD_VERSION}-${CONSOLE_MODE}`}
                className="font-semibold"
              />
              <div className="flex gap-2">
                <dt className="w-32 flex-shrink-0">Mode:</dt>
                <dd className="font-mono">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    isGAMode
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {CONSOLE_MODE.toUpperCase()}
                  </span>
                </dd>
              </div>
              <DataSourceRow
                label="Site URL:"
                value={hostname || 'Loading...'}
                className="text-xs"
              />
            </dl>
          </div>
        )}
      </div>
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
