import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Common cache utility functions shared across all cache services
 */

/**
 * Wraps a promise with a timeout to prevent hanging operations
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Storage operation timeout')), timeoutMs)
    )
  ]);
}

/**
 * Check if a cached timestamp is still within the validity period
 */
export function isCacheValid(timestamp: number, validityDurationMs: number): boolean {
  return Date.now() - timestamp < validityDurationMs;
}

/**
 * Check if cache is within the stale period (between soft and hard expiry)
 */
export function isCacheStale(
  timestamp: number, 
  softExpiryDurationMs: number, 
  hardExpiryDurationMs: number
): boolean {
  const age = Date.now() - timestamp;
  return age >= softExpiryDurationMs && age < hardExpiryDurationMs;
}

/**
 * Calculate cache age in minutes
 */
export function getCacheAgeMinutes(timestamp: number): number {
  return (Date.now() - timestamp) / (60 * 1000);
}

/**
 * Calculate cache age in hours
 */
export function getCacheAgeHours(timestamp: number): number {
  return (Date.now() - timestamp) / (60 * 60 * 1000);
}

/**
 * Batch remove multiple cache keys
 */
export async function batchRemoveCacheKeys(
  keyPrefix: string, 
  timeoutMs: number
): Promise<void> {
  try {
    const allKeys = await withTimeout(
      AsyncStorage.getAllKeys(),
      timeoutMs
    );
    
    const cacheKeys = allKeys.filter(key => key.startsWith(keyPrefix));
    
    if (cacheKeys.length > 0) {
      await withTimeout(
        AsyncStorage.multiRemove(cacheKeys),
        timeoutMs
      );
    }
  } catch (error) {
    console.warn(`Failed to batch remove cache keys with prefix ${keyPrefix}:`, error);
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Generate a user-specific cache key
 */
export function generateUserCacheKey(prefix: string, userId: string, suffix?: string): string {
  return suffix 
    ? `${prefix}${userId}_${suffix}`
    : `${prefix}${userId}`;
}

/**
 * Generate a location-based cache key with coordinate rounding
 */
export function generateLocationCacheKey(
  prefix: string, 
  lat: number, 
  lng: number, 
  precision: number = 3
): string {
  const roundedLat = Number(lat.toFixed(precision));
  const roundedLng = Number(lng.toFixed(precision));
  return `${prefix}${roundedLat}_${roundedLng}`;
}

/**
 * Log cache operation with consistent formatting
 * Only logs in development mode to reduce production verbosity
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'save' | 'clear' | 'stale',
  cacheName: string,
  details?: Record<string, any>
): void {
  // Only log in development mode
  if (!__DEV__) {
    return;
  }
  
  const emoji = {
    hit: '✅',
    miss: '❌',
    save: '💾',
    clear: '🗑️',
    stale: '🗄️'
  };
  
  const message = `${emoji[operation]} ${cacheName} cache ${operation}`;
  
  if (details) {
    console.log(message, details);
  } else {
    console.log(message);
  }
}

/**
 * Standard cache entry interface
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Standard cache configuration interface
 */
export interface CacheConfig {
  validityDurationMs: number;
  softExpiryDurationMs?: number;
  storageTimeoutMs: number;
  keyPrefix: string;
  enableLogging?: boolean;
}

/**
 * Cache status interface for debugging
 */
export interface CacheStatus {
  hasCache: boolean;
  isValid: boolean;
  isStale?: boolean;
  ageMinutes: number;
  metadata?: Record<string, any>;
}

/**
 * Helper to create a standard cache status object
 */
export function createCacheStatus(
  hasCache: boolean,
  timestamp?: number,
  validityDurationMs?: number,
  softExpiryDurationMs?: number,
  metadata?: Record<string, any>
): CacheStatus {
  if (!hasCache || !timestamp || !validityDurationMs) {
    return {
      hasCache: false,
      isValid: false,
      ageMinutes: 0,
      metadata
    };
  }
  
  const ageMinutes = getCacheAgeMinutes(timestamp);
  const isValid = isCacheValid(timestamp, validityDurationMs);
  const isStale = softExpiryDurationMs 
    ? isCacheStale(timestamp, softExpiryDurationMs, validityDurationMs)
    : false;
  
  return {
    hasCache: true,
    isValid,
    isStale,
    ageMinutes,
    metadata
  };
}