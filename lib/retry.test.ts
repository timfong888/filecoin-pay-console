/**
 * Unit tests for retry utility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, createRetryable, withBatchRetry } from './retry';
import { AppError, NetworkError } from './errors';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on immediate success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn, { operation: 'test' });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient error then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const promise = withRetry(fn, {
      operation: 'test',
      maxRetries: 3,
      initialDelayMs: 100,
      logRetries: false,
    });

    // Fast-forward through retry delay
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    // Use non-retryable error to avoid timing issues
    const nonRetryableError = new AppError('Validation error', 'VALIDATION', {
      isRetryable: false,
    });
    const fn = vi.fn().mockRejectedValue(nonRetryableError);

    await expect(
      withRetry(fn, {
        operation: 'test',
        maxRetries: 2,
        initialDelayMs: 100,
        logRetries: false,
      })
    ).rejects.toThrow('Validation error');

    expect(fn).toHaveBeenCalledTimes(1); // No retries for non-retryable
  });

  it('does not retry non-retryable errors', async () => {
    const nonRetryableError = new AppError('Validation failed', 'VALIDATION', {
      isRetryable: false,
    });
    const fn = vi.fn().mockRejectedValue(nonRetryableError);

    await expect(
      withRetry(fn, {
        operation: 'test',
        maxRetries: 3,
        logRetries: false,
      })
    ).rejects.toThrow('Validation failed');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses exponential backoff', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const promise = withRetry(fn, {
      operation: 'test',
      maxRetries: 3,
      initialDelayMs: 100,
      backoffMultiplier: 2,
      logRetries: false,
    });

    // First retry after ~100ms
    await vi.advanceTimersByTimeAsync(150);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry after ~200ms (100 * 2)
    await vi.advanceTimersByTimeAsync(250);
    expect(fn).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result).toBe('success');
  });
});

describe('createRetryable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a retryable version of a function', async () => {
    const originalFn = vi.fn().mockResolvedValue('result');
    const retryableFn = createRetryable(originalFn, { operation: 'test' });

    const result = await retryableFn('arg1', 'arg2');

    expect(result).toBe('result');
    expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('applies retry logic to wrapped function', async () => {
    const originalFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const retryableFn = createRetryable(originalFn, {
      operation: 'test',
      initialDelayMs: 100,
      logRetries: false,
    });

    const promise = retryableFn();
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('success');
    expect(originalFn).toHaveBeenCalledTimes(2);
  });
});

describe('withBatchRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns success for all successful tasks', async () => {
    const tasks = [
      { key: 'a', fn: () => Promise.resolve('result-a') },
      { key: 'b', fn: () => Promise.resolve('result-b') },
    ];

    const results = await withBatchRetry(tasks, { logRetries: false });

    expect(results.get('a')).toEqual({ success: true, data: 'result-a' });
    expect(results.get('b')).toEqual({ success: true, data: 'result-b' });
  });

  it('returns error for failed tasks', async () => {
    const tasks = [
      { key: 'success', fn: () => Promise.resolve('ok') },
      {
        key: 'fail',
        fn: () =>
          Promise.reject(
            new AppError('Failed', 'FAIL', { isRetryable: false })
          ),
      },
    ];

    const results = await withBatchRetry(tasks, { logRetries: false });

    expect(results.get('success')).toEqual({ success: true, data: 'ok' });
    expect(results.get('fail')?.success).toBe(false);
  });

  it('retries individual tasks independently', async () => {
    const fnA = vi.fn().mockResolvedValue('result-a');
    const fnB = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('result-b');

    const tasks = [
      { key: 'a', fn: fnA },
      { key: 'b', fn: fnB },
    ];

    const promise = withBatchRetry(tasks, {
      initialDelayMs: 100,
      logRetries: false,
    });

    await vi.advanceTimersByTimeAsync(200);

    const results = await promise;
    expect(results.get('a')).toEqual({ success: true, data: 'result-a' });
    expect(results.get('b')).toEqual({ success: true, data: 'result-b' });
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(2);
  });
});
