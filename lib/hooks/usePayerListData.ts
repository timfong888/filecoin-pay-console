'use client';

import { useEffect, useState } from 'react';
import {
  fetchAllPayersExtended,
  fetchPayerListMetrics,
  enrichPayersWithPDP,
  enrichPayersWithSettled7d,
  PayerDisplayExtended,
} from '@/lib/graphql/fetchers';
import { batchResolveENS } from '@/lib/ens';

/**
 * Metrics for the payer list view.
 * Contains aggregate data and chart data.
 */
export interface PayerListMetrics {
  activePayers: number;
  totalPayers: number;
  payersWoWChange: string;
  newPayersLast7d: number;
  newPayersPrev7d: number;
  payersLast7dPercentChange: string;
  payersGoalProgress: number;
  settledTotal: number;
  settledFormatted: string;
  settledGoalProgress: number;
  settled7d: number;
  settled7dFormatted: string;
  monthlyRunRate: number;
  monthlyRunRateFormatted: string;
  annualizedRunRate: number;
  annualizedRunRateFormatted: string;
  runRateGoalProgress: number;
  activeRailsCount: number;
  cumulativePayers: number[];
  cumulativeSettled: number[];
  chartDates: string[];
}

/**
 * Result returned by the usePayerListData hook.
 */
export interface UsePayerListDataResult {
  /** List of payer accounts with all enrichments */
  payers: PayerDisplayExtended[];
  /** Aggregate metrics for the payer list */
  metrics: PayerListMetrics | null;
  /** True during initial data load */
  loading: boolean;
  /** Error message if initial load failed */
  error: string | null;
  /** True while PDP/settled7d enrichments are loading */
  pdpLoading: boolean;
}

/**
 * Hook to fetch and manage payer list data with progressive enrichment.
 *
 * Orchestrates:
 * 1. Initial parallel fetch of payers and metrics
 * 2. Progressive enrichment with PDP data and settled7d amounts
 * 3. ENS name batch resolution
 *
 * @example
 * ```tsx
 * const { payers, metrics, loading, error, pdpLoading } = usePayerListData();
 *
 * if (loading) return <Skeleton />;
 * if (error) return <Error message={error} />;
 *
 * return <PayerTable payers={payers} pdpLoading={pdpLoading} />;
 * ```
 */
export function usePayerListData(): UsePayerListDataResult {
  const [payers, setPayers] = useState<PayerDisplayExtended[]>([]);
  const [metrics, setMetrics] = useState<PayerListMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdpLoading, setPdpLoading] = useState(false);

  // Initial data load with progressive enrichment
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Parallel fetch of core data
        const [payersData, metricsData] = await Promise.all([
          fetchAllPayersExtended(),
          fetchPayerListMetrics(),
        ]);

        if (cancelled) return;

        setPayers(payersData);
        setMetrics(metricsData);

        // Progressive enrichment with PDP and settled7d
        setPdpLoading(true);
        try {
          const [enrichedWithPDP, enrichedWithSettled7d] = await Promise.all([
            enrichPayersWithPDP(payersData),
            enrichPayersWithSettled7d(payersData),
          ]);

          if (cancelled) return;

          // Merge all enrichments
          const mergedPayers = payersData.map((payer, i) => ({
            ...payer,
            ...enrichedWithPDP[i],
            settled7d: enrichedWithSettled7d[i].settled7d,
            settled7dFormatted: enrichedWithSettled7d[i].settled7dFormatted,
          }));
          setPayers(mergedPayers);
        } catch (err) {
          console.error('Failed to enrich payers:', err);
          // Continue with base data - enrichment is optional
        } finally {
          if (!cancelled) {
            setPdpLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch payers:', err);
        if (!cancelled) {
          setError('Failed to load payers from subgraph');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ENS name resolution (runs after payers load)
  useEffect(() => {
    if (payers.length === 0) return;

    let cancelled = false;

    async function resolveNames() {
      const addresses = payers
        .filter((p) => p.fullAddress && !p.ensName)
        .map((p) => p.fullAddress);

      if (addresses.length === 0) return;

      try {
        const ensNames = await batchResolveENS(addresses);

        if (cancelled) return;

        setPayers((prevPayers) =>
          prevPayers.map((payer) => {
            const ensName = ensNames.get(payer.fullAddress?.toLowerCase());
            if (ensName && !payer.ensName) {
              return { ...payer, ensName };
            }
            return payer;
          })
        );
      } catch (err) {
        console.error('Failed to resolve ENS names:', err);
        // Continue without ENS names - they're optional
      }
    }

    resolveNames();

    return () => {
      cancelled = true;
    };
  }, [payers.length]);

  return { payers, metrics, loading, error, pdpLoading };
}
