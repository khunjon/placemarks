import { ErrorFactory, ErrorLogger, ErrorType, ErrorSeverity } from './errorHandling';

interface FetchRetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<FetchRetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  timeout: 30000,
  onRetry: () => {},
};

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.message?.includes('Network request failed')) return true;
  if (error.message?.includes('Failed to fetch')) return true;
  if (error.message?.includes('NetworkError')) return true;
  if (error.message?.includes('ERR_NETWORK')) return true;
  
  // Specific auth errors that are retryable
  if (error.name === 'AuthRetryableFetchError') return true;
  if (error.message?.includes('AuthRetryableFetchError')) return true;
  
  // Connection errors
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ENOTFOUND') return true;
  if (error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ECONNRESET') return true;
  
  // HTTP status codes that are retryable
  if (error.status === 408) return true; // Request Timeout
  if (error.status === 429) return true; // Too Many Requests
  if (error.status >= 500 && error.status <= 599) return true; // Server errors
  
  return false;
}

/**
 * Custom fetch implementation with retry logic and timeout
 */
export function createFetchWithRetry(options: FetchRetryOptions = {}): typeof fetch {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return async function fetchWithRetry(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        // Merge the abort signal with any existing signal
        const signal = init?.signal 
          ? anySignal([init.signal, controller.signal])
          : controller.signal;
        
        const response = await fetch(input, {
          ...init,
          signal,
        });
        
        clearTimeout(timeoutId);
        
        // Check if response indicates a retryable error
        if (!response.ok && isRetryableError({ status: response.status })) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if it's not a retryable error or if we're out of retries
        if (!isRetryableError(error) || attempt === config.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        // Log retry attempt
        const context = {
          service: 'fetch',
          operation: 'retry',
          metadata: {
            url: input.toString(),
            attempt: attempt + 1,
            maxRetries: config.maxRetries,
            delay,
            errorName: error.name,
            errorMessage: error.message,
          },
        };
        
        ErrorLogger.log(
          ErrorFactory.network(
            `Network request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`,
            context,
            error
          )
        );
        
        // Call onRetry callback
        config.onRetry(attempt + 1, error);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we get here, all retries failed
    const finalError = lastError || new Error('Fetch failed');
    
    // Convert to AppError for consistent error handling
    if (finalError.message?.includes('AuthRetryableFetchError') || 
        finalError.name === 'AuthRetryableFetchError') {
      throw ErrorFactory.network(
        'Authentication network request failed. Please check your connection.',
        {
          service: 'supabase-auth',
          operation: 'fetch',
          metadata: {
            url: input.toString(),
            originalError: finalError.name,
            message: finalError.message,
          },
        },
        finalError
      );
    }
    
    throw finalError;
  };
}

/**
 * Combines multiple AbortSignals into one
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  
  return controller.signal;
}

/**
 * Default fetch instance with retry logic
 */
export const fetchWithRetry = createFetchWithRetry();