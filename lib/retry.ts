/**
 * Retry utility with exponential backoff for transient errors.
 */

import { isRetryableError, wrapError, logError, RateLimitError } from './errors';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in ms between retries (default: 10000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Operation name for logging */
  operation?: string;
  /** Whether to log retries (default: true) */
  logRetries?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'operation'>> & { operation: string } = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  operation: 'unknown operation',
  logRetries: true,
};

/**
 * Delays execution for specified milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates delay with jitter to prevent thundering herd.
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  // Exponential backoff: initialDelay * multiplier^attempt
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  // Add jitter (±20%) to prevent synchronized retries
  const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Executes an async function with retry logic for transient errors.
 *
 * @example
 * ```ts
 * const data = await withRetry(
 *   () => fetchDataFromAPI(),
 *   { operation: 'fetchData', maxRetries: 3 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const appError = wrapError(error, opts.operation);
      lastError = appError;

      // Check if error is retryable
      if (!isRetryableError(appError)) {
        if (opts.logRetries) {
          logError(appError, opts.operation);
        }
        throw appError;
      }

      // Check if we've exhausted retries
      if (attempt >= opts.maxRetries) {
        if (opts.logRetries) {
          console.error(
            `[RETRY_EXHAUSTED] ${opts.operation}: Failed after ${attempt + 1} attempts`,
            { lastError: appError.message }
          );
        }
        throw appError;
      }

      // Calculate delay
      let delayMs: number;
      if (appError instanceof RateLimitError && appError.retryAfter) {
        // Respect rate limit retry-after header
        delayMs = appError.retryAfter * 1000;
      } else {
        delayMs = calculateDelay(
          attempt,
          opts.initialDelayMs,
          opts.maxDelayMs,
          opts.backoffMultiplier
        );
      }

      if (opts.logRetries) {
        console.warn(
          `[RETRY] ${opts.operation}: Attempt ${attempt + 1}/${opts.maxRetries + 1} failed, retrying in ${delayMs}ms`,
          { error: appError.message, code: appError.code }
        );
      }

      await delay(delayMs);
    }
  }

  // TypeScript: shouldn't reach here, but satisfy compiler
  throw lastError || new Error('Retry failed unexpectedly');
}

/**
 * Creates a retryable version of an async function.
 *
 * @example
 * ```ts
 * const retryableFetch = createRetryable(fetchData, { maxRetries: 3 });
 * const data = await retryableFetch();
 * ```
 */
export function createRetryable<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  defaultOptions?: RetryOptions
): (...args: TArgs) => Promise<TReturn> {
  return (...args: TArgs) =>
    withRetry(() => fn(...args), {
      ...defaultOptions,
      operation: defaultOptions?.operation || fn.name || 'anonymous function',
    });
}

/**
 * Batch retry: executes multiple promises with individual retry logic.
 * Returns results for successful operations and errors for failed ones.
 */
export async function withBatchRetry<T>(
  tasks: Array<{
    fn: () => Promise<T>;
    key: string;
  }>,
  options?: RetryOptions
): Promise<Map<string, { success: true; data: T } | { success: false; error: Error }>> {
  const results = new Map<string, { success: true; data: T } | { success: false; error: Error }>();

  await Promise.all(
    tasks.map(async ({ fn, key }) => {
      try {
        const data = await withRetry(fn, {
          ...options,
          operation: options?.operation ? `${options.operation}:${key}` : key,
        });
        results.set(key, { success: true, data });
      } catch (error) {
        results.set(key, {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    })
  );

  return results;
}
