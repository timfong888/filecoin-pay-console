/**
 * Utility functions for data formatting and calculations.
 * These are pure functions with no side effects.
 */

import { EPOCHS_PER_DAY } from '../client';

/**
 * Convert wei (18 decimals) to human readable USDFC number.
 * @param wei - Amount in wei as string
 * @returns Number with 2 decimal places
 */
export function weiToUSDC(wei: string): number {
  const value = BigInt(wei);
  // USDFC has 18 decimals
  const divisor = BigInt(10 ** 18);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  // Get 2 decimal places
  const decimals = Number((fractionalPart * BigInt(100)) / divisor);
  return Number(wholePart) + decimals / 100;
}

/**
 * Format number as currency string.
 * @param value - Number to format
 * @returns Formatted string (e.g., "$1.23K", "$4.56M")
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Format Ethereum address for display (truncated).
 * @param address - Full address
 * @returns Truncated address (e.g., "0x1234...5678")
 */
export function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Calculate runway in days based on available funds and burn rate.
 * @param funds - Available funds in wei
 * @param lockupRate - Rate per epoch in wei
 * @returns Human readable runway string
 */
export function calculateRunway(funds: string, lockupRate: string): string {
  const fundsValue = BigInt(funds);
  const rateValue = BigInt(lockupRate || '0');

  if (rateValue === BigInt(0) || fundsValue === BigInt(0)) {
    return '-';
  }

  // Rate is per epoch (30 seconds on Filecoin)
  // Days = funds / (rate * epochs_per_day)
  // epochs_per_day = 24 * 60 * 2 = 2880
  const epochsPerDay = BigInt(2880);
  const dailyBurn = rateValue * epochsPerDay;

  if (dailyBurn === BigInt(0)) return '-';

  const days = Number(fundsValue / dailyBurn);
  return days > 0 ? `${days} days` : '< 1 day';
}

/**
 * Calculate runway in days (numeric) for sorting purposes.
 * @param funds - Available funds in wei (BigInt)
 * @param lockupRate - Rate per epoch in wei (BigInt)
 * @returns Number of days, or -1 if not calculable
 */
export function calculateRunwayDays(funds: bigint, lockupRate: bigint): number {
  if (lockupRate <= BigInt(0) || funds <= BigInt(0)) {
    return -1;
  }

  const epochsPerDayBigInt = BigInt(Math.floor(EPOCHS_PER_DAY));
  const dailyBurn = lockupRate * epochsPerDayBigInt;

  if (dailyBurn <= BigInt(0)) return -1;

  return Number(funds / dailyBurn);
}

/**
 * Format runway days to human readable string.
 * @param days - Number of days
 * @returns Formatted string (e.g., "30 days", "1y 45d")
 */
export function formatRunwayDays(days: number): string {
  if (days < 0) return '-';
  if (days > 365) {
    return `${Math.floor(days / 365)}y ${days % 365}d`;
  } else if (days > 0) {
    return `${days} days`;
  }
  return '< 1 day';
}

/**
 * Generate an array of date strings for a date range.
 * @param startDate - Start of range
 * @param endDate - End of range
 * @returns Array of ISO date strings (YYYY-MM-DD)
 */
export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Format a date for display.
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15 '26")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  }).replace(',', " '");
}
