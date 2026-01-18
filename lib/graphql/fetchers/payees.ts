/**
 * Payee-related data fetching and transformation functions.
 */

import { graphqlClient } from '../client';
import {
  TOP_PAYEES_QUERY,
  TopPayeesResponse,
  Account,
} from '../queries';
import {
  batchFetchPDPData,
  formatDataSize,
} from '../../pdp/fetchers';
import { PDPEnrichment } from '../../pdp/types';
import {
  weiToUSDC,
  formatCurrency,
  formatAddress,
  formatDate,
  secondsToMs,
} from './utils';

/**
 * Payee display interface for tables.
 */
export interface PayeeDisplay {
  address: string;
  fullAddress: string;
  ensName?: string;
  received: string;
  receivedRaw: number;
  payers: number;
  start: string;
  startTimestamp: number;
  pdp: PDPEnrichment | null;
  dataSize: string;
  isStorageProvider: boolean;
}

/**
 * Transform account to payee display format.
 */
function transformAccountToPayee(account: Account, pdpData?: PDPEnrichment | null): PayeeDisplay {
  // Sum up received from all payee rails
  // Use totalNetPayeeAmount (net after fees) for accurate payee totals
  let totalReceived = BigInt(0);
  let earliestDate = Date.now();
  const uniquePayers = new Set<string>();

  for (const rail of account.payeeRails || []) {
    // Prefer totalNetPayeeAmount (net to payee after fees)
    // Fall back to totalSettledAmount if not available
    const amount = rail.totalNetPayeeAmount || rail.totalSettledAmount;
    totalReceived += BigInt(amount);
    const createdAt = secondsToMs(rail.createdAt);
    if (createdAt < earliestDate) {
      earliestDate = createdAt;
    }
    if (rail.payer?.address) {
      uniquePayers.add(rail.payer.address);
    }
  }

  const receivedValue = weiToUSDC(totalReceived.toString());

  return {
    address: formatAddress(account.address),
    fullAddress: account.address,
    received: formatCurrency(receivedValue),
    receivedRaw: receivedValue,
    payers: uniquePayers.size,
    start: formatDate(earliestDate),
    startTimestamp: earliestDate,
    pdp: pdpData || null,
    dataSize: pdpData ? formatDataSize(pdpData.datasetSizeGB) : '-',
    isStorageProvider: pdpData?.isStorageProvider || false,
  };
}

/**
 * Fetch all payees (for payee accounts page).
 * Enriches with PDP data to show storage provider metrics.
 */
export async function fetchAllPayees(limit: number = 100) {
  try {
    const data = await graphqlClient.request<TopPayeesResponse>(TOP_PAYEES_QUERY, { first: limit });

    // Filter to only accounts with payee rails
    const payeeAccounts = data.accounts.filter(
      account => account.payeeRails && account.payeeRails.length > 0
    );

    // Batch fetch PDP data for all payee addresses
    const payeeAddresses = payeeAccounts.map(a => a.address);
    const pdpDataMap = await batchFetchPDPData(payeeAddresses);

    // Transform with PDP enrichment
    return payeeAccounts.map(account => {
      const pdpData = pdpDataMap.get(account.address.toLowerCase());
      return transformAccountToPayee(account, pdpData);
    });
  } catch (error) {
    console.error('Error fetching all payees:', error);
    throw error;
  }
}

/**
 * Fetch all payees without PDP data (faster, for initial load).
 */
export async function fetchAllPayeesBasic(limit: number = 100) {
  try {
    const data = await graphqlClient.request<TopPayeesResponse>(TOP_PAYEES_QUERY, { first: limit });

    return data.accounts
      .filter(account => account.payeeRails && account.payeeRails.length > 0)
      .map(account => transformAccountToPayee(account, null));
  } catch (error) {
    console.error('Error fetching all payees:', error);
    throw error;
  }
}

/**
 * Enrich existing payees with PDP data (for progressive loading).
 */
export async function enrichPayeesWithPDP(payees: PayeeDisplay[]): Promise<PayeeDisplay[]> {
  const addresses = payees.map(p => p.fullAddress);
  const pdpDataMap = await batchFetchPDPData(addresses);

  return payees.map(payee => {
    const pdpData = pdpDataMap.get(payee.fullAddress.toLowerCase());
    if (pdpData) {
      return {
        ...payee,
        pdp: pdpData,
        dataSize: formatDataSize(pdpData.datasetSizeGB),
        isStorageProvider: pdpData.isStorageProvider,
      };
    }
    return payee;
  });
}
