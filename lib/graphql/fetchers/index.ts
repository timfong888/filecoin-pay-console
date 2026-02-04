/**
 * Fetchers module index.
 * Re-exports all functions for backward compatibility.
 */

// Utility functions
export {
  weiToUSDC,
  formatCurrency,
  formatAddress,
  calculateRunway,
  calculateRunwayDays,
  formatRunwayDays,
  generateDateRange,
  formatDate,
  secondsToMs,
  formatChartDate,
  formatChartCurrency,
} from './utils';

// Metrics functions
export {
  fetchGlobalMetrics,
  fetchTotalSettled,
  fetchSettled7d,
  fetchMonthlyRunRate,
  fetchDailyMetrics,
  fetchDailySettled,
  fetchTotalLockedUSDFC,
  fetchARR,
} from './metrics';
export type { ARRResult } from './metrics';

// Payer functions
export {
  fetchTopPayers,
  fetchAllPayers,
  fetchAllPayersExtended,
  fetchActivePayersCount,
  fetchChurnedWalletsCount,
  fetchActivePayersByDate,
  enrichPayersWithPDP,
  enrichPayersWithSettled7d,
} from './payers';
export type { PayerDisplay, PayerDisplayExtended } from './payers';

// Payee functions
export {
  fetchAllPayees,
  fetchAllPayeesBasic,
  enrichPayeesWithPDP,
} from './payees';
export type { PayeeDisplay } from './payees';

// Account functions
export {
  fetchAccountDetail,
  RailState,
} from './accounts';
export type { RailDisplay, AccountDetail } from './accounts';

// Dashboard functions
export {
  fetchDashboardData,
  fetchPayerListMetrics,
} from './dashboard';

// Re-export PDP types and utilities for UI use
export { formatDataSize } from '../../pdp/fetchers';
export type { PDPEnrichment } from '../../pdp/types';
