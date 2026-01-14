/**
 * StateView Contract Client
 *
 * The StateView contract stores metadata for PDP pieces, including
 * the IPFS CID mapping that links Piece CIDs to original IPFS CIDs.
 *
 * Contract: 0x9e4e6699d8F67dFc883d6b0A7344Bd56F7E80B46 (Filecoin mainnet)
 */

import { createPublicClient, http, parseAbi } from 'viem';
import { filecoin } from 'viem/chains';

// StateView contract address on Filecoin mainnet
export const STATE_VIEW_CONTRACT = '0x9e4e6699d8F67dFc883d6b0A7344Bd56F7E80B46';

// StateView ABI (partial - only the functions we need)
const stateViewAbi = parseAbi([
  'function getAllPieceMetadata(uint256 dataSetId, uint256 pieceId) view returns (string[] keys, string[] values)',
]);

// Create viem client for Filecoin mainnet
const publicClient = createPublicClient({
  chain: filecoin,
  transport: http('https://api.node.glif.io/rpc/v1'),
});

/**
 * Piece metadata from StateView contract
 */
export interface PieceMetadata {
  ipfsRootCID: string | null;
  rawMetadata: Record<string, string>;
}

/**
 * Fetch metadata for a specific piece from the StateView contract.
 *
 * @param dataSetId - The DataSet ID (from PDP subgraph)
 * @param pieceId - The piece ID within the DataSet
 * @returns PieceMetadata with ipfsRootCID if available
 */
export async function fetchPieceMetadata(
  dataSetId: string | bigint,
  pieceId: string | bigint
): Promise<PieceMetadata> {
  try {
    const result = await publicClient.readContract({
      address: STATE_VIEW_CONTRACT as `0x${string}`,
      abi: stateViewAbi,
      functionName: 'getAllPieceMetadata',
      args: [BigInt(dataSetId), BigInt(pieceId)],
    });

    const [keys, values] = result as [string[], string[]];

    // Build metadata map
    const rawMetadata: Record<string, string> = {};
    for (let i = 0; i < keys.length; i++) {
      rawMetadata[keys[i]] = values[i];
    }

    return {
      ipfsRootCID: rawMetadata['ipfsRootCID'] || null,
      rawMetadata,
    };
  } catch (error) {
    console.error(`Failed to fetch metadata for DataSet ${dataSetId}, Piece ${pieceId}:`, error);
    return {
      ipfsRootCID: null,
      rawMetadata: {},
    };
  }
}

/**
 * Batch fetch metadata for multiple pieces.
 *
 * @param pieces - Array of {dataSetId, pieceId} pairs
 * @returns Map of "dataSetId:pieceId" -> PieceMetadata
 */
export async function batchFetchPieceMetadata(
  pieces: Array<{ dataSetId: string | bigint; pieceId: string | bigint }>
): Promise<Map<string, PieceMetadata>> {
  const results = new Map<string, PieceMetadata>();

  // Process in parallel with concurrency limit
  const BATCH_SIZE = 10;

  for (let i = 0; i < pieces.length; i += BATCH_SIZE) {
    const batch = pieces.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (piece) => {
        const metadata = await fetchPieceMetadata(piece.dataSetId, piece.pieceId);
        const key = `${piece.dataSetId}:${piece.pieceId}`;
        return { key, metadata };
      })
    );

    for (const { key, metadata } of batchResults) {
      results.set(key, metadata);
    }
  }

  return results;
}

/**
 * Convert hex-encoded Piece CID to base32 format.
 *
 * Piece CIDs in the subgraph are stored as hex (0x0155...).
 * This converts them to the standard bafkz... format.
 *
 * @param hexCid - Hex-encoded CID (e.g., "0x0155912024...")
 * @returns Base32-encoded CID (e.g., "bafkzcibd...")
 */
export function hexCidToBase32(hexCid: string): string {
  // Remove 0x prefix if present
  const hex = hexCid.startsWith('0x') ? hexCid.slice(2) : hexCid;

  // Convert hex to bytes
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }

  // Base32 encode (RFC 4648 lowercase without padding)
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(value >> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 0x1f];
  }

  // Add multibase prefix 'b' for base32lower
  return 'b' + result;
}

/**
 * Truncate a CID for display with ellipsis.
 *
 * @param cid - Full CID string
 * @param prefixLen - Characters to show at start (default 10)
 * @param suffixLen - Characters to show at end (default 4)
 * @returns Truncated CID (e.g., "bafkzcibd3...xyz4")
 */
export function truncateCID(cid: string, prefixLen = 10, suffixLen = 4): string {
  if (cid.length <= prefixLen + suffixLen + 3) {
    return cid;
  }
  return `${cid.slice(0, prefixLen)}...${cid.slice(-suffixLen)}`;
}
