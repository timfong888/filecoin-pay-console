/**
 * MSW request handlers for GraphQL testing.
 * These handlers intercept GraphQL requests during tests.
 */

import { graphql, HttpResponse } from 'msw';
import { GOLDSKY_ENDPOINT } from '../client';
import {
  mockAccounts,
  createMockAccountList,
  createActivePayerAccount,
  createChurnedPayerAccount,
  createMixedRailsPayerAccount,
} from '../__fixtures__/accounts';
import {
  mockMetricResponses,
  generateDailyMetrics,
  generateDailyTokenMetrics,
} from '../__fixtures__/metrics';
import { mockRailResponses } from '../__fixtures__/rails';

/**
 * Extract operation name from GraphQL request body.
 */
function getOperationName(query: string): string | null {
  const match = query.match(/(?:query|mutation)\s+(\w+)/);
  return match ? match[1] : null;
}

/**
 * Default handlers for all GraphQL operations.
 * Override these in individual tests using server.use().
 */
export const handlers = [
  // Generic GraphQL handler that routes based on operation name
  graphql.operation(async ({ request }) => {
    const body = await request.clone().json();
    const { query, variables } = body;
    const operationName = getOperationName(query);

    switch (operationName) {
      case 'GlobalMetrics':
        return HttpResponse.json({
          data: mockMetricResponses.globalMetrics,
        });

      case 'TopPayers':
        const first = variables?.first || 10;
        const accounts = [
          createActivePayerAccount(),
          createChurnedPayerAccount(),
          createMixedRailsPayerAccount(),
          ...createMockAccountList(Math.max(0, first - 3)),
        ].slice(0, first);
        return HttpResponse.json({
          data: { accounts },
        });

      case 'TotalSettled':
        return HttpResponse.json({
          data: mockRailResponses.totalSettled,
        });

      case 'ActiveRails':
        return HttpResponse.json({
          data: mockRailResponses.activeRails,
        });

      case 'PayerFirstActivity':
        return HttpResponse.json({
          data: {
            accounts: [
              {
                id: '0xpayer1',
                payerRails: [{ createdAt: Math.floor(Date.now() / 1000 - 86400 * 30).toString() }],
              },
              {
                id: '0xpayer2',
                payerRails: [{ createdAt: Math.floor(Date.now() / 1000 - 86400 * 14).toString() }],
              },
            ],
          },
        });

      case 'DailyMetrics':
        const dailyFirst = variables?.first || 30;
        return HttpResponse.json({
          data: {
            dailyMetrics: generateDailyMetrics(new Date(), dailyFirst),
          },
        });

      case 'DailyTokenMetrics':
        return HttpResponse.json({
          data: {
            dailyTokenMetrics: generateDailyTokenMetrics(new Date(), 7),
          },
        });

      case 'AllDailyTokenMetrics':
        const tokenFirst = variables?.first || 100;
        return HttpResponse.json({
          data: {
            dailyTokenMetrics: generateDailyTokenMetrics(new Date(), Math.min(tokenFirst, 100)),
          },
        });

      case 'TopPayees':
        const payeeFirst = variables?.first || 10;
        return HttpResponse.json({
          data: {
            accounts: createMockAccountList(payeeFirst).map((account) => ({
              ...account,
              payeeRails: account.payerRails.map((rail) => ({
                ...rail,
                payer: { address: '0xsomepayer' },
              })),
            })),
          },
        });

      case 'AccountDetail':
        const accountId = variables?.id;
        if (accountId === 'not-found') {
          return HttpResponse.json({
            data: { account: null },
          });
        }
        return HttpResponse.json({
          data: {
            account: {
              ...mockAccounts.active,
              id: accountId,
              address: accountId,
              payeeRails: [],
            },
          },
        });

      default:
        console.warn(`Unhandled GraphQL operation: ${operationName}`);
        return HttpResponse.json({
          errors: [{ message: `No mock handler for operation: ${operationName}` }],
        });
    }
  }),
];

/**
 * Helper to create an error response handler.
 */
export function createErrorHandler(operationName: string, errorMessage: string) {
  return graphql.operation(async ({ request }) => {
    const body = await request.clone().json();
    const { query } = body;
    const opName = getOperationName(query);

    if (opName === operationName) {
      return HttpResponse.json({
        errors: [{ message: errorMessage }],
      });
    }

    // Fall through to default handlers
    return undefined;
  });
}

/**
 * Helper to create an empty response handler.
 */
export function createEmptyHandler(operationName: string) {
  return graphql.operation(async ({ request }) => {
    const body = await request.clone().json();
    const { query } = body;
    const opName = getOperationName(query);

    if (opName === operationName) {
      switch (opName) {
        case 'GlobalMetrics':
          return HttpResponse.json({ data: { paymentsMetrics: [] } });
        case 'TopPayers':
        case 'TopPayees':
          return HttpResponse.json({ data: { accounts: [] } });
        case 'TotalSettled':
        case 'ActiveRails':
          return HttpResponse.json({ data: { rails: [] } });
        case 'DailyMetrics':
          return HttpResponse.json({ data: { dailyMetrics: [] } });
        case 'DailyTokenMetrics':
        case 'AllDailyTokenMetrics':
          return HttpResponse.json({ data: { dailyTokenMetrics: [] } });
        default:
          return HttpResponse.json({ data: null });
      }
    }

    return undefined;
  });
}
