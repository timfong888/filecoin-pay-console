/**
 * Wallet Registry - Maps known wallet addresses to human-readable names
 *
 * Source of truth: wallet-map.md (repo root)
 * Generated at build time by: scripts/generate-wallet-registry.mjs
 */
import { KNOWN_WALLETS } from './generated/wallet-map';

export function getKnownWalletName(address: string): string | undefined {
  return KNOWN_WALLETS[address.toLowerCase()];
}

export function isKnownWallet(address: string): boolean {
  return address.toLowerCase() in KNOWN_WALLETS;
}

export function getKnownWalletAddresses(): string[] {
  return Object.keys(KNOWN_WALLETS);
}
