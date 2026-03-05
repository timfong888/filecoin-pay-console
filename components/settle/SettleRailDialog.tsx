"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from "wagmi";
import { formatUnits } from "viem";
import { paymentsAbi, PAYMENTS_CONTRACT_ADDRESS, SETTLEMENT_FEE } from "@/lib/contracts/payments";

export interface RailForSettle {
  id: string;
  railId: string;
  payerAddress: string;
  payeeAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  paymentRate: string;
  totalSettledAmount: string;
  state: string;
  settledUpto?: string;
}

interface SettleRailDialogProps {
  rail: RailForSettle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettleRailDialog({ rail, open, onOpenChange }: SettleRailDialogProps) {
  const { address: userAddress } = useAccount();
  const { data: blockNumber, isLoading: isLoadingBlockNumber } = useBlockNumber({ watch: true });

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  const { writeContract, isPending: isSubmitting } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Calculate expected settlement amount
  const settledUpto = rail.settledUpto ? BigInt(rail.settledUpto) : BigInt(0);
  const currentBlock = blockNumber ? BigInt(blockNumber) : BigInt(0);
  const paymentRate = BigInt(rail.paymentRate || "0");
  const epochsToSettle = currentBlock > settledUpto ? currentBlock - settledUpto : BigInt(0);
  const expectedAmount = epochsToSettle * paymentRate;

  // Determine user's role
  const isPayer = userAddress?.toLowerCase() === rail.payerAddress.toLowerCase();
  const isPayee = userAddress?.toLowerCase() === rail.payeeAddress.toLowerCase();
  const roleLabel = isPayer ? "Payer" : isPayee ? "Payee" : "Observer";

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTxHash(undefined);
      setError(null);
    }
  }, [open]);

  // Close dialog on success after a delay
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onOpenChange]);

  const handleSettle = async () => {
    if (!blockNumber) {
      setError("Unable to fetch current block number");
      return;
    }

    try {
      setError(null);
      writeContract({
        address: PAYMENTS_CONTRACT_ADDRESS,
        abi: paymentsAbi,
        functionName: "settleRail",
        args: [BigInt(rail.railId), BigInt(blockNumber)],
        value: SETTLEMENT_FEE,
      }, {
        onSuccess: (hash) => {
          setTxHash(hash);
        },
        onError: (err) => {
          setError(err.message || "Transaction failed");
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit transaction");
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatAmount = (amount: bigint, decimals: number) => {
    return parseFloat(formatUnits(amount, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!open) return null;

  const isExecuting = isSubmitting || isConfirming;
  const canSettle = !isExecuting && !isLoadingBlockNumber && (isPayer || isPayee);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !isExecuting && onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Settle Rail</h2>
          <button
            onClick={() => !isExecuting && onOpenChange(false)}
            disabled={isExecuting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Role Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isPayer
              ? "bg-blue-100 text-blue-800"
              : isPayee
              ? "bg-purple-100 text-purple-800"
              : "bg-gray-100 text-gray-800"
          }`}>
            Your Role: {roleLabel}
          </span>
          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            rail.state === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}>
            {rail.state}
          </span>
        </div>

        {/* Rail Details */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Rail ID</span>
            <span className="font-mono">{rail.railId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payer</span>
            <span className="font-mono">{formatAddress(rail.payerAddress)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payee</span>
            <span className="font-mono">{formatAddress(rail.payeeAddress)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Token</span>
            <span>{rail.tokenSymbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Rate</span>
            <span>{formatAmount(paymentRate, rail.tokenDecimals)}/epoch</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Settled</span>
            <span>${formatAmount(BigInt(rail.totalSettledAmount), rail.tokenDecimals)}</span>
          </div>

          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between font-medium">
              <span className="text-gray-700">Expected Settlement</span>
              <span className="text-green-600">
                {isLoadingBlockNumber
                  ? "Loading..."
                  : `$${formatAmount(expectedAmount, rail.tokenDecimals)}`
                }
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {epochsToSettle.toString()} epochs × {formatAmount(paymentRate, rail.tokenDecimals)}/epoch
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-xs text-yellow-800">
            Settlement requires a small fee (~0.0013 FIL) paid in native FIL.
            Ensure you have sufficient FIL balance.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        {/* Success */}
        {isSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-800">
              Settlement successful! Transaction confirmed.
            </p>
            {txHash && (
              <a
                href={`https://filfox.info/en/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:underline mt-1 block"
              >
                View on Filfox →
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isExecuting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSettle}
            disabled={!canSettle || isSuccess}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Submitting..."
              : isConfirming
              ? "Confirming..."
              : isSuccess
              ? "Done"
              : "Settle Now"
            }
          </button>
        </div>

        {/* Transaction Hash */}
        {txHash && !isSuccess && (
          <div className="mt-3 text-center">
            <a
              href={`https://filfox.info/en/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:underline"
            >
              View pending transaction →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
