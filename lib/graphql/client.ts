import { GraphQLClient, RequestDocument, Variables } from 'graphql-request';
import { withRetry, RetryOptions } from '../retry';
import { SubgraphError, RateLimitError, logError } from '../errors';
import { networkConfig, goldskyEndpoint } from '../config/network';

// Data source configuration - derived from network config
export const NETWORK = networkConfig.displayName;

// Subgraph configurations
export const SUBGRAPHS = {
  FILECOIN_PAY: {
    name: networkConfig.subgraphs.FILECOIN_PAY.name,
    version: networkConfig.subgraphs.FILECOIN_PAY.version,
    endpoint: goldskyEndpoint('FILECOIN_PAY'),
  },
  FWSS: {
    name: networkConfig.subgraphs.FWSS.name,
    version: networkConfig.subgraphs.FWSS.version,
    endpoint: goldskyEndpoint('FWSS'),
  },
};

// Primary endpoint for dashboard queries (Filecoin Pay subgraph)
export const GOLDSKY_ENDPOINT = SUBGRAPHS.FILECOIN_PAY.endpoint;
export const SUBGRAPH_VERSION = SUBGRAPHS.FILECOIN_PAY.version;
export const SUBGRAPH_NAME = SUBGRAPHS.FILECOIN_PAY.name;

// Legacy export for backward compatibility
export const FILECOIN_PAY_CONTRACT = networkConfig.contracts.FILECOIN_PAY;

// Contract addresses with names
export const CONTRACTS = {
  FILECOIN_PAY: {
    name: 'Filecoin Pay',
    address: networkConfig.contracts.FILECOIN_PAY,
  },
  FWSS: {
    name: 'FWSS',
    address: networkConfig.contracts.FWSS,
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
