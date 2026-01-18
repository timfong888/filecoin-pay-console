/**
 * MSW test setup for GraphQL testing.
 * Import this in test files to set up request interception.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance for tests.
 * Use server.use() in individual tests to override handlers.
 */
export const server = setupServer(...handlers);

/**
 * Setup function to be called in beforeAll.
 */
export function setupMSW() {
  // Start server before all tests
  server.listen({ onUnhandledRequest: 'warn' });
}

/**
 * Reset function to be called in afterEach.
 */
export function resetMSW() {
  // Reset handlers between tests
  server.resetHandlers();
}

/**
 * Cleanup function to be called in afterAll.
 */
export function cleanupMSW() {
  // Close server after all tests
  server.close();
}
