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
 * Check if a rail state represents ACTIVE.
 * Subgraph returns state as string 'ACTIVE' or numeric 0 depending on query context.
 */
function isRailActive(state: string | number): boolean {
  return state === 'ACTIVE' || state === 0;
}

/**
 * Convert wei (18 decimals) to a human-readable number.
 * Both USDFC and FIL use 18 decimals; weiToUSDC is a generic converter.
 */
const weiToDecimal = weiToUSDC;

/**
 * Format a FIL amount for display from a numeric value.
 */
function formatFILValue(value: number): string {
  return `${value.toFixed(2)} FIL`;
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
    if (isRailActive(rail.state)) {
      activeRails++;
    }
    payerAddresses.add(rail.payer.address.toLowerCase());
  }

  const settledUSDFCRaw = weiToDecimal(settledUSDFC.toString());
  const settledFILRaw = weiToDecimal(settledFIL.toString());

  return {
    address: formatAddress(operator.address),
    fullAddress: operator.address,
    activeRails,
    totalRails: parseInt(operator.totalRails),
    uniquePayers: payerAddresses.size,
    settledUSDFC: formatCurrency(settledUSDFCRaw),
    settledUSDFCRaw,
    settledFIL: settledFILRaw > 0 ? formatFILValue(settledFILRaw) : '-',
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
