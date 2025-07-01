import { LocationCoords } from '../types/navigation';
import { CACHE_CONFIG } from '../config/cacheConfig';
import { BaseAsyncStorageCache } from '../utils/BaseAsyncStorageCache';
import { CacheConfig, withTimeout } from '../utils/cacheUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationData {
  location: LocationCoords;
  source: 'gps' | 'network' | 'fallback';
}

const CACHE_CONFIG_LOCATION: CacheConfig = {
  keyPrefix: '@placemarks_location_cache',
  validityDurationMs: CACHE_CONFIG.LOCATION.VALIDITY_DURATION_MS,
  storageTimeoutMs: CACHE_CONFIG.LOCATION.STORAGE_TIMEOUT_MS,
  enableLogging: true
};

class LocationCacheService extends BaseAsyncStorageCache<LocationData> {
  private static readonly CACHE_KEY = 'default';
  
  constructor() {
    super(CACHE_CONFIG_LOCATION);
  }

  /**
   * Generate cache key - location cache uses a single key
   */
  protected generateCacheKey(): string {
    return `${this.config.keyPrefix}_${LocationCacheService.CACHE_KEY}`;
  }

  /**
   * Save location to cache with current timestamp
   */
  async saveLocation(
    location: LocationCoords, 
    source: 'gps' | 'network' | 'fallback' = 'gps'
  ): Promise<void> {
    const locationData: LocationData = {
      location,
      source,
    };
    
    const cacheKey = this.generateCacheKey();
    await this.saveToCache(cacheKey, locationData, undefined, { source });
  }

  /**
   * Get cached location if it's still valid (within 5 minutes)
   */
  async getCachedLocation(): Promise<LocationCoords | null> {
    const cacheKey = this.generateCacheKey();
    const cached = await this.getFromCache(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    return cached.data.location;
  }

  /**
   * Get cached location regardless of age (for offline fallback)
   */
  async getLastKnownLocation(): Promise<{
    location: LocationCoords | null;
    age: number;
    source: string;
  }> {
    try {
      const cacheKey = this.generateCacheKey();
      const cachedData = await withTimeout(
        AsyncStorage.getItem(cacheKey),
        this.config.storageTimeoutMs
      );
      
      if (!cachedData) {
        return { location: null, age: 0, source: 'none' };
      }

      const cached = JSON.parse(cachedData);
      const age = Date.now() - cached.timestamp;
      
      return {
        location: cached.data.location,
        age,
        source: cached.data.source || cached.metadata?.source || 'unknown',
      };
    } catch (error) {
      console.warn('Failed to get last known location:', error);
      return { location: null, age: 0, source: 'error' };
    }
  }


  /**
   * Clear cached location
   */
  async clearLocationCache(): Promise<void> {
    const cacheKey = this.generateCacheKey();
    await super.clearCache(cacheKey);
  }

  /**
   * Check if we have any cached location data
   */
  async hasCache(): Promise<boolean> {
    const cacheKey = this.generateCacheKey();
    return await this.hasValidCache(cacheKey);
  }

  /**
   * Get cache status for debugging
   */
  async getCacheStatus(): Promise<{
    hasCache: boolean;
    isValid: boolean;
    ageMinutes: number;
    source: string;
  }> {
    const cacheKey = this.generateCacheKey();
    const status = await this.getCacheStatusForKey(cacheKey);
    
    // Get source from metadata
    const source = status.metadata?.source || 'none';
    
    return {
      hasCache: status.hasCache,
      isValid: status.isValid,
      ageMinutes: status.ageMinutes,
      source,
    };
  }
  
  /**
   * Legacy method for backward compatibility
   */
  async clearCache(): Promise<void> {
    await this.clearLocationCache();
  }
}

// Export singleton instance for backward compatibility
export const LocationCache = new LocationCacheService(); 