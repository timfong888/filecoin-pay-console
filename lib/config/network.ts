import { filecoin, filecoinCalibration } from 'viem/chains';

export type NetworkName = 'mainnet' | 'calibration';

export const NETWORK_NAME: NetworkName =
  (process.env.NEXT_PUBLIC_NETWORK as NetworkName) || 'mainnet';

const GOLDSKY_PROJECT_ID = 'project_cmb9tuo8r1xdw01ykb8uidk7h';

const NETWORKS = {
  mainnet: {
    displayName: 'Filecoin Mainnet',
    chain: filecoin,
    rpc: 'https://api.node.glif.io/rpc/v1',
    subgraphs: {
      FILECOIN_PAY: { name: 'filecoin-pay-mainnet', version: '1.0.6' },
      FWSS: { name: 'fwss-mainnet-tim', version: '1.1.0' },
    },
    contracts: {
      FILECOIN_PAY: '0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa',
      FWSS: '0x8408502033C418E1bbC97cE9ac48E5528F371A9f',
      STATE_VIEW: '0x9e4e6699d8F67dFc883d6b0A7344Bd56F7E80B46',
    },
  },
  calibration: {
    displayName: 'Filecoin Calibration',
    chain: filecoinCalibration,
    rpc: 'https://api.calibration.node.glif.io/rpc/v1',
    subgraphs: {
      FILECOIN_PAY: { name: 'filecoin-pay-calibration', version: '1.0.6' },
      FWSS: { name: 'fwss-calibration-tim', version: '1.0.0' },
    },
    contracts: {
      FILECOIN_PAY: '0x09a0fDc2723fAd1A7b8e3e00eE5DF73841df55a0',
      FWSS: '0x02925630df557F957f70E112bA06e50965417CA0',
      STATE_VIEW: '0x53d235D474585EC102ccaB7e0cdcE951dD00f716',
    },
  },
} as const;

export const networkConfig = NETWORKS[NETWORK_NAME];

export function goldskyEndpoint(subgraph: 'FILECOIN_PAY' | 'FWSS'): string {
  const { name, version } = networkConfig.subgraphs[subgraph];
  return `https://api.goldsky.com/api/public/${GOLDSKY_PROJECT_ID}/subgraphs/${name}/${version}/gn`;
}
