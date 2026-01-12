import { BigInt as GraphBN } from "@graphprotocol/graph-ts";

// Time constants
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_WEEK = 604800;
export const SECONDS_PER_MONTH = 2592000; // 30 days

// GraphQL BigInt constants
export const ZERO_BIG_INT = GraphBN.zero();
export const ONE_BIG_INT = GraphBN.fromI32(1);
export const HUNDRED_BIG_INT = GraphBN.fromI32(100);
export const BASIS_POINTS_DIVISOR = GraphBN.fromI32(10000);

// Volume breakdown thresholds (in wei equivalent)
export const SMALL_PAYMENT_THRESHOLD = GraphBN.fromString("1000000000000000000"); // 1 FIL
export const LARGE_PAYMENT_THRESHOLD = GraphBN.fromString("100000000000000000000"); // 100 FIL

// Rate breakdown thresholds (per day in wei)
export const LOW_RATE_THRESHOLD = GraphBN.fromString("100000000000000000"); // 0.1 FIL/day
export const HIGH_RATE_THRESHOLD = GraphBN.fromString("10000000000000000000"); // 10 FIL/day

// Breakdown types
export const BREAKDOWN_BY_TOKEN = "by_token";
export const BREAKDOWN_BY_OPERATOR = "by_operator";
export const BREAKDOWN_BY_RATE_RANGE = "by_rate_range";

// Metrics entity IDs
export const PAYMENTS_NETWORK_STATS_ID = "payments_network_stats";

// Offset to align weeks to Sunday (Unix epoch Jan 1, 1970 was a Thursday)
// Thursday + 3 days = Sunday, so we add 3 days before modulo then subtract after
const THURSDAY_TO_SUNDAY_OFFSET: i64 = 4 * SECONDS_PER_DAY; // 4 days (Thu -> Sun is 3 days forward = 4 days backward)

// Date format helpers
export class DateHelpers {
  static getDateString(timestamp: i64): string {
    // Simple date formatting for AssemblyScript
    const daysSinceEpoch = timestamp / SECONDS_PER_DAY;
    const year = (1970 + daysSinceEpoch / 365) as i32;
    const dayOfYear = (daysSinceEpoch % 365) as i32;
    const month = ((dayOfYear / 30) as i32) + 1;
    const day = ((dayOfYear % 30) as i32) + 1;

    const yearStr = year.toString();
    const monthStr = month < 10 ? "0" + month.toString() : month.toString();
    const dayStr = day < 10 ? "0" + day.toString() : day.toString();

    return yearStr + "-" + monthStr + "-" + dayStr;
  }

  static getWeek(timestamp: i64): GraphBN {
    // Use week start to calculate consistent week numbers
    const weekStart = DateHelpers.getWeekStartTimestamp(timestamp);
    const week = ((weekStart / SECONDS_PER_WEEK) as i32) + 1;
    return GraphBN.fromI32(week);
  }

  static getMonthString(timestamp: i64): string {
    const month = ((timestamp / SECONDS_PER_MONTH) as i32) + 1;
    const monthStr = month < 10 ? "0" + month.toString() : month.toString();
    return DateHelpers.getDateString(timestamp) + "-" + monthStr;
  }

  static getDayStartTimestamp(timestamp: i64): i64 {
    return timestamp - (timestamp % SECONDS_PER_DAY);
  }

  /**
   * Get week start timestamp aligned to Sunday 00:00:00 UTC
   * Unix epoch (Jan 1, 1970) was a Thursday, so we offset to align to Sunday
   */
  static getWeekStartTimestamp(timestamp: i64): i64 {
    // Add offset to shift Thursday -> Sunday, then modulo, then subtract offset back
    const adjusted = timestamp + THURSDAY_TO_SUNDAY_OFFSET;
    const weekStart = adjusted - (adjusted % SECONDS_PER_WEEK);
    return weekStart - THURSDAY_TO_SUNDAY_OFFSET;
  }

  /**
   * Get week end timestamp (Saturday 23:59:59 UTC)
   */
  static getWeekEndTimestamp(weekStart: i64): i64 {
    return weekStart + SECONDS_PER_WEEK - 1;
  }
}

// Volume categorization constants (using strings instead of enums for AssemblyScript)
export const VOLUME_CATEGORY_SMALL = "SMALL";
export const VOLUME_CATEGORY_MEDIUM = "MEDIUM";
export const VOLUME_CATEGORY_LARGE = "LARGE";

export const RATE_CATEGORY_LOW = "LOW";
export const RATE_CATEGORY_MEDIUM = "MEDIUM";
export const RATE_CATEGORY_HIGH = "HIGH";

// Precision multipliers for percentage calculations
export const PERCENTAGE_PRECISION = GraphBN.fromI32(10000); // Store percentages as basis points
export const RATE_PRECISION = GraphBN.fromString("1000000000000000000"); // 18 decimals
