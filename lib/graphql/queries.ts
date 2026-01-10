import { gql } from 'graphql-request';

// Global metrics query
export const GLOBAL_METRICS_QUERY = gql`
  query GlobalMetrics {
    paymentsMetrics(first: 1) {
      id
      totalRails
      totalAccounts
      uniquePayers
      uniquePayees
      totalActiveRails
      totalTerminatedRails
      totalFilBurned
    }
  }
`;

// Top payers query - accounts ordered by total rails
export const TOP_PAYERS_QUERY = gql`
  query TopPayers($first: Int!) {
    accounts(first: $first, orderBy: totalRails, orderDirection: desc) {
      id
      address
      totalRails
      userTokens {
        id
        funds
        lockupCurrent
        payout
      }
      payerRails(first: 10, orderBy: createdAt, orderDirection: desc) {
        id
        totalSettledAmount
        createdAt
        state
        payee {
          address
        }
      }
    }
  }
`;

// Total settled from all rails
export const TOTAL_SETTLED_QUERY = gql`
  query TotalSettled {
    rails(first: 1000, where: { totalSettledAmount_gt: "0" }) {
      id
      totalSettledAmount
      createdAt
    }
  }
`;

// Daily metrics for sparklines
export const DAILY_METRICS_QUERY = gql`
  query DailyMetrics($first: Int!) {
    dailyMetrics(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      timestamp
      date
      uniquePayers
      uniquePayees
      railsCreated
      railsTerminated
      activeRailsCount
    }
  }
`;

// Top payees query - accounts ordered by total rails received
export const TOP_PAYEES_QUERY = gql`
  query TopPayees($first: Int!) {
    accounts(first: $first, orderBy: totalRails, orderDirection: desc) {
      id
      address
      totalRails
      userTokens {
        id
        funds
        lockupCurrent
        payout
      }
      payeeRails(first: 10, orderBy: createdAt, orderDirection: desc) {
        id
        totalSettledAmount
        createdAt
        state
        payer {
          address
        }
      }
    }
  }
`;

// Single account detail
export const ACCOUNT_DETAIL_QUERY = gql`
  query AccountDetail($id: ID!) {
    account(id: $id) {
      id
      address
      totalRails
      userTokens {
        id
        funds
        lockupCurrent
        lockupRate
        payout
        fundsCollected
        token {
          id
        }
      }
      payerRails {
        id
        totalSettledAmount
        paymentRate
        state
        createdAt
        payee {
          address
        }
      }
      payeeRails {
        id
        totalSettledAmount
        state
        createdAt
        payer {
          address
        }
      }
    }
  }
`;

// Types for query responses
export interface PaymentsMetric {
  id: string;
  totalRails: string;
  totalAccounts: string;
  uniquePayers: string;
  uniquePayees: string;
  totalActiveRails: string;
  totalTerminatedRails: string;
  totalFilBurned: string;
}

export interface UserToken {
  id: string;
  funds: string;
  lockupCurrent: string;
  payout: string;
}

export interface Rail {
  id: string;
  totalSettledAmount: string;
  createdAt: string;
  state: number;
  payee?: { address: string };
  payer?: { address: string };
}

export interface Account {
  id: string;
  address: string;
  totalRails: string;
  userTokens: UserToken[];
  payerRails: Rail[];
  payeeRails?: Rail[];
}

export interface DailyMetric {
  id: string;
  timestamp: string;
  date: string;
  uniquePayers: string;
  uniquePayees: string;
  railsCreated: string;
  railsTerminated: string;
  activeRailsCount: string;
}

export interface GlobalMetricsResponse {
  paymentsMetrics: PaymentsMetric[];
}

export interface TopPayersResponse {
  accounts: Account[];
}

export interface TopPayeesResponse {
  accounts: Account[];
}

export interface TotalSettledResponse {
  rails: Rail[];
}

export interface DailyMetricsResponse {
  dailyMetrics: DailyMetric[];
}
