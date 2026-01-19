/**
 * Custom error types for the Filecoin Pay Console.
 * Provides structured error handling with context and recovery strategies.
 */

/**
 * Base error class for all application errors.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly isRetryable: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    options?: {
      context?: Record<string, unknown>;
      isRetryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = options?.context;
    this.isRetryable = options?.isRetryable ?? false;
    this.timestamp = new Date();
    this.cause = options?.cause;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a user-friendly error message.
   */
  toUserMessage(): string {
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Returns structured error info for logging.
   */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }
}

/**
 * Error for GraphQL/Subgraph query failures.
 */
export class SubgraphError extends AppError {
  public readonly query?: string;
  public readonly variables?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      query?: string;
      variables?: Record<string, unknown>;
      cause?: Error;
      isRetryable?: boolean;
    }
  ) {
    super(message, 'SUBGRAPH_ERROR', {
      context: {
        query: options?.query?.substring(0, 200), // Truncate for logging
        variables: options?.variables,
      },
      isRetryable: options?.isRetryable ?? true, // Subgraph errors often transient
      cause: options?.cause,
    });
    this.name = 'SubgraphError';
    this.query = options?.query;
    this.variables = options?.variables;
  }

  toUserMessage(): string {
    return 'Unable to fetch data from the blockchain. Please try again in a moment.';
  }
}

/**
 * Error for network/connectivity failures.
 */
export class NetworkError extends AppError {
  public readonly url?: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    options?: {
      url?: string;
      statusCode?: number;
      cause?: Error;
    }
  ) {
    super(message, 'NETWORK_ERROR', {
      context: { url: options?.url, statusCode: options?.statusCode },
      isRetryable: true, // Network errors are generally retryable
      cause: options?.cause,
    });
    this.name = 'NetworkError';
    this.url = options?.url;
    this.statusCode = options?.statusCode;
  }

  toUserMessage(): string {
    if (this.statusCode === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (this.statusCode && this.statusCode >= 500) {
      return 'The data service is temporarily unavailable. Please try again.';
    }
    return 'Network connection issue. Please check your connection and try again.';
  }
}

/**
 * Error for rate limiting responses.
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;
  public readonly url?: string;

  constructor(
    message: string = 'Rate limit exceeded',
    options?: {
      url?: string;
      retryAfter?: number;
      cause?: Error;
    }
  ) {
    super(message, 'RATE_LIMIT_ERROR', {
      context: { url: options?.url, statusCode: 429, retryAfter: options?.retryAfter },
      isRetryable: true,
      cause: options?.cause,
    });
    this.name = 'RateLimitError';
    this.url = options?.url;
    this.retryAfter = options?.retryAfter;
  }

  toUserMessage(): string {
    if (this.retryAfter) {
      return `Rate limit exceeded. Please try again in ${this.retryAfter} seconds.`;
    }
    return 'Too many requests. Please wait a moment and try again.';
  }
}

/**
 * Error for invalid/missing data from API responses.
 */
export class DataValidationError extends AppError {
  public readonly field?: string;
  public readonly receivedValue?: unknown;

  constructor(
    message: string,
    options?: {
      field?: string;
      receivedValue?: unknown;
      cause?: Error;
    }
  ) {
    super(message, 'DATA_VALIDATION_ERROR', {
      context: { field: options?.field, receivedValue: options?.receivedValue },
      isRetryable: false, // Invalid data won't fix itself
      cause: options?.cause,
    });
    this.name = 'DataValidationError';
    this.field = options?.field;
    this.receivedValue = options?.receivedValue;
  }

  toUserMessage(): string {
    return 'Received unexpected data format. This may be a temporary issue.';
  }
}

/**
 * Error for ENS resolution failures.
 */
export class ENSResolutionError extends AppError {
  public readonly address?: string;

  constructor(
    message: string,
    options?: {
      address?: string;
      cause?: Error;
    }
  ) {
    super(message, 'ENS_RESOLUTION_ERROR', {
      context: { address: options?.address },
      isRetryable: true,
      cause: options?.cause,
    });
    this.name = 'ENSResolutionError';
    this.address = options?.address;
  }

  toUserMessage(): string {
    return 'Unable to resolve ENS name. The address will be displayed instead.';
  }
}

/**
 * Error for PDP API failures.
 */
export class PDPError extends AppError {
  public readonly endpoint?: string;

  constructor(
    message: string,
    options?: {
      endpoint?: string;
      cause?: Error;
      isRetryable?: boolean;
    }
  ) {
    super(message, 'PDP_ERROR', {
      context: { endpoint: options?.endpoint },
      isRetryable: options?.isRetryable ?? true,
      cause: options?.cause,
    });
    this.name = 'PDPError';
    this.endpoint = options?.endpoint;
  }

  toUserMessage(): string {
    return 'Unable to fetch proof data. Storage verification info may be unavailable.';
  }
}

/**
 * Determines if an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isRetryable;
  }

  // Check for common retryable HTTP errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('network') ||
      message.includes('fetch failed')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Wraps an unknown error into a typed AppError.
 */
export function wrapError(error: unknown, operation: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const cause = error instanceof Error ? error : new Error(String(error));
  const message = cause.message || 'Unknown error';

  // Detect error types from message/cause
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('ECONNREFUSED')
  ) {
    return new NetworkError(`Network error during ${operation}: ${message}`, { cause });
  }

  if (message.includes('GraphQL') || message.includes('subgraph')) {
    return new SubgraphError(`Subgraph error during ${operation}: ${message}`, { cause });
  }

  // Default to generic app error
  return new AppError(`Error during ${operation}: ${message}`, 'UNKNOWN_ERROR', {
    cause,
    isRetryable: isRetryableError(cause),
  });
}

/**
 * Logs an error with structured context.
 */
export function logError(error: unknown, operation: string): void {
  const appError = error instanceof AppError ? error : wrapError(error, operation);

  // Use structured logging format
  console.error(`[${appError.code}] ${operation}:`, {
    ...appError.toLogObject(),
    operation,
  });
}
