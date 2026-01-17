/**
 * @deprecated This file re-exports from the modular fetchers/ directory.
 * Import directly from 'lib/graphql/fetchers/' for new code.
 *
 * The fetchers have been split into domain modules:
 * - fetchers/utils.ts - Utility functions (weiToUSDC, formatCurrency, etc.)
 * - fetchers/metrics.ts - Global metrics (fetchGlobalMetrics, fetchTotalSettled, etc.)
 * - fetchers/payers.ts - Payer functions (fetchTopPayers, fetchAllPayers, etc.)
 * - fetchers/payees.ts - Payee functions (fetchAllPayees, enrichPayeesWithPDP, etc.)
 * - fetchers/accounts.ts - Account detail (fetchAccountDetail, RailState)
 * - fetchers/dashboard.ts - Dashboard aggregation (fetchDashboardData, fetchPayerListMetrics)
 */

// Re-export everything for backward compatibility
export * from './fetchers/index';
