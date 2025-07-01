import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  withTimeout, 
  isCacheValid, 
  isCacheStale, 
  getCacheAgeMinutes,
  batchRemoveCacheKeys,
  safeJsonParse,
  logCacheOperation,
  CacheEntry,
  CacheConfig,
  CacheStatus,
  createCacheStatus
} from './cacheUtils';

/**
 * Abstract base class for AsyncStorage-based caches
 * Provides common functionality for all cache services
 */
export abstract class BaseAsyncStorageCache<T> {
  protected config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Generate a cache key - to be implemented by subclasses
   */
  protected abstract generateCacheKey(...args: any[]): string;

  /**
   * Save data to cache with current timestamp
   */
  protected async saveToCache(
    key: string,
    data: T,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        userId,
        metadata
      };
      
      await withTimeout(
        AsyncStorage.setItem(key, JSON.stringify(cacheEntry)),
        this.config.storageTimeoutMs
      );
      
      if (this.config.enableLogging) {
        logCacheOperation('save', this.constructor.name, { key });
      }
    } catch (error) {
      console.warn(`Failed to save to cache (${this.constructor.name}):`, error);
    }
  }

  /**
   * Get data from cache with optional stale data support
   */
  protected async getFromCache(
    key: string,
    userId?: string,
    allowStale: boolean = false
  ): Promise<{ data: T; isStale?: boolean } | null> {
    try {
      const cachedData = await withTimeout(
        AsyncStorage.getItem(key),
        this.config.storageTimeoutMs
      );
      
      if (!cachedData) {
        if (this.config.enableLogging) {
          logCacheOperation('miss', this.constructor.name, { key });
        }
        return null;
      }

      const cacheEntry = safeJsonParse<CacheEntry<T>>(cachedData);
      if (!cacheEntry) {
        return null;
      }
      
      // Check user-specific cache if userId is provided
      if (userId && cacheEntry.userId && cacheEntry.userId !== userId) {
        if (this.config.enableLogging) {
          console.log(`Cache is for different user, clearing cache for key ${key}...`);
        }
        this.clearCache(key).catch(error => {
          console.warn(`Failed to clear user-specific cache:`, error);
        });
        return null;
      }
      
      // Check cache freshness
      const isValid = isCacheValid(cacheEntry.timestamp, this.config.validityDurationMs);
      const isStale = this.config.softExpiryDurationMs 
        ? isCacheStale(
            cacheEntry.timestamp, 
            this.config.softExpiryDurationMs, 
            this.config.validityDurationMs
          )
        : false;
      
      // Return fresh cache immediately
      if (isValid && (!this.config.softExpiryDurationMs || !isStale)) {
        if (this.config.enableLogging) {
          logCacheOperation('hit', this.constructor.name, { key });
        }
        return {
          data: cacheEntry.data,
          isStale: false
        };
      }
      
      // Handle soft expiry pattern
      if (allowStale && isStale) {
        if (this.config.enableLogging) {
          logCacheOperation('stale', this.constructor.name, {
            key,
            ageHours: Math.round((Date.now() - cacheEntry.timestamp) / (60 * 60 * 1000)),
            willRefreshInBackground: true
          });
        }
        
        return {
          data: cacheEntry.data,
          isStale: true
        };
      }

      // Cache is expired beyond stale threshold
      this.clearCache(key).catch(error => {
        console.warn(`Failed to clear expired cache:`, error);
      });
      
      if (this.config.enableLogging) {
        logCacheOperation('miss', this.constructor.name, { key, reason: 'expired' });
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get from cache (${this.constructor.name}):`, error);
      return null;
    }
  }

  /**
   * Clear a specific cache entry
   */
  async clearCache(key: string): Promise<void> {
    try {
      await withTimeout(
        AsyncStorage.removeItem(key),
        this.config.storageTimeoutMs
      );
      
      if (this.config.enableLogging) {
        logCacheOperation('clear', this.constructor.name, { key });
      }
    } catch (error) {
      console.warn(`Failed to clear cache (${this.constructor.name}):`, error);
    }
  }

  /**
   * Clear all cache entries with this service's prefix
   */
  async clearAllCaches(): Promise<void> {
    await batchRemoveCacheKeys(this.config.keyPrefix, this.config.storageTimeoutMs);
    
    if (this.config.enableLogging) {
      logCacheOperation('clear', this.constructor.name, { action: 'clearAll' });
    }
  }

  /**
   * Check if a cache entry exists and is valid
   */
  protected async hasValidCache(
    key: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const cachedData = await withTimeout(
        AsyncStorage.getItem(key),
        this.config.storageTimeoutMs
      );
      
      if (!cachedData) {
        return false;
      }

      const cacheEntry = safeJsonParse<CacheEntry<T>>(cachedData);
      if (!cacheEntry) {
        return false;
      }
      
      // Check user match if userId provided
      if (userId && cacheEntry.userId && cacheEntry.userId !== userId) {
        return false;
      }
      
      return isCacheValid(cacheEntry.timestamp, this.config.validityDurationMs);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache status for debugging
   */
  protected async getCacheStatusForKey(
    key: string,
    userId?: string,
    additionalMetadata?: Record<string, any>
  ): Promise<CacheStatus> {
    try {
      const cachedData = await withTimeout(
        AsyncStorage.getItem(key),
        this.config.storageTimeoutMs
      );
      
      if (!cachedData) {
        return createCacheStatus(false);
      }

      const cacheEntry = safeJsonParse<CacheEntry<T>>(cachedData);
      if (!cacheEntry) {
        return createCacheStatus(false);
      }
      
      const isCorrectUser = !userId || !cacheEntry.userId || cacheEntry.userId === userId;
      
      return createCacheStatus(
        true,
        cacheEntry.timestamp,
        this.config.validityDurationMs,
        this.config.softExpiryDurationMs,
        {
          ...additionalMetadata,
          isCorrectUser,
          ...(cacheEntry.metadata || {})
        }
      );
    } catch (error) {
      return createCacheStatus(false, undefined, undefined, undefined, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Update cache entry with new data while preserving timestamp if needed
   */
  protected async updateCache(
    key: string,
    updater: (current: T) => T,
    userId?: string,
    preserveTimestamp: boolean = false
  ): Promise<void> {
    try {
      const cached = await this.getFromCache(key, userId, true);
      if (!cached) return;

      const updatedData = updater(cached.data);
      
      if (preserveTimestamp) {
        // Get the original timestamp
        const cachedRaw = await AsyncStorage.getItem(key);
        if (cachedRaw) {
          const cacheEntry = safeJsonParse<CacheEntry<T>>(cachedRaw);
          if (cacheEntry) {
            const updatedEntry: CacheEntry<T> = {
              ...cacheEntry,
              data: updatedData
            };
            await withTimeout(
              AsyncStorage.setItem(key, JSON.stringify(updatedEntry)),
              this.config.storageTimeoutMs
            );
            return;
          }
        }
      }
      
      // Save with new timestamp
      await this.saveToCache(key, updatedData, userId);
    } catch (error) {
      console.warn(`Failed to update cache (${this.constructor.name}):`, error);
    }
  }
}