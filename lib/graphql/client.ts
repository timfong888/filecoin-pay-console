import { GraphQLClient } from 'graphql-request';

// Data source configuration - Filecoin Mainnet
export const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cmj7soo5uf4no01xw0tij21a1/subgraphs/filecoin-pay-mainnet/1.1.0/gn';
export const FILECOIN_PAY_CONTRACT = '0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa';
export const SUBGRAPH_VERSION = '1.1.0';
export const NETWORK = 'Filecoin Mainnet';

// Filecoin epoch constants
// Filecoin epochs are 30 seconds each
export const EPOCH_DURATION_SECONDS = 30;
export const EPOCHS_PER_DAY = (24 * 60 * 60) / EPOCH_DURATION_SECONDS; // 2880 epochs per day

// Dashboard deployment metadata (PinMe/IPFS)
// Note: CID and URL cannot be pre-baked (chicken-and-egg problem)
// URL is determined dynamically at runtime via window.location.hostname
export const DASHBOARD_VERSION = '0.16.0';

export const graphqlClient = new GraphQLClient(GOLDSKY_ENDPOINT);
