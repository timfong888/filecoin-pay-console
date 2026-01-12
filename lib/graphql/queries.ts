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
        lockupRate
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

// Active rails for run rate calculation
// Note: Subgraph uses RailState enum: ACTIVE, TERMINATED, FINALIZED, ZERORATE
export const ACTIVE_RAILS_QUERY = gql`
  query ActiveRails {
    rails(first: 1000, where: { state: ACTIVE }) {
      id
      paymentRate
      state
    }
  }
`;

// Payer accounts with their first rail creation date (for cumulative chart)
export const PAYER_FIRST_ACTIVITY_QUERY = gql`
  query PayerFirstActivity {
    accounts(first: 1000, where: { payerRails_: { id_not: null } }) {
      id
      payerRails(first: 1, orderBy: createdAt, orderDirection: asc) {
        createdAt
      }
    }
  }
`;

export interface PayerFirstActivityResponse {
  accounts: Array<{
    id: string;
    payerRails: Array<{ createdAt: string }>;
  }>;
}

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
        fundsCollected
      }
      payeeRails(first: 100, orderBy: createdAt, orderDirection: desc) {
        id
        totalSettledAmount
        totalNetPayeeAmount
        totalCommission
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
        totalNetPayeeAmount
        totalCommission
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
        totalNetPayeeAmount
        totalCommission
        paymentRate
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
  lockupRate?: string;
  fundsCollected?: string;
  token?: { id: string };
}

export interface Rail {
  id: string;
  totalSettledAmount: string;
  totalNetPayeeAmount?: string;
  totalCommission?: string;
  createdAt: string;
  state: number | string;
  paymentRate?: string;
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

export interface ActiveRailsResponse {
  rails: Rail[];
}

export interface DailyMetricsResponse {
  dailyMetrics: DailyMetric[];
}

export interface AccountDetailResponse {
  account: Account | null;
}

// Recent settlements query (for Settled 7d metric)
export const RECENT_SETTLEMENTS_QUERY = gql`
  query RecentSettlements($since: BigInt!) {
    settlements(
      first: 1000
      where: { timestamp_gte: $since }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      totalSettledAmount
      timestamp
      rail {
        id
        payer {
          address
        }
        payee {
          address
        }
      }
    }
  }
`;

export interface Settlement {
  id: string;
  totalSettledAmount: string;
  timestamp: string;
  rail: {
    id: string;
    payer: { address: string };
    payee: { address: string };
  };
}

export interface RecentSettlementsResponse {
  settlements: Settlement[];
}
