#!/usr/bin/env node
/**
 * Parses wallet-map.md and generates a TypeScript lookup map.
 * Run automatically before build/dev via package.json scripts.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const inputPath = join(root, 'wallet-map.md');
const outputPath = join(root, 'lib', 'generated', 'wallet-map.ts');

const md = readFileSync(inputPath, 'utf-8');
const entries = [];

for (const line of md.split('\n')) {
  // Match table rows: | 0xABC... | SomeName |
  const match = line.match(/^\|\s*(0x[a-fA-F0-9]+)\s*\|\s*(.+?)\s*\|/);
  if (match) {
    entries.push([match[1].toLowerCase(), match[2].trim()]);
  }
}

mkdirSync(dirname(outputPath), { recursive: true });

const ts = `// AUTO-GENERATED from wallet-map.md — do not edit manually
// Run: node scripts/generate-wallet-registry.mjs

export const KNOWN_WALLETS: Record<string, string> = {
${entries.map(([addr, name]) => `  '${addr}': '${name}',`).join('\n')}
};
`;

writeFileSync(outputPath, ts);
console.log(`wallet-registry: generated ${entries.length} entries → lib/generated/wallet-map.ts`);
