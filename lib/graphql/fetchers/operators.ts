/**
 * Operator-related data fetching and transformation functions.
 */

import { graphqlClient } from '../client';
import {
  OPERATORS_QUERY,
  OperatorsResponse,
  Operator,
} from '../queries';
import {
  weiToUSDC,
  formatCurrency,
  formatAddress,
  formatFIL,
} from './utils';

/**
 * Operator display interface for the breakdown table.
 */
export interface OperatorDisplay {
  address: string;
  fullAddress: string;
  activeRails: number;
  totalRails: number;
  uniquePayers: number;
  settledUSDFC: string;
  settledUSDFCRaw: number;
  settledFIL: string;
  settledFILRaw: number;
}

/**
 * Transform an Operator entity into the display format.
 */
function transformOperator(operator: Operator): OperatorDisplay {
  // Sum settled amounts by token
  let settledUSDFC = BigInt(0);
  let settledFIL = BigInt(0);

  for (const ot of operator.operatorTokens) {
    if (ot.token.symbol === 'USDFC') {
      settledUSDFC += BigInt(ot.settledAmount);
    } else if (ot.token.symbol === 'FIL') {
      settledFIL += BigInt(ot.settledAmount);
    }
  }

  // Count active rails and unique payers from rails
  let activeRails = 0;
  const payerAddresses = new Set<string>();

  for (const rail of operator.rails) {
    if (rail.state === 'ACTIVE' || rail.state === 0) {
      activeRails++;
    }
    payerAddresses.add(rail.payer.address.toLowerCase());
  }

  const settledUSDFCRaw = weiToUSDC(settledUSDFC.toString());
  const settledFILRaw = weiToUSDC(settledFIL.toString());

  return {
    address: formatAddress(operator.address),
    fullAddress: operator.address,
    activeRails,
    totalRails: parseInt(operator.totalRails),
    uniquePayers: payerAddresses.size,
    settledUSDFC: formatCurrency(settledUSDFCRaw),
    settledUSDFCRaw,
    settledFIL: settledFILRaw > 0 ? formatFIL(settledFIL.toString()) : '-',
    settledFILRaw,
  };
}

/**
 * Fetch all operators with breakdown data.
 */
export async function fetchOperators(): Promise<OperatorDisplay[]> {
  try {
    const data = await graphqlClient.request<OperatorsResponse>(OPERATORS_QUERY);
    return data.operators.map(transformOperator);
  } catch (error) {
    console.error('Error fetching operators:', error);
    return [];
  }
}
