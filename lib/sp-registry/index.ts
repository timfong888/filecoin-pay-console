/**
 * SP Registry module for enriching payee data with Storage Provider metadata.
 *
 * @example
 * ```typescript
 * import { useSPRegistry } from '@/lib/sp-registry';
 *
 * const { data, loading } = useSPRegistry('0x32c90c26...');
 * if (data?.isRegistered) {
 *   console.log(data.name);
 * }
 * ```
 *
 * Note: The fetchers module uses the synapse-sdk which has node-specific
 * dependencies. Use the API route at /api/sp-registry/[address] for
 * client-side data fetching, which is what the useSPRegistry hook does.
 */

export * from './types';
export * from './hooks';
// Note: fetchers.ts is server-only due to synapse-sdk dependencies
// Use via API route: /api/sp-registry/[address]
