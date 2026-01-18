/**
 * Unit tests for payee fetching functions.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server, setupMSW, resetMSW, cleanupMSW } from '../__mocks__/setup';
import { createEmptyHandler } from '../__mocks__/handlers';
import {
  fetchAllPayees,
  fetchAllPayeesBasic,
  enrichPayeesWithPDP,
} from './payees';

beforeAll(() => setupMSW());
afterEach(() => resetMSW());
afterAll(() => cleanupMSW());

describe('fetchAllPayeesBasic', () => {
  it('returns array of payee displays', async () => {
    const result = await fetchAllPayeesBasic(100);

    expect(Array.isArray(result)).toBe(true);
  });

  it('includes required payee fields', async () => {
    const result = await fetchAllPayeesBasic(10);

    if (result.length > 0) {
      const payee = result[0];
      expect(payee).toHaveProperty('address');
      expect(payee).toHaveProperty('fullAddress');
      expect(payee).toHaveProperty('received');
      expect(payee).toHaveProperty('receivedRaw');
      expect(payee).toHaveProperty('payers');
      expect(payee).toHaveProperty('start');
      expect(payee).toHaveProperty('startTimestamp');
    }
  });

  it('returns empty array when no payees', async () => {
    server.use(createEmptyHandler('TopPayees'));

    const result = await fetchAllPayeesBasic(100);

    expect(result).toEqual([]);
  });

  it('formats currency correctly', async () => {
    const result = await fetchAllPayeesBasic(10);

    if (result.length > 0) {
      const payee = result[0];
      expect(payee.received).toMatch(/^\$/);
    }
  });

  it('does not include PDP data by default', async () => {
    const result = await fetchAllPayeesBasic(10);

    if (result.length > 0) {
      const payee = result[0];
      expect(payee.pdp).toBeNull();
      expect(payee.isStorageProvider).toBe(false);
    }
  });
});

describe('fetchAllPayees', () => {
  it('returns array of payee displays with PDP enrichment', async () => {
    const result = await fetchAllPayees(100);

    expect(Array.isArray(result)).toBe(true);
  });

  it('includes PDP fields', async () => {
    const result = await fetchAllPayees(10);

    if (result.length > 0) {
      const payee = result[0];
      expect(payee).toHaveProperty('pdp');
      expect(payee).toHaveProperty('dataSize');
      expect(payee).toHaveProperty('isStorageProvider');
    }
  });
});

describe('enrichPayeesWithPDP', () => {
  it('enriches payees with PDP data', async () => {
    // Get basic payees first
    const basicPayees = await fetchAllPayeesBasic(10);

    // Enrich with PDP data
    const enrichedPayees = await enrichPayeesWithPDP(basicPayees);

    expect(enrichedPayees.length).toBe(basicPayees.length);
    for (const payee of enrichedPayees) {
      expect(payee).toHaveProperty('pdp');
      expect(payee).toHaveProperty('dataSize');
      expect(payee).toHaveProperty('isStorageProvider');
    }
  });

  it('handles empty array', async () => {
    const result = await enrichPayeesWithPDP([]);

    expect(result).toEqual([]);
  });

  it('preserves existing payee data', async () => {
    const basicPayees = await fetchAllPayeesBasic(5);

    if (basicPayees.length > 0) {
      const originalAddress = basicPayees[0].fullAddress;
      const originalReceived = basicPayees[0].receivedRaw;

      const enrichedPayees = await enrichPayeesWithPDP(basicPayees);

      expect(enrichedPayees[0].fullAddress).toBe(originalAddress);
      expect(enrichedPayees[0].receivedRaw).toBe(originalReceived);
    }
  });
});
