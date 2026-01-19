import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    testTimeout: 10000, // Increased for retry tests
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: ['lib/**/*.test.ts', 'lib/**/__mocks__/**', 'lib/**/__fixtures__/**'],
    },
  },
});
