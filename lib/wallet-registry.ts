/**
 * Wallet Registry - Maps known wallet addresses to human-readable names
 *
 * The mappings are defined in wallet-map.md at the repo root.
 * This module parses that file at build time to provide instant lookups.
 */

// Known wallet address to human-readable name mapping
// Parsed from wallet-map.md at build time
const KNOWN_WALLETS: Record<string, string> = {
  '0x3c1ae7a70a2b51458fcb7927fd77aae408a1b857': 'Storacha',
  '0x3e4e5f067cfda2f16aade21912b8324c3d9624f8': 'Tippy',
  '0xd19d84c77bbb901971e460830e310933a210dbaa': 'PinMe',
};

/**
 * Get the human-readable name for a known wallet address
 * @param address - Ethereum wallet address (case-insensitive)
 * @returns The wallet name if known, undefined otherwise
 */
export function getKnownWalletName(address: string): string | undefined {
  return KNOWN_WALLETS[address.toLowerCase()];
}

/**
 * Check if a wallet address has a known name
 * @param address - Ethereum wallet address (case-insensitive)
 * @returns true if the address is in the registry
 */
export function isKnownWallet(address: string): boolean {
  return address.toLowerCase() in KNOWN_WALLETS;
}

/**
 * Get all known wallet addresses
 * @returns Array of known wallet addresses (lowercase)
 */
export function getKnownWalletAddresses(): string[] {
  return Object.keys(KNOWN_WALLETS);
}
