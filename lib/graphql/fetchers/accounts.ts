/**
 * Account detail fetching and transformation functions.
 */

import { graphqlClient } from '../client';
import {
  ACCOUNT_DETAIL_QUERY,
  AccountDetailResponse,
  Rail,
} from '../queries';
import {
  weiToUSDC,
  formatCurrency,
  formatAddress,
  formatDate,
  secondsToMs,
} from './utils';

/**
 * Rail state mapping.
 */
export const RailState = {
  0: 'Active',
  1: 'Terminated',
  2: 'Pending',
} as const;

/**
 * Rail display format for detail pages.
 */
export interface RailDisplay {
  id: string;
  railId: string;
  counterpartyAddress: string;
  counterpartyFormatted: string;
  counterpartyEnsName?: string;
  payerAddress: string;
  payeeAddress: string;
  settled: string;
  settledRaw: number;
  netPayeeAmount: string;
  netPayeeAmountRaw: number;
  commission: string;
  commissionRaw: number;
  rate: string;
  rateRaw: number;
  state: string;
  stateCode: number;
  settledUpto: string;
  paymentRate: string;
  tokenSymbol: string;
  tokenDecimals: number;
  createdAt: string;
  createdAtTimestamp: number;
}

/**
 * Account detail display format.
 */
export interface AccountDetail {
  address: string;
  ensName?: string;
  totalRails: number;
  totalFunds: string;
  totalFundsRaw: number;
  totalLocked: string;
  totalLockedRaw: number;
  totalSettled: string;
  totalSettledRaw: number;
  totalPayout: string;
  totalPayoutRaw: number;
  payerRails: RailDisplay[];
  payeeRails: RailDisplay[];
}

/**
 * Transform rail to display format.
 */
function transformRailToDisplay(rail: Rail, isPayer: boolean, accountAddress: string): RailDisplay {
  const counterparty = isPayer ? rail.payee?.address : rail.payer?.address;
  const settledValue = weiToUSDC(rail.totalSettledAmount);
  const netPayeeValue = rail.totalNetPayeeAmount ? weiToUSDC(rail.totalNetPayeeAmount) : settledValue;
  const commissionValue = rail.totalCommission ? weiToUSDC(rail.totalCommission) : 0;
  const rateValue = rail.paymentRate ? weiToUSDC(rail.paymentRate) : 0;
  const createdAtMs = secondsToMs(rail.createdAt);

  // Determine payer and payee addresses
  const payerAddress = isPayer ? accountAddress : (rail.payer?.address || '');
  const payeeAddress = isPayer ? (rail.payee?.address || '') : accountAddress;

  // Convert state to number or use string directly (GraphQL may return either)
  let stateNum: number;
  let stateLabel: string;
  if (typeof rail.state === 'string') {
    // Handle string enum values from subgraph
    const stateMap: Record<string, number> = { 'ACTIVE': 0, 'TERMINATED': 1, 'FINALIZED': 2, 'ZERORATE': 3 };
    stateNum = stateMap[rail.state] ?? parseInt(rail.state) ?? -1;
    stateLabel = rail.state === 'ZERORATE' ? 'Zero Rate' :
                 rail.state.charAt(0) + rail.state.slice(1).toLowerCase();
  } else {
    stateNum = rail.state;
    stateLabel = RailState[stateNum as keyof typeof RailState] || 'Unknown';
  }

  return {
    id: rail.id,
    railId: rail.railId || '0',
    counterpartyAddress: counterparty || 'Unknown',
    counterpartyFormatted: counterparty ? formatAddress(counterparty) : 'Unknown',
    payerAddress,
    payeeAddress,
    settled: formatCurrency(settledValue),
    settledRaw: settledValue,
    netPayeeAmount: formatCurrency(netPayeeValue),
    netPayeeAmountRaw: netPayeeValue,
    commission: formatCurrency(commissionValue),
    commissionRaw: commissionValue,
    rate: rateValue > 0 ? `${formatCurrency(rateValue)}/epoch` : '-',
    rateRaw: rateValue,
    state: stateLabel,
    stateCode: stateNum,
    settledUpto: rail.settledUpto || '0',
    paymentRate: rail.paymentRate || '0',
    tokenSymbol: rail.token?.symbol || 'USDFC',
    tokenDecimals: rail.token?.decimals ? parseInt(rail.token.decimals) : 18,
    createdAt: formatDate(createdAtMs),
    createdAtTimestamp: createdAtMs,
  };
}

/**
 * Fetch individual account details.
 */
export async function fetchAccountDetail(address: string): Promise<AccountDetail | null> {
  try {
    // The subgraph uses lowercase address as the ID
    const id = address.toLowerCase();
    const data = await graphqlClient.request<AccountDetailResponse>(ACCOUNT_DETAIL_QUERY, { id });

    if (!data.account) {
      return null;
    }

    const account = data.account;

    // Sum up funds from all userTokens
    let totalFunds = BigInt(0);
    let totalLocked = BigInt(0);
    let totalPayout = BigInt(0);

    for (const token of account.userTokens) {
      totalFunds += BigInt(token.funds);
      totalLocked += BigInt(token.lockupCurrent);
      totalPayout += BigInt(token.payout);
    }

    // Sum up settled from payer rails
    let totalSettled = BigInt(0);
    for (const rail of account.payerRails) {
      totalSettled += BigInt(rail.totalSettledAmount);
    }

    const totalFundsValue = weiToUSDC(totalFunds.toString());
    const totalLockedValue = weiToUSDC(totalLocked.toString());
    const totalSettledValue = weiToUSDC(totalSettled.toString());
    const totalPayoutValue = weiToUSDC(totalPayout.toString());

    return {
      address: account.address,
      totalRails: parseInt(account.totalRails),
      totalFunds: formatCurrency(totalFundsValue),
      totalFundsRaw: totalFundsValue,
      totalLocked: formatCurrency(totalLockedValue),
      totalLockedRaw: totalLockedValue,
      totalSettled: formatCurrency(totalSettledValue),
      totalSettledRaw: totalSettledValue,
      totalPayout: formatCurrency(totalPayoutValue),
      totalPayoutRaw: totalPayoutValue,
      payerRails: account.payerRails.map(rail => transformRailToDisplay(rail, true, account.address)),
      payeeRails: (account.payeeRails || []).map(rail => transformRailToDisplay(rail, false, account.address)),
    };
  } catch (error) {
    console.error('Error fetching account detail:', error);
    throw error;
  }
}
