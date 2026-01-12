import { Address, BigInt as GraphBN, Bytes } from "@graphprotocol/graph-ts";
import { Rail, WeeklyActivePayer, WeeklyActivePayee } from "../../../generated/schema";
import { ONE_BIG_INT, ZERO_BIG_INT, DateHelpers } from "./constants";
import { MetricsEntityManager } from "./core";

// Base collector interface for consistency
export abstract class BaseMetricsCollector {
  protected timestamp: GraphBN;
  protected blockNumber: GraphBN;

  constructor(timestamp: GraphBN, blockNumber: GraphBN) {
    this.timestamp = timestamp;
    this.blockNumber = blockNumber;
  }

  abstract collect(): void;
}

// Rail Creation Metrics Collector
export class RailCreationCollector extends BaseMetricsCollector {
  private rail: Rail;
  private payerAddress: Bytes;
  private payeeAddress: Bytes;
  private newAccounts: GraphBN;
  private isNewPayer: boolean;
  private isNewPayee: boolean;
  private isNewOperator: boolean;

  constructor(
    rail: Rail,
    payerAddress: Bytes,
    payeeAddress: Bytes,
    newAccounts: GraphBN,
    isNewPayer: boolean,
    isNewPayee: boolean,
    isNewOperator: boolean,
    timestamp: GraphBN,
    blockNumber: GraphBN,
  ) {
    super(timestamp, blockNumber);
    this.rail = rail;
    this.payerAddress = payerAddress;
    this.payeeAddress = payeeAddress;
    this.newAccounts = newAccounts;
    this.isNewPayer = isNewPayer;
    this.isNewPayee = isNewPayee;
    this.isNewOperator = isNewOperator;
  }

  collect(): void {
    this.updateDailyMetrics();
    this.updateWeeklyMetrics();
    this.updateTokenMetrics();
    this.updateOperatorMetrics();
    this.updateNetworkMetrics();
  }

  private updateDailyMetrics(): void {
    const dailyMetric = MetricsEntityManager.loadOrCreateDailyMetric(this.timestamp);

    dailyMetric.railsCreated = dailyMetric.railsCreated.plus(ONE_BIG_INT);

    // Track first-time-ever new accounts and operators
    dailyMetric.newAccounts = dailyMetric.newAccounts.plus(this.newAccounts);
    if (this.isNewOperator) {
      dailyMetric.newOperators = dailyMetric.newOperators.plus(ONE_BIG_INT);
    }

    dailyMetric.save();
  }

  private updateWeeklyMetrics(): void {
    const weeklyMetric = MetricsEntityManager.loadOrCreateWeeklyMetric(this.timestamp);
    const weekStart = DateHelpers.getWeekStartTimestamp(this.timestamp.toI64());

    weeklyMetric.railsCreated = weeklyMetric.railsCreated.plus(ONE_BIG_INT);
    weeklyMetric.uniqueAccounts = weeklyMetric.uniqueAccounts.plus(this.newAccounts);

    // Track per-week unique payers using helper entity
    const weeklyPayerId = weekStart.toString() + "-" + this.payerAddress.toHexString();
    let weeklyPayer = WeeklyActivePayer.load(weeklyPayerId);
    if (weeklyPayer == null) {
      // First rail by this payer THIS WEEK
      weeklyPayer = new WeeklyActivePayer(weeklyPayerId);
      weeklyPayer.weekStart = GraphBN.fromI64(weekStart);
      weeklyPayer.payer = this.payerAddress;
      weeklyPayer.save();

      weeklyMetric.uniqueActivePayers = weeklyMetric.uniqueActivePayers.plus(ONE_BIG_INT);
    }

    // Track per-week unique payees using helper entity
    const weeklyPayeeId = weekStart.toString() + "-" + this.payeeAddress.toHexString();
    let weeklyPayee = WeeklyActivePayee.load(weeklyPayeeId);
    if (weeklyPayee == null) {
      // First rail received by this payee THIS WEEK
      weeklyPayee = new WeeklyActivePayee(weeklyPayeeId);
      weeklyPayee.weekStart = GraphBN.fromI64(weekStart);
      weeklyPayee.payee = this.payeeAddress;
      weeklyPayee.save();

      weeklyMetric.uniqueActivePayees = weeklyMetric.uniqueActivePayees.plus(ONE_BIG_INT);
    }

    // Track first-time-ever payers/payees (legacy counts)
    if (this.isNewPayer) {
      weeklyMetric.newPayers = weeklyMetric.newPayers.plus(ONE_BIG_INT);
    }
    if (this.isNewPayee) {
      weeklyMetric.newPayees = weeklyMetric.newPayees.plus(ONE_BIG_INT);
    }
    if (this.isNewOperator) {
      weeklyMetric.uniqueOperators = weeklyMetric.uniqueOperators.plus(ONE_BIG_INT);
    }

    weeklyMetric.save();
  }

  private updateTokenMetrics(): void {
    // Daily token metrics
    const tokenMetric = MetricsEntityManager.loadOrCreateTokenMetric(
      Address.fromBytes(this.rail.token),
      this.timestamp,
    );

    tokenMetric.activeRailsCount = tokenMetric.activeRailsCount.plus(ONE_BIG_INT);

    tokenMetric.save();

    // Weekly token metrics
    const weeklyTokenMetric = MetricsEntityManager.loadOrCreateWeeklyTokenMetric(
      Address.fromBytes(this.rail.token),
      this.timestamp,
    );

    weeklyTokenMetric.activeRailsCount = weeklyTokenMetric.activeRailsCount.plus(ONE_BIG_INT);

    weeklyTokenMetric.save();
  }

  private updateOperatorMetrics(): void {
    const operatorMetric = MetricsEntityManager.loadOrCreateOperatorMetric(
      Address.fromBytes(this.rail.operator),
      this.timestamp,
    );

    operatorMetric.railsCreated = operatorMetric.railsCreated.plus(ONE_BIG_INT);

    const uniqueClients = (this.isNewPayee ? 1 : 0) + (this.isNewPayer ? 1 : 0);
    operatorMetric.uniqueClients = operatorMetric.uniqueClients.plus(GraphBN.fromI32(uniqueClients));

    operatorMetric.save();
  }

  private updateNetworkMetrics(): void {
    const networkMetric = MetricsEntityManager.loadOrCreatePaymentsMetric();

    networkMetric.totalRails = networkMetric.totalRails.plus(ONE_BIG_INT);
    networkMetric.totalZeroRateRails = networkMetric.totalZeroRateRails.plus(ONE_BIG_INT);
    networkMetric.totalAccounts = networkMetric.totalAccounts.plus(this.newAccounts);

    if (this.isNewPayee) {
      networkMetric.uniquePayees = networkMetric.uniquePayees.plus(ONE_BIG_INT);
    }

    if (this.isNewPayer) {
      networkMetric.uniquePayers = networkMetric.uniquePayers.plus(ONE_BIG_INT);
    }

    networkMetric.save();
  }
}

// Settlement Metrics Collector
export class SettlementCollector extends BaseMetricsCollector {
  private rail: Rail;
  private totalSettledAmount: GraphBN;
  private totalNetPayeeAmount: GraphBN;
  private operatorCommission: GraphBN;
  private filBurned: GraphBN;

  constructor(
    rail: Rail,
    totalSettledAmount: GraphBN,
    totalNetPayeeAmount: GraphBN,
    operatorCommission: GraphBN,
    filBurned: GraphBN,
    timestamp: GraphBN,
    blockNumber: GraphBN,
  ) {
    super(timestamp, blockNumber);
    this.rail = rail;
    this.totalSettledAmount = totalSettledAmount;
    this.totalNetPayeeAmount = totalNetPayeeAmount;
    this.operatorCommission = operatorCommission;
    this.filBurned = filBurned;
  }

  collect(): void {
    this.updateVolumeMetrics();
    this.updateOperatorMetrics();
    this.updateTokenMetrics();
    this.updateNetworkMetrics();
  }

  private updateVolumeMetrics(): void {
    // Daily metrics
    const dailyMetric = MetricsEntityManager.loadOrCreateDailyMetric(this.timestamp);
    dailyMetric.totalRailSettlements = dailyMetric.totalRailSettlements.plus(ONE_BIG_INT);
    dailyMetric.filBurned = dailyMetric.filBurned.plus(this.filBurned);
    dailyMetric.save();

    // Weekly metrics
    const weeklyMetric = MetricsEntityManager.loadOrCreateWeeklyMetric(this.timestamp);
    weeklyMetric.totalRailSettlements = weeklyMetric.totalRailSettlements.plus(ONE_BIG_INT);
    weeklyMetric.filBurned = weeklyMetric.filBurned.plus(this.filBurned);
    weeklyMetric.save();
  }

  private updateOperatorMetrics(): void {
    const operatorMetric = MetricsEntityManager.loadOrCreateOperatorMetric(
      Address.fromBytes(this.rail.operator),
      this.timestamp,
    );

    operatorMetric.settlementsProcessed = operatorMetric.settlementsProcessed.plus(ONE_BIG_INT);

    operatorMetric.save();
  }

  private updateTokenMetrics(): void {
    // Daily token metrics
    const tokenMetric = MetricsEntityManager.loadOrCreateTokenMetric(
      Address.fromBytes(this.rail.token),
      this.timestamp,
    );

    tokenMetric.volume = tokenMetric.volume.plus(this.totalSettledAmount);
    tokenMetric.settledAmount = tokenMetric.settledAmount.plus(this.totalNetPayeeAmount);
    tokenMetric.commissionPaid = tokenMetric.commissionPaid.plus(this.operatorCommission);

    tokenMetric.save();

    // Weekly token metrics
    const weeklyTokenMetric = MetricsEntityManager.loadOrCreateWeeklyTokenMetric(
      Address.fromBytes(this.rail.token),
      this.timestamp,
    );

    weeklyTokenMetric.volume = weeklyTokenMetric.volume.plus(this.totalSettledAmount);
    weeklyTokenMetric.settledAmount = weeklyTokenMetric.settledAmount.plus(this.totalNetPayeeAmount);
    weeklyTokenMetric.commissionPaid = weeklyTokenMetric.commissionPaid.plus(this.operatorCommission);

    weeklyTokenMetric.save();
  }

  private updateNetworkMetrics(): void {
    const networkMetric = MetricsEntityManager.loadOrCreatePaymentsMetric();

    networkMetric.totalFilBurned = networkMetric.totalFilBurned.plus(this.filBurned);

    networkMetric.save();
  }
}

// Rail State Change Collector
export class RailStateChangeCollector extends BaseMetricsCollector {
  private previousState: string;
  private newState: string;

  constructor(previousState: string, newState: string, timestamp: GraphBN, blockNumber: GraphBN) {
    super(timestamp, blockNumber);
    this.previousState = previousState;
    this.newState = newState;
  }

  collect(): void {
    if (this.previousState === this.newState) return;
    this.updateDailyAndWeeklyStateMetrics();
    this.updateNetworkStateMetrics();
  }

  private updateDailyAndWeeklyStateMetrics(): void {
    const dailyMetric = MetricsEntityManager.loadOrCreateDailyMetric(this.timestamp);
    const weeklyMetric = MetricsEntityManager.loadOrCreateWeeklyMetric(this.timestamp);

    if (this.newState === "TERMINATED") {
      dailyMetric.railsTerminated = dailyMetric.railsTerminated.plus(ONE_BIG_INT);
      weeklyMetric.railsTerminated = weeklyMetric.railsTerminated.plus(ONE_BIG_INT);
    } else if (this.newState === "FINALIZED") {
      dailyMetric.railsFinalized = dailyMetric.railsFinalized.plus(ONE_BIG_INT);
      weeklyMetric.railsFinalized = weeklyMetric.railsFinalized.plus(ONE_BIG_INT);
    } else if (this.newState === "ACTIVE") {
      dailyMetric.activeRailsCount = dailyMetric.activeRailsCount.plus(ONE_BIG_INT);
      weeklyMetric.activeRailsCount = weeklyMetric.activeRailsCount.plus(ONE_BIG_INT);
    }

    dailyMetric.save();
    weeklyMetric.save();
  }

  private updateNetworkStateMetrics(): void {
    const networkMetric = MetricsEntityManager.loadOrCreatePaymentsMetric();

    if (this.newState === "TERMINATED") {
      networkMetric.totalTerminatedRails = networkMetric.totalTerminatedRails.plus(ONE_BIG_INT);
      networkMetric.totalActiveRails = networkMetric.totalActiveRails.minus(ONE_BIG_INT);
    } else if (this.newState === "FINALIZED") {
      networkMetric.totalFinalizedRails = networkMetric.totalFinalizedRails.plus(ONE_BIG_INT);
      networkMetric.totalTerminatedRails = networkMetric.totalTerminatedRails.minus(ONE_BIG_INT);
    } else if (this.newState === "ACTIVE" && this.previousState === "ZERORATE") {
      networkMetric.totalZeroRateRails = networkMetric.totalZeroRateRails.minus(ONE_BIG_INT);
      networkMetric.totalActiveRails = networkMetric.totalActiveRails.plus(ONE_BIG_INT);
    } else if (this.newState === "ZERORATE" && this.previousState === "") {
      // already updated in RailCreationCollector
    }

    networkMetric.save();
  }
}

// Token Activity Collector (for deposits/withdrawals)
export class TokenActivityCollector extends BaseMetricsCollector {
  private tokenAddress: Address;
  private amount: GraphBN;
  private isDeposit: boolean;
  private isNewAccount: boolean;
  private isNewToken: boolean;

  constructor(
    tokenAddress: Address,
    amount: GraphBN,
    isDeposit: boolean,
    isNewAccount: boolean,
    isNewToken: boolean,
    timestamp: GraphBN,
    blockNumber: GraphBN,
  ) {
    super(timestamp, blockNumber);
    this.tokenAddress = tokenAddress;
    this.amount = amount;
    this.isDeposit = isDeposit;
    this.isNewAccount = isNewAccount;
    this.isNewToken = isNewToken;
  }

  collect(): void {
    this.updateTokenMetrics();
    this.updateNetworkMetrics();
    this.updateDailyMetrics();
  }

  private updateDailyMetrics(): void {
    const dailyMetric = MetricsEntityManager.loadOrCreateDailyMetric(this.timestamp);
    if (this.isNewAccount) {
      dailyMetric.newAccounts = dailyMetric.newAccounts.plus(ONE_BIG_INT);
    }
    dailyMetric.save();
  }

  private updateTokenMetrics(): void {
    // Daily token metrics
    const tokenMetric = MetricsEntityManager.loadOrCreateTokenMetric(this.tokenAddress, this.timestamp);
    tokenMetric.volume = tokenMetric.volume.plus(this.amount);

    if (this.isDeposit) {
      tokenMetric.deposit = tokenMetric.deposit.plus(this.amount);
    } else {
      tokenMetric.withdrawal = tokenMetric.withdrawal.plus(this.amount);
    }

    if (this.isNewAccount) {
      tokenMetric.uniqueHolders = tokenMetric.uniqueHolders.plus(ONE_BIG_INT);
    }

    tokenMetric.save();

    // Weekly token metrics
    const weeklyTokenMetric = MetricsEntityManager.loadOrCreateWeeklyTokenMetric(this.tokenAddress, this.timestamp);
    weeklyTokenMetric.volume = weeklyTokenMetric.volume.plus(this.amount);

    if (this.isDeposit) {
      weeklyTokenMetric.deposit = weeklyTokenMetric.deposit.plus(this.amount);
    } else {
      weeklyTokenMetric.withdrawal = weeklyTokenMetric.withdrawal.plus(this.amount);
    }

    if (this.isNewAccount) {
      weeklyTokenMetric.uniqueHolders = weeklyTokenMetric.uniqueHolders.plus(ONE_BIG_INT);
    }

    weeklyTokenMetric.save();
  }

  private updateNetworkMetrics(): void {
    const networkMetric = MetricsEntityManager.loadOrCreatePaymentsMetric();
    if (this.isNewAccount) {
      networkMetric.totalAccounts = networkMetric.totalAccounts.plus(ONE_BIG_INT);
    }

    if (this.isNewToken) {
      networkMetric.totalTokens = networkMetric.totalTokens.plus(ONE_BIG_INT);
    }

    networkMetric.save();
  }
}

// Operator Approval Collector
export class OperatorApprovalCollector extends BaseMetricsCollector {
  private operatorAddress: Address;
  private isNewApproval: boolean;
  private isNewOperator: boolean;

  constructor(
    operatorAddress: Address,
    isNewApproval: boolean,
    isNewOperator: boolean,
    timestamp: GraphBN,
    blockNumber: GraphBN,
  ) {
    super(timestamp, blockNumber);
    this.operatorAddress = operatorAddress;
    this.isNewApproval = isNewApproval;
    this.isNewOperator = isNewOperator;
  }

  collect(): void {
    this.updateOperatorMetrics();
    this.updateNetworkMetrics();
  }

  private updateOperatorMetrics(): void {
    const operatorMetric = MetricsEntityManager.loadOrCreateOperatorMetric(this.operatorAddress, this.timestamp);

    if (this.isNewApproval) {
      operatorMetric.totalApprovals = operatorMetric.totalApprovals.plus(ONE_BIG_INT);
      operatorMetric.save();
    }
  }

  private updateNetworkMetrics(): void {
    if (this.isNewOperator) {
      const networkMetric = MetricsEntityManager.loadOrCreatePaymentsMetric();
      networkMetric.totalOperators = networkMetric.totalOperators.plus(ONE_BIG_INT);
      networkMetric.save();
    }
  }
}

// One Time Payment Collector
export class OneTimePaymentCollector extends BaseMetricsCollector {
  private networkFee: GraphBN;

  constructor(networkFee: GraphBN, timestamp: GraphBN, blockNumber: GraphBN) {
    super(timestamp, blockNumber);
    this.networkFee = networkFee;
  }

  collect(): void {
    this.updateNetworkMetrics();
  }

  private updateNetworkMetrics(): void {
    const networkMetric = MetricsEntityManager.loadOrCreatePaymentsMetric();
    networkMetric.totalFilBurned = networkMetric.totalFilBurned.plus(this.networkFee);
  }
}

// Metrics Collection Orchestrator
export class MetricsCollectionOrchestrator {
  static collectRailCreationMetrics(
    rail: Rail,
    payerAddress: Bytes,
    payeeAddress: Bytes,
    newAccounts: GraphBN,
    isNewPayer: boolean,
    isNewPayee: boolean,
    isNewOperator: boolean,
    timestamp: GraphBN,
    blockNumber: GraphBN,
  ): void {
    const collector = new RailCreationCollector(
      rail,
      payerAddress,
      payeeAddress,
      newAccounts,
      isNewPayer,
      isNewPayee,
      isNewOperator,
      timestamp,
      blockNumber,
    );
    collector.collect();
  }

  static collectSettlementMetrics(
    rail: Rail,
    totalSettledAmount: GraphBN,
    totalNetPayeeAmount: GraphBN,
    operatorCommission: GraphBN,
    paymentFees: GraphBN,
    timestamp: GraphBN,
    blockNumber: GraphBN,
  ): void {
    const collector = new SettlementCollector(
      rail,
      totalSettledAmount,
      totalNetPayeeAmount,
      operatorCommission,
      paymentFees,
      timestamp,
      blockNumber,
    );
    collector.collect();
  }

  static collectRailStateChangeMetrics(
    previousState: string,
    newState: string,
    timestamp: GraphBN,
    blockNumber: GraphBN,
  ): void {
    const collector = new RailStateChangeCollector(previousState, newState, timestamp, blockNumber);
    collector.collect();
  }

  static collectTokenActivityMetrics(
    tokenAddress: Address,
    amount: GraphBN,
    isDeposit: boolean,
    isNewAccount: boolean,
    isNewToken: boolean,
    timestamp: GraphBN,
    blockNumber: GraphBN,
  ): void {
    const collector = new TokenActivityCollector(
      tokenAddress,
      amount,
      isDeposit,
      isNewAccount,
      isNewToken,
      timestamp,
      blockNumber,
    );
    collector.collect();
  }

  static collectOperatorApprovalMetrics(
    operatorAddress: Address,
    isNewApproval: boolean,
    isNewOperator: boolean,
    timestamp: GraphBN,
    blockNumber: GraphBN,
  ): void {
    const collector = new OperatorApprovalCollector(
      operatorAddress,
      isNewApproval,
      isNewOperator,
      timestamp,
      blockNumber,
    );
    collector.collect();
  }

  static collectOneTimePaymentMetrics(networkFee: GraphBN, timestamp: GraphBN, blockNumber: GraphBN): void {
    const collector = new OneTimePaymentCollector(networkFee, timestamp, blockNumber);
    collector.collect();
  }
}
