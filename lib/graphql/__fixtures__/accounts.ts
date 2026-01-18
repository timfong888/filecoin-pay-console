/**
 * Mock account fixtures for testing.
 * Provides various account states for testing different scenarios.
 */

import { Account, UserToken, Rail } from '../queries';

/**
 * Create a mock UserToken with USDFC.
 */
export function createMockUserToken(overrides: Partial<UserToken> = {}): UserToken {
  return {
    id: '0x1234-usdfc',
    funds: '1000000000000000000', // 1 USDFC
    lockupCurrent: '500000000000000000', // 0.5 USDFC
    payout: '0',
    lockupRate: '100000000000000', // 0.0001 USDFC per epoch
    ...overrides,
  };
}

/**
 * Create a mock Rail.
 */
export function createMockRail(overrides: Partial<Rail> = {}): Rail {
  return {
    id: 'rail-001',
    totalSettledAmount: '500000000000000000', // 0.5 USDFC
    createdAt: Math.floor(Date.now() / 1000 - 86400 * 7).toString(), // 7 days ago
    state: 'ACTIVE',
    paymentRate: '100000000000000', // 0.0001 USDFC per epoch
    payee: { address: '0xpayee1234567890abcdef' },
    ...overrides,
  };
}

/**
 * Create a mock Account.
 */
export function createMockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: '0x1234567890abcdef1234567890abcdef12345678',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    totalRails: '1',
    userTokens: [createMockUserToken()],
    payerRails: [createMockRail()],
    ...overrides,
  };
}

/**
 * Create an active payer account (has ACTIVE rail AND positive lockupRate).
 */
export function createActivePayerAccount(): Account {
  return createMockAccount({
    id: '0xactivepayer1234567890abcdef12345678',
    address: '0xactivepayer1234567890abcdef12345678',
    userTokens: [
      createMockUserToken({
        lockupRate: '100000000000000', // Positive lockup rate
      }),
    ],
    payerRails: [
      createMockRail({
        state: 'ACTIVE',
      }),
    ],
  });
}

/**
 * Create a churned payer account (all rails TERMINATED).
 */
export function createChurnedPayerAccount(): Account {
  return createMockAccount({
    id: '0xchurnedpayer1234567890abcdef12345678',
    address: '0xchurnedpayer1234567890abcdef12345678',
    userTokens: [
      createMockUserToken({
        lockupRate: '0', // No active lockup
      }),
    ],
    payerRails: [
      createMockRail({
        state: 'TERMINATED',
      }),
      createMockRail({
        id: 'rail-002',
        state: 'TERMINATED',
      }),
    ],
  });
}

/**
 * Create a payer with no rails (edge case).
 */
export function createNoRailsPayerAccount(): Account {
  return createMockAccount({
    id: '0xnorailspayer1234567890abcdef12345678',
    address: '0xnorailspayer1234567890abcdef12345678',
    payerRails: [],
  });
}

/**
 * Create a payer with mixed rail states (at least one ACTIVE).
 */
export function createMixedRailsPayerAccount(): Account {
  return createMockAccount({
    id: '0xmixedpayer1234567890abcdef12345678',
    address: '0xmixedpayer1234567890abcdef12345678',
    userTokens: [
      createMockUserToken({
        lockupRate: '100000000000000',
      }),
    ],
    payerRails: [
      createMockRail({
        state: 'ACTIVE',
      }),
      createMockRail({
        id: 'rail-002',
        state: 'TERMINATED',
      }),
    ],
  });
}

/**
 * Standard set of test accounts with various states.
 */
export const mockAccounts = {
  active: createActivePayerAccount(),
  churned: createChurnedPayerAccount(),
  noRails: createNoRailsPayerAccount(),
  mixed: createMixedRailsPayerAccount(),
};

/**
 * Create a list of accounts for pagination tests.
 */
export function createMockAccountList(count: number): Account[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAccount({
      id: `0xaccount${i.toString().padStart(40, '0')}`,
      address: `0xaccount${i.toString().padStart(40, '0')}`,
      totalRails: (i + 1).toString(),
    })
  );
}
