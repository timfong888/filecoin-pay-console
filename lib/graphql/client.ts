import { GraphQLClient } from 'graphql-request';

const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cmb9tuo8r1xdw01ykb8uidk7h/subgraphs/filecoin-pay-mainnet/1.0.0/gn';

export const graphqlClient = new GraphQLClient(GOLDSKY_ENDPOINT);

// Contract address for reference
export const FILECOIN_PAY_CONTRACT = '0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa';
