import { describe, it, expect } from 'vitest';
import {
  weiToUSDC,
  formatCurrency,
  formatAddress,
  calculateRunway,
  calculateRunwayDays,
  formatRunwayDays,
  generateDateRange,
  formatDate,
} from './utils';

describe('weiToUSDC', () => {
  it('converts 0 wei to 0', () => {
    expect(weiToUSDC('0')).toBe(0);
  });

  it('converts 1 USDFC (10^18 wei) correctly', () => {
    expect(weiToUSDC('1000000000000000000')).toBe(1);
  });

  it('converts fractional amounts correctly', () => {
    // 1.5 USDFC = 1.5 * 10^18 wei
    expect(weiToUSDC('1500000000000000000')).toBe(1.5);
  });

  it('converts 2 decimal places correctly', () => {
    // 1.23 USDFC = 1.23 * 10^18 wei
    expect(weiToUSDC('1230000000000000000')).toBe(1.23);
  });

  it('handles large values', () => {
    // 1,000,000 USDFC
    expect(weiToUSDC('1000000000000000000000000')).toBe(1000000);
  });

  it('truncates beyond 2 decimal places', () => {
    // 1.999 USDFC - should truncate to 1.99
    expect(weiToUSDC('1999000000000000000')).toBe(1.99);
  });
});

describe('formatCurrency', () => {
  it('formats small values with dollar sign', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1.5)).toBe('$1.50');
    expect(formatCurrency(999.99)).toBe('$999.99');
  });

  it('formats thousands with K suffix', () => {
    expect(formatCurrency(1000)).toBe('$1.00K');
    expect(formatCurrency(1500)).toBe('$1.50K');
    expect(formatCurrency(999999)).toBe('$1000.00K');
  });

  it('formats millions with M suffix', () => {
    expect(formatCurrency(1000000)).toBe('$1.00M');
    expect(formatCurrency(1500000)).toBe('$1.50M');
    expect(formatCurrency(10000000)).toBe('$10.00M');
  });

  it('handles edge cases at boundaries', () => {
    expect(formatCurrency(999)).toBe('$999.00');
    expect(formatCurrency(1000)).toBe('$1.00K');
    expect(formatCurrency(999999)).toBe('$1000.00K');
    expect(formatCurrency(1000000)).toBe('$1.00M');
  });
});

describe('formatAddress', () => {
  it('truncates long addresses correctly', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    expect(formatAddress(address)).toBe('0x1234...5678');
  });

  it('returns short addresses unchanged', () => {
    expect(formatAddress('0x123456')).toBe('0x123456');
    expect(formatAddress('short')).toBe('short');
  });

  it('handles exactly 10 characters', () => {
    expect(formatAddress('0x12345678')).toBe('0x12345678');
  });

  it('truncates 11+ character addresses', () => {
    expect(formatAddress('0x123456789')).toBe('0x1234...6789');
  });
});

describe('calculateRunway', () => {
  it('returns "-" for zero funds', () => {
    expect(calculateRunway('0', '1000000000000000000')).toBe('-');
  });

  it('returns "-" for zero rate', () => {
    expect(calculateRunway('1000000000000000000', '0')).toBe('-');
  });

  it('returns "-" for empty rate', () => {
    expect(calculateRunway('1000000000000000000', '')).toBe('-');
  });

  it('calculates days correctly', () => {
    // 2880 epochs per day, if rate = 1 wei/epoch and funds = 2880 wei
    // then runway = 1 day
    const funds = (BigInt(2880) * BigInt(30)).toString(); // 30 days worth
    const rate = '1'; // 1 wei per epoch
    expect(calculateRunway(funds, rate)).toBe('30 days');
  });

  it('returns "< 1 day" for very small runway', () => {
    const funds = '100'; // very small
    const rate = '1000000000000000000'; // 1 USDFC per epoch
    expect(calculateRunway(funds, rate)).toBe('< 1 day');
  });
});

describe('calculateRunwayDays', () => {
  it('returns -1 for zero lockup rate', () => {
    expect(calculateRunwayDays(BigInt(1000), BigInt(0))).toBe(-1);
  });

  it('returns -1 for zero funds', () => {
    expect(calculateRunwayDays(BigInt(0), BigInt(1000))).toBe(-1);
  });

  it('returns -1 for negative lockup rate', () => {
    expect(calculateRunwayDays(BigInt(1000), BigInt(-1))).toBe(-1);
  });

  it('calculates days correctly', () => {
    // 2880 epochs per day
    const funds = BigInt(2880) * BigInt(30); // 30 days worth at 1 wei/epoch
    const rate = BigInt(1);
    expect(calculateRunwayDays(funds, rate)).toBe(30);
  });
});

describe('formatRunwayDays', () => {
  it('returns "-" for negative days', () => {
    expect(formatRunwayDays(-1)).toBe('-');
  });

  it('returns "< 1 day" for zero days', () => {
    expect(formatRunwayDays(0)).toBe('< 1 day');
  });

  it('formats days correctly', () => {
    expect(formatRunwayDays(1)).toBe('1 days');
    expect(formatRunwayDays(30)).toBe('30 days');
    expect(formatRunwayDays(365)).toBe('365 days');
  });

  it('formats years and days for > 365 days', () => {
    expect(formatRunwayDays(366)).toBe('1y 1d');
    expect(formatRunwayDays(730)).toBe('2y 0d');
    expect(formatRunwayDays(400)).toBe('1y 35d');
  });
});

describe('generateDateRange', () => {
  it('generates single date for same start and end', () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-01');
    expect(generateDateRange(start, end)).toEqual(['2025-01-01']);
  });

  it('generates correct date range', () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-03');
    expect(generateDateRange(start, end)).toEqual([
      '2025-01-01',
      '2025-01-02',
      '2025-01-03',
    ]);
  });

  it('handles month boundaries', () => {
    const start = new Date('2025-01-30');
    const end = new Date('2025-02-02');
    expect(generateDateRange(start, end)).toEqual([
      '2025-01-30',
      '2025-01-31',
      '2025-02-01',
      '2025-02-02',
    ]);
  });

  it('returns empty array when end is before start', () => {
    const start = new Date('2025-01-05');
    const end = new Date('2025-01-01');
    expect(generateDateRange(start, end)).toEqual([]);
  });
});

describe('formatDate', () => {
  it('formats timestamp correctly', () => {
    // Use noon to avoid timezone edge cases
    const timestamp = new Date('2025-01-15T12:00:00Z').getTime();
    const result = formatDate(timestamp);
    // Result format depends on locale, but should contain "Jan" and "15"
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });

  it('handles different months', () => {
    // Use noon to avoid timezone edge cases
    const timestamp = new Date('2025-12-25T12:00:00Z').getTime();
    const result = formatDate(timestamp);
    expect(result).toContain('Dec');
    expect(result).toContain('25');
  });

  it('formats with year suffix', () => {
    const timestamp = new Date('2026-06-20T12:00:00Z').getTime();
    const result = formatDate(timestamp);
    expect(result).toContain('26');
  });
});
