import { GraphQLClient } from 'graphql-request';

// Data source configuration - Filecoin Mainnet
export const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cmb9tuo8r1xdw01ykb8uidk7h/subgraphs/filecoin-pay-mainnet/1.0.0/gn';
export const FILECOIN_PAY_CONTRACT = '0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa';
export const SUBGRAPH_VERSION = '1.0.0';
export const NETWORK = 'Filecoin Mainnet';

// Filecoin epoch constants
// Filecoin epochs are 30 seconds each
export const EPOCH_DURATION_SECONDS = 30;
export const EPOCHS_PER_DAY = (24 * 60 * 60) / EPOCH_DURATION_SECONDS; // 2880 epochs per day

// Dashboard deployment metadata (PinMe/IPFS)
// Updated after each deployment - v0.7.0 (2026-01-09)
export const DASHBOARD_IPFS_CID = 'bafybeicrptqpee3krij7pgbroal7pyueq5vldmupe277tyle625vut5phu';
export const DASHBOARD_PINME_URL = 'b5ff14b9.pinit.eth.limo';
export const DASHBOARD_PAYMENT_WALLET = '0x...'; // TODO: Discover PinMe payment wallet
export const DASHBOARD_COMMP = 'baga6ea4seaq...'; // TODO: Get commP from Filecoin network

export const graphqlClient = new GraphQLClient(GOLDSKY_ENDPOINT);
