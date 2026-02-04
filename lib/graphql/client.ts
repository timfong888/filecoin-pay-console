import { GraphQLClient, RequestDocument, Variables } from 'graphql-request';
import { withRetry, RetryOptions } from '../retry';
import { SubgraphError, RateLimitError, logError } from '../errors';

// Data source configuration - Filecoin Mainnet
export const NETWORK = 'Filecoin Mainnet';

// Goldsky Project ID for FilOz subgraphs
const GOLDSKY_PROJECT_ID = 'project_cmb9tuo8r1xdw01ykb8uidk7h';

// Subgraph configurations
export const SUBGRAPHS = {
  FILECOIN_PAY: {
    name: 'filecoin-pay-mainnet-tim',
    version: '1.2.0',
    endpoint: `https://api.goldsky.com/api/public/${GOLDSKY_PROJECT_ID}/subgraphs/filecoin-pay-mainnet-tim/1.2.0/gn`,
  },
  FWSS: {
    name: 'fwss-mainnet-tim',
    version: '1.0.0',
    endpoint: `https://api.goldsky.com/api/public/${GOLDSKY_PROJECT_ID}/subgraphs/fwss-mainnet-tim/1.0.0/gn`,
  },
};

// Primary endpoint for dashboard queries (Filecoin Pay subgraph)
export const GOLDSKY_ENDPOINT = SUBGRAPHS.FILECOIN_PAY.endpoint;
export const SUBGRAPH_VERSION = SUBGRAPHS.FILECOIN_PAY.version;
export const SUBGRAPH_NAME = SUBGRAPHS.FILECOIN_PAY.name;

// Legacy export for backward compatibility
export const FILECOIN_PAY_CONTRACT = '0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa';

// Contract addresses with names
export const CONTRACTS = {
  FILECOIN_PAY: {
    name: 'Filecoin Pay',
    address: '0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa',
  },
  FWSS: {
    name: 'FWSS',
    address: '0x8408502033C418E1bbC97cE9ac48E5528F371A9f',
  },
};

// Filecoin epoch constants
// Filecoin epochs are 30 seconds each
export const EPOCH_DURATION_SECONDS = 30;
export const EPOCHS_PER_DAY = (24 * 60 * 60) / EPOCH_DURATION_SECONDS; // 2880 epochs per day

// Dashboard deployment metadata (PinMe/IPFS)
// Note: CID and URL cannot be pre-baked (chicken-and-egg problem)
// URL is determined dynamically at runtime via window.location.hostname
export const DASHBOARD_VERSION = '0.37.0';

// Base GraphQL client
const baseClient = new GraphQLClient(GOLDSKY_ENDPOINT);

// Default retry options for subgraph queries
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  logRetries: true,
};

/**
 * Wraps a GraphQL error into a typed SubgraphError.
 */
function wrapGraphQLError(error: unknown, query?: string, variables?: Variables): SubgraphError {
  const message = error instanceof Error ? error.message : String(error);

  // Check for rate limiting
  if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
    return new RateLimitError('Subgraph rate limit exceeded', {
      cause: error instanceof Error ? error : undefined,
    }) as unknown as SubgraphError;
  }

  return new SubgraphError(message, {
    query: typeof query === 'string' ? query : undefined,
    variables: variables as Record<string, unknown> | undefined,
    cause: error instanceof Error ? error : undefined,
    isRetryable: !message.includes('syntax') && !message.includes('validation'),
  });
}

/**
 * Execute a GraphQL query with retry logic and structured error handling.
 */
export async function executeQuery<T>(
  query: RequestDocument,
  variables?: Variables,
  options?: {
    operation?: string;
    retryOptions?: Partial<RetryOptions>;
  }
): Promise<T> {
  const operation = options?.operation || 'graphql query';

  return withRetry(
    async () => {
      try {
        return await baseClient.request<T>(query, variables);
      } catch (error) {
        throw wrapGraphQLError(error, String(query), variables);
      }
    },
    {
      ...DEFAULT_RETRY_OPTIONS,
      ...options?.retryOptions,
      operation,
    }
  );
}

/**
 * Legacy graphqlClient for backward compatibility.
 * Use executeQuery() for new code to get retry logic.
 */
export const graphqlClient = {
  request: async <T>(query: RequestDocument, variables?: Variables): Promise<T> => {
    try {
      return await baseClient.request<T>(query, variables);
    } catch (error) {
      const wrappedError = wrapGraphQLError(error, String(query), variables);
      logError(wrappedError, 'graphqlClient.request');
      throw wrappedError;
    }
  },
};
