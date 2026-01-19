/**
 * Unit tests for error handling utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  SubgraphError,
  NetworkError,
  RateLimitError,
  DataValidationError,
  ENSResolutionError,
  PDPError,
  isRetryableError,
  wrapError,
  logError,
} from './errors';

describe('AppError', () => {
  it('creates error with basic properties', () => {
    const error = new AppError('Test error', 'TEST_CODE');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.isRetryable).toBe(false);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('includes context when provided', () => {
    const error = new AppError('Test error', 'TEST_CODE', {
      context: { key: 'value' },
    });

    expect(error.context).toEqual({ key: 'value' });
  });

  it('sets isRetryable from options', () => {
    const error = new AppError('Test error', 'TEST_CODE', {
      isRetryable: true,
    });

    expect(error.isRetryable).toBe(true);
  });

  it('preserves cause error', () => {
    const cause = new Error('Original error');
    const error = new AppError('Wrapped error', 'TEST_CODE', { cause });

    expect(error.cause).toBe(cause);
  });

  it('returns user-friendly message', () => {
    const error = new AppError('Internal details', 'TEST_CODE');

    expect(error.toUserMessage()).toBe(
      'An unexpected error occurred. Please try again.'
    );
  });

  it('returns structured log object', () => {
    const error = new AppError('Test error', 'TEST_CODE', {
      context: { key: 'value' },
    });

    const logObj = error.toLogObject();

    expect(logObj).toHaveProperty('name', 'AppError');
    expect(logObj).toHaveProperty('code', 'TEST_CODE');
    expect(logObj).toHaveProperty('message', 'Test error');
    expect(logObj).toHaveProperty('context');
    expect(logObj).toHaveProperty('timestamp');
  });
});

describe('SubgraphError', () => {
  it('creates error with subgraph context', () => {
    const error = new SubgraphError('Query failed', {
      query: 'query Test { ... }',
      variables: { id: '123' },
    });

    expect(error.code).toBe('SUBGRAPH_ERROR');
    expect(error.query).toBe('query Test { ... }');
    expect(error.variables).toEqual({ id: '123' });
    expect(error.isRetryable).toBe(true); // Default for subgraph
  });

  it('returns user-friendly message', () => {
    const error = new SubgraphError('Query failed');

    expect(error.toUserMessage()).toBe(
      'Unable to fetch data from the blockchain. Please try again in a moment.'
    );
  });

  it('can be marked non-retryable', () => {
    const error = new SubgraphError('Syntax error', {
      isRetryable: false,
    });

    expect(error.isRetryable).toBe(false);
  });
});

describe('NetworkError', () => {
  it('creates error with network context', () => {
    const error = new NetworkError('Connection failed', {
      url: 'https://api.example.com',
      statusCode: 500,
    });

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.url).toBe('https://api.example.com');
    expect(error.statusCode).toBe(500);
    expect(error.isRetryable).toBe(true);
  });

  it('returns appropriate message for 429', () => {
    const error = new NetworkError('Rate limited', {
      statusCode: 429,
    });

    expect(error.toUserMessage()).toBe(
      'Too many requests. Please wait a moment and try again.'
    );
  });

  it('returns appropriate message for 5xx', () => {
    const error = new NetworkError('Server error', {
      statusCode: 503,
    });

    expect(error.toUserMessage()).toBe(
      'The data service is temporarily unavailable. Please try again.'
    );
  });
});

describe('RateLimitError', () => {
  it('creates rate limit error', () => {
    const error = new RateLimitError('Too many requests', {
      retryAfter: 60,
    });

    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.retryAfter).toBe(60);
    expect(error.isRetryable).toBe(true);
  });

  it('includes retry-after in user message', () => {
    const error = new RateLimitError('Rate limited', {
      retryAfter: 30,
    });

    expect(error.toUserMessage()).toBe(
      'Rate limit exceeded. Please try again in 30 seconds.'
    );
  });
});

describe('DataValidationError', () => {
  it('creates validation error', () => {
    const error = new DataValidationError('Invalid field', {
      field: 'amount',
      receivedValue: 'not-a-number',
    });

    expect(error.code).toBe('DATA_VALIDATION_ERROR');
    expect(error.field).toBe('amount');
    expect(error.receivedValue).toBe('not-a-number');
    expect(error.isRetryable).toBe(false);
  });
});

describe('ENSResolutionError', () => {
  it('creates ENS error', () => {
    const error = new ENSResolutionError('Resolution failed', {
      address: '0x1234...',
    });

    expect(error.code).toBe('ENS_RESOLUTION_ERROR');
    expect(error.address).toBe('0x1234...');
    expect(error.isRetryable).toBe(true);
  });
});

describe('PDPError', () => {
  it('creates PDP error', () => {
    const error = new PDPError('API failed', {
      endpoint: '/proofs',
    });

    expect(error.code).toBe('PDP_ERROR');
    expect(error.endpoint).toBe('/proofs');
    expect(error.isRetryable).toBe(true);
  });
});

describe('isRetryableError', () => {
  it('returns true for retryable AppError', () => {
    const error = new AppError('Test', 'TEST', { isRetryable: true });
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns false for non-retryable AppError', () => {
    const error = new AppError('Test', 'TEST', { isRetryable: false });
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns true for timeout errors', () => {
    const error = new Error('Request timeout');
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for connection errors', () => {
    const error = new Error('ECONNRESET');
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for network errors', () => {
    const error = new Error('network error occurred');
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns false for unknown errors', () => {
    const error = new Error('Unknown error');
    expect(isRetryableError(error)).toBe(false);
  });
});

describe('wrapError', () => {
  it('returns AppError unchanged', () => {
    const original = new AppError('Test', 'TEST');
    const wrapped = wrapError(original, 'operation');

    expect(wrapped).toBe(original);
  });

  it('wraps network errors', () => {
    const original = new Error('fetch failed');
    const wrapped = wrapError(original, 'fetchData');

    expect(wrapped).toBeInstanceOf(NetworkError);
    expect(wrapped.message).toContain('fetchData');
  });

  it('wraps GraphQL errors', () => {
    const original = new Error('GraphQL error');
    const wrapped = wrapError(original, 'query');

    expect(wrapped).toBeInstanceOf(SubgraphError);
  });

  it('wraps unknown errors as AppError', () => {
    const original = new Error('Something went wrong');
    const wrapped = wrapError(original, 'operation');

    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.code).toBe('UNKNOWN_ERROR');
  });

  it('handles non-Error values', () => {
    const wrapped = wrapError('string error', 'operation');

    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.message).toContain('string error');
  });
});

describe('logError', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs AppError with structured format', () => {
    const error = new AppError('Test error', 'TEST_CODE');
    logError(error, 'testOperation');

    expect(consoleSpy).toHaveBeenCalledWith(
      '[TEST_CODE] testOperation:',
      expect.objectContaining({
        name: 'AppError',
        code: 'TEST_CODE',
        operation: 'testOperation',
      })
    );
  });

  it('wraps and logs non-AppError', () => {
    const error = new Error('Plain error');
    logError(error, 'testOperation');

    expect(consoleSpy).toHaveBeenCalled();
    const loggedObj = consoleSpy.mock.calls[0][1];
    expect(loggedObj).toHaveProperty('operation', 'testOperation');
  });
});
