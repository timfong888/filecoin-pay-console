/**
 * Mock rail fixtures for testing.
 * Provides various rail states and configurations.
 */

import { Rail } from '../queries';

/**
 * Rail states as defined in the subgraph schema.
 */
export const RailState = {
  ACTIVE: 'ACTIVE',
  TERMINATED: 'TERMINATED',
  FINALIZED: 'FINALIZED',
  ZERORATE: 'ZERORATE',
} as const;

/**
 * Create a mock active rail.
 */
export function createActiveRail(overrides: Partial<Rail> = {}): Rail {
  return {
    id: 'rail-active-001',
    totalSettledAmount: '5000000000000000000', // 5 USDFC
    createdAt: Math.floor(Date.now() / 1000 - 86400 * 30).toString(), // 30 days ago
    state: RailState.ACTIVE,
    paymentRate: '100000000000000', // 0.0001 USDFC per epoch
    payee: { address: '0xpayeeactive1234567890abcdef12345' },
    ...overrides,
  };
}

/**
 * Create a mock terminated rail.
 */
export function createTerminatedRail(overrides: Partial<Rail> = {}): Rail {
  return {
    id: 'rail-terminated-001',
    totalSettledAmount: '2000000000000000000', // 2 USDFC
    createdAt: Math.floor(Date.now() / 1000 - 86400 * 60).toString(), // 60 days ago
    state: RailState.TERMINATED,
    paymentRate: '0',
    payee: { address: '0xpayeeterminated1234567890abcdef' },
    ...overrides,
  };
}

/**
 * Create a mock zero-rate rail.
 */
export function createZeroRateRail(overrides: Partial<Rail> = {}): Rail {
  return {
    id: 'rail-zerorate-001',
    totalSettledAmount: '1000000000000000000', // 1 USDFC
    createdAt: Math.floor(Date.now() / 1000 - 86400 * 14).toString(), // 14 days ago
    state: RailState.ZERORATE,
    paymentRate: '0',
    payee: { address: '0xpayeezerorate1234567890abcdef12' },
    ...overrides,
  };
}

/**
 * Create rails for total settled calculation tests.
 */
export function createSettledRails(): Rail[] {
  return [
    createActiveRail({
      id: 'rail-settled-001',
      totalSettledAmount: '10000000000000000000', // 10 USDFC
    }),
    createActiveRail({
      id: 'rail-settled-002',
      totalSettledAmount: '5000000000000000000', // 5 USDFC
    }),
    createTerminatedRail({
      id: 'rail-settled-003',
      totalSettledAmount: '3000000000000000000', // 3 USDFC
    }),
  ];
}

/**
 * Create active rails for run rate calculation tests.
 */
export function createRunRateRails(): Rail[] {
  return [
    createActiveRail({
      id: 'rail-runrate-001',
      paymentRate: '100000000000000', // 0.0001 USDFC per epoch
    }),
    createActiveRail({
      id: 'rail-runrate-002',
      paymentRate: '200000000000000', // 0.0002 USDFC per epoch
    }),
    createActiveRail({
      id: 'rail-runrate-003',
      paymentRate: '150000000000000', // 0.00015 USDFC per epoch
    }),
  ];
}

/**
 * Mock responses for rail queries.
 */
export const mockRailResponses = {
  totalSettled: {
    rails: createSettledRails(),
  },
  activeRails: {
    rails: createRunRateRails(),
  },
  emptyRails: {
    rails: [],
  },
};
