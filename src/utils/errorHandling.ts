import analyticsService from '../services/analytics';
import { AnalyticsEventName } from '../types/analytics';

/**
 * Standard error types used across the application
 */
export enum ErrorType {
  // Database/API errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Business logic errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  
  // External service errors
  GOOGLE_PLACES_ERROR = 'GOOGLE_PLACES_ERROR',
  LOCATION_ERROR = 'LOCATION_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  
  // System errors
  CONFIG_ERROR = 'CONFIG_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  
  // Unknown/unexpected errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels for logging and handling
 */
export enum ErrorSeverity {
  LOW = 'low',      // Minor issues, app continues normally
  MEDIUM = 'medium', // Notable issues, some functionality affected
  HIGH = 'high',    // Serious issues, major functionality affected
  CRITICAL = 'critical' // App-breaking issues
}

/**
 * Error context for enhanced debugging and logging
 */
export interface ErrorContext {
  // Service and operation details
  service: string;
  operation: string;
  
  // User and session context
  userId?: string;
  sessionId?: string;
  
  // Technical context
  timestamp: Date;
  userAgent?: string;
  platform?: string;
  
  // Additional context data
  metadata?: Record<string, any>;
  
  // Request/operation specific data
  requestId?: string;
  correlationId?: string;
}

/**
 * Standardized application error class
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: ErrorType,
    code: string,
    severity: ErrorSeverity,
    context: Partial<ErrorContext>,
    originalError?: Error,
    isOperational = true
  ) {
    super(message);
    
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.severity = severity;
    this.originalError = originalError;
    this.isOperational = isOperational;
    
    // Ensure context has required fields
    this.context = {
      service: context.service || 'unknown',
      operation: context.operation || 'unknown',
      timestamp: new Date(),
      platform: context.platform || 'unknown',
      ...context
    };

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Get a sanitized version of the error for client-side display
   */
  public getUserMessage(): string {
    // Return user-friendly messages based on error type
    switch (this.type) {
      case ErrorType.NETWORK_ERROR:
        // Special handling for auth network errors
        if (this.code === 'AUTH_NETWORK_ERROR' || this.originalError?.name === 'AuthRetryableFetchError') {
          return 'Unable to connect to authentication service. Please check your internet connection and try again.';
        }
        return 'Network connection issue. Please check your internet connection and try again.';
      case ErrorType.TIMEOUT_ERROR:
        return 'The request took too long. Please try again.';
      case ErrorType.PERMISSION_ERROR:
        return 'You don\'t have permission to perform this action.';
      case ErrorType.NOT_FOUND_ERROR:
        return 'The requested item was not found.';
      case ErrorType.VALIDATION_ERROR:
        return this.message; // Validation messages are usually user-friendly
      case ErrorType.RATE_LIMIT_ERROR:
        return 'Too many requests. Please wait a moment and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  /**
   * Convert to JSON for logging/reporting
   */
  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      code: this.code,
      severity: this.severity,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * Error logging levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Centralized error logger with context and analytics integration
 */
export class ErrorLogger {
  private static formatLogMessage(error: AppError | Error, context?: Partial<ErrorContext>): string {
    if (error instanceof AppError) {
      return `[${error.type}:${error.code}] ${error.message} | Service: ${error.context.service} | Operation: ${error.context.operation}`;
    }
    
    const service = context?.service || 'unknown';
    const operation = context?.operation || 'unknown';
    return `[${error.name}] ${error.message} | Service: ${service} | Operation: ${operation}`;
  }

  private static getLogLevel(error: AppError | Error): LogLevel {
    if (error instanceof AppError) {
      switch (error.severity) {
        case ErrorSeverity.LOW:
          return LogLevel.INFO;
        case ErrorSeverity.MEDIUM:
          return LogLevel.WARN;
        case ErrorSeverity.HIGH:
        case ErrorSeverity.CRITICAL:
          return LogLevel.ERROR;
        default:
          return LogLevel.ERROR;
      }
    }
    return LogLevel.ERROR;
  }

  /**
   * Log error with appropriate level and context
   */
  public static log(error: AppError | Error, context?: Partial<ErrorContext>): void {
    const logMessage = this.formatLogMessage(error, context);
    const logLevel = this.getLogLevel(error);
    
    // Console logging with appropriate level
    switch (logLevel) {
      case LogLevel.ERROR:
        console.error(logMessage, error);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, error);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
    }

    // Analytics tracking for significant errors
    if (error instanceof AppError && error.severity !== ErrorSeverity.LOW) {
      analyticsService.track(AnalyticsEventName.ERROR_OCCURRED, {
        error_type: (() => {
          switch (error.type) {
            case ErrorType.NETWORK_ERROR: return 'network';
            case ErrorType.PERMISSION_ERROR: return 'permission';
            case ErrorType.VALIDATION_ERROR: return 'validation';
            default: return 'unknown';
          }
        })(),
        error_code: error.code,
        error_message: error.getUserMessage()
      });
    }
  }
}

/**
 * Standard error handler function type
 */
export type ErrorHandler<T = any> = (error: Error, context?: Partial<ErrorContext>) => T;

/**
 * Retry configuration for operations
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number;  // Maximum delay in milliseconds
  backoffMultiplier: number;
  retryCondition?: (error: Error) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: Error) => {
    // Retry on network errors, timeouts, and rate limits
    if (error instanceof AppError) {
      return [
        ErrorType.NETWORK_ERROR,
        ErrorType.TIMEOUT_ERROR,
        ErrorType.RATE_LIMIT_ERROR
      ].includes(error.type);
    }
    // Also retry on specific auth errors
    if (error.name === 'AuthRetryableFetchError' || 
        error.message?.includes('AuthRetryableFetchError') ||
        error.message?.includes('Network request failed')) {
      return true;
    }
    return false;
  }
};

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: Partial<ErrorContext>
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if this is the last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }
      
      // Check if we should retry this error
      if (finalConfig.retryCondition && !finalConfig.retryCondition(lastError)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelay
      );
      
      ErrorLogger.log(
        new AppError(
          `Retry attempt ${attempt + 1}/${finalConfig.maxRetries} failed, retrying in ${delay}ms`,
          ErrorType.UNKNOWN_ERROR,
          'RETRY_ATTEMPT',
          ErrorSeverity.LOW,
          { ...context, operation: 'retry' },
          lastError
        )
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  context?: Partial<ErrorContext>
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AppError(
          `Operation timed out after ${timeoutMs}ms`,
          ErrorType.TIMEOUT_ERROR,
          'OPERATION_TIMEOUT',
          ErrorSeverity.MEDIUM,
          context || {}
        ));
      }, timeoutMs);
    })
  ]);
}

/**
 * Decorator for standardizing error handling in async functions
 */
export function handleErrors(
  errorType: ErrorType,
  errorCode: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context: Partial<ErrorContext> = {}
) {
  return function (
    _target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const appError = new AppError(
          error instanceof Error ? error.message : 'Unknown error',
          errorType,
          errorCode,
          severity,
          { ...context, operation: propertyName },
          error instanceof Error ? error : undefined
        );
        
        ErrorLogger.log(appError);
        throw appError;
      }
    };
    
    return descriptor;
  };
}

/**
 * Utility functions for creating common error types
 */
export const ErrorFactory = {
  database: (message: string, context: Partial<ErrorContext>, originalError?: Error) =>
    new AppError(message, ErrorType.DATABASE_ERROR, 'DB_ERROR', ErrorSeverity.HIGH, context, originalError),
    
  validation: (message: string, context: Partial<ErrorContext>) =>
    new AppError(message, ErrorType.VALIDATION_ERROR, 'VALIDATION_ERROR', ErrorSeverity.LOW, context),
    
  notFound: (resource: string, context: Partial<ErrorContext>) =>
    new AppError(`${resource} not found`, ErrorType.NOT_FOUND_ERROR, 'NOT_FOUND', ErrorSeverity.LOW, context),
    
  permission: (action: string, context: Partial<ErrorContext>) =>
    new AppError(`Permission denied for ${action}`, ErrorType.PERMISSION_ERROR, 'PERMISSION_DENIED', ErrorSeverity.MEDIUM, context),
    
  network: (message: string, context: Partial<ErrorContext>, originalError?: Error) => {
    // Special handling for auth network errors
    const code = originalError?.name === 'AuthRetryableFetchError' ? 'AUTH_NETWORK_ERROR' : 'NETWORK_ERROR';
    return new AppError(message, ErrorType.NETWORK_ERROR, code, ErrorSeverity.MEDIUM, context, originalError);
  },
    
  googlePlaces: (message: string, statusCode: string, context: Partial<ErrorContext>, originalError?: Error) =>
    new AppError(message, ErrorType.GOOGLE_PLACES_ERROR, `GOOGLE_PLACES_${statusCode}`, ErrorSeverity.MEDIUM, context, originalError),
    
  location: (message: string, context: Partial<ErrorContext>, originalError?: Error) =>
    new AppError(message, ErrorType.LOCATION_ERROR, 'LOCATION_ERROR', ErrorSeverity.MEDIUM, context, originalError),
    
  cache: (message: string, context: Partial<ErrorContext>, originalError?: Error) =>
    new AppError(message, ErrorType.CACHE_ERROR, 'CACHE_ERROR', ErrorSeverity.LOW, context, originalError),
    
  config: (message: string, context: Partial<ErrorContext>) =>
    new AppError(message, ErrorType.CONFIG_ERROR, 'CONFIG_ERROR', ErrorSeverity.CRITICAL, context),
    
  timeout: (operation: string, timeoutMs: number, context: Partial<ErrorContext>) =>
    new AppError(`${operation} timed out after ${timeoutMs}ms`, ErrorType.TIMEOUT_ERROR, 'TIMEOUT', ErrorSeverity.MEDIUM, context),
    
  rateLimit: (service: string, context: Partial<ErrorContext>) =>
    new AppError(`Rate limit exceeded for ${service}`, ErrorType.RATE_LIMIT_ERROR, 'RATE_LIMIT', ErrorSeverity.MEDIUM, context)
};

/**
 * Standard try-catch wrapper with logging
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: Partial<ErrorContext>,
  defaultValue?: T,
  shouldThrow = true
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error instanceof Error ? error.message : 'Unknown error',
          ErrorType.UNKNOWN_ERROR,
          'UNKNOWN_ERROR',
          ErrorSeverity.MEDIUM,
          context,
          error instanceof Error ? error : undefined
        );
    
    ErrorLogger.log(appError);
    
    if (shouldThrow) {
      throw appError;
    }
    
    return defaultValue;
  }
}

/**
 * Input validation helper
 */
export function validateInput<T>(
  value: T,
  validator: (value: T) => boolean,
  errorMessage: string,
  context: Partial<ErrorContext>
): T {
  if (!validator(value)) {
    throw ErrorFactory.validation(errorMessage, context);
  }
  return value;
}