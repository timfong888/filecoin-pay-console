import { networkConfig } from '../config/network';

// Filecoin Pay Payments Contract (FWSS)
export const PAYMENTS_CONTRACT_ADDRESS = networkConfig.contracts.FWSS as `0x${string}`;

// Settlement fee in wei (~0.0013 FIL)
export const SETTLEMENT_FEE = BigInt("1300000000000000");

// Payments contract ABI (subset for settle functionality)
export const paymentsAbi = [
  {
    type: "function",
    inputs: [
      { name: "railId", internalType: "uint256", type: "uint256" },
      { name: "untilEpoch", internalType: "uint256", type: "uint256" },
    ],
    name: "settleRail",
    outputs: [
      { name: "totalSettledAmount", internalType: "uint256", type: "uint256" },
      { name: "totalNetPayeeAmount", internalType: "uint256", type: "uint256" },
      { name: "totalOperatorCommission", internalType: "uint256", type: "uint256" },
      { name: "finalSettledEpoch", internalType: "uint256", type: "uint256" },
      { name: "note", internalType: "string", type: "string" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "to", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "railId", internalType: "uint256", type: "uint256" }],
    name: "terminateRail",
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
