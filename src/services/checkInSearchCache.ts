import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { CACHE_CONFIG } from '../config/cacheConfig';
import { BaseAsyncStorageCache } from '../utils/BaseAsyncStorageCache';
import { CacheConfig, generateLocationCacheKey } from '../utils/cacheUtils';

interface NearbyPlaceResult {
  google_place_id: string;
  name: string;
  address: string;
  types: string[];
  distance: number; // in meters
  coordinates: [number, number]; // [longitude, latitude]
  business_status?: string;
}

interface SearchCacheData {
  location: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
  places: NearbyPlaceResult[];
  searchType: 'nearby' | 'text';
  query?: string; // for text searches
}

const CACHE_CONFIG_SEARCH: CacheConfig = {
  keyPrefix: 'checkin_',
  validityDurationMs: CACHE_CONFIG.CHECK_IN_SEARCH.CACHE_EXPIRY_MS,
  storageTimeoutMs: 5000,
  enableLogging: false
};

class CheckInSearchCacheService extends BaseAsyncStorageCache<SearchCacheData> {
  private readonly MAX_CACHE_ENTRIES = 50;
  private readonly LOCATION_THRESHOLD_METERS = CACHE_CONFIG.CHECK_IN_SEARCH.LOCATION_THRESHOLD_METERS;
  
  // In-memory cache for faster access to recent searches
  private memoryCache: Map<string, { places: NearbyPlaceResult[]; timestamp: number }> = new Map();
  private readonly MEMORY_CACHE_DURATION = CACHE_CONFIG.CHECK_IN_SEARCH.MEMORY_CACHE_DURATION_MS;

  constructor() {
    super(CACHE_CONFIG_SEARCH);
  }

  /**
   * Generate cache key - this is used internally by base class
   */
  protected generateCacheKey(...args: any[]): string {
    // This method is required by base class but we'll use specific methods below
    return args.join('_');
  }

  /**
   * Cache nearby search results
   */
  async cacheNearbySearch(
    location: Location.LocationObject,
    radius: number,
    places: NearbyPlaceResult[]
  ): Promise<void> {
    const cacheKey = this.getNearbySearchCacheKey(location.coords.latitude, location.coords.longitude, radius);
    const cacheData: SearchCacheData = {
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      radius,
      places,
      searchType: 'nearby',
    };

    await this.saveToCache(cacheKey, cacheData, undefined, { radius });
    await this.cleanupOldCache();
  }

  /**
   * Get cached nearby search results
   */
  async getCachedNearbySearch(
    location: Location.LocationObject,
    radius: number
  ): Promise<NearbyPlaceResult[] | null> {
    // First try exact cache key
    const exactCacheKey = this.getNearbySearchCacheKey(location.coords.latitude, location.coords.longitude, radius);
    const cached = await this.getFromCache(exactCacheKey);

    if (cached) {
      return cached.data.places;
    }

    // If no exact match, look for nearby cached results
    const nearbyCacheData = await this.findNearbyCache(location.coords.latitude, location.coords.longitude, radius);
    if (nearbyCacheData) {
      return nearbyCacheData.places;
    }

    return null;
  }

  /**
   * Cache text search results in both memory and storage
   */
  async cacheTextSearch(
    query: string,
    location: Location.LocationObject,
    places: NearbyPlaceResult[]
  ): Promise<void> {
    const cacheKey = this.getTextSearchCacheKey(query, location.coords.latitude, location.coords.longitude);
    
    // Store in memory cache for fast access
    this.memoryCache.set(cacheKey, {
      places,
      timestamp: Date.now()
    });

    // Clean up memory cache if it gets too large
    this.cleanupMemoryCache();

    // Store in AsyncStorage for persistence
    const cacheData: SearchCacheData = {
      query: query.toLowerCase().trim(),
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      places,
      searchType: 'text',
    };

    await this.saveToCache(cacheKey, cacheData, undefined, { query: query.toLowerCase().trim() });
    await this.cleanupOldCache();
  }

  /**
   * Get cached text search results with smart matching
   */
  async getCachedTextSearch(
    query: string,
    location: Location.LocationObject
  ): Promise<NearbyPlaceResult[] | null> {
    try {
      const cacheKey = this.getTextSearchCacheKey(query, location.coords.latitude, location.coords.longitude);
      
      // First check memory cache for exact match
      const memoryResult = this.memoryCache.get(cacheKey);
      if (memoryResult && (Date.now() - memoryResult.timestamp) < this.MEMORY_CACHE_DURATION) {
        return memoryResult.places;
      }

      // Check AsyncStorage for exact match
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        // Add to memory cache for faster future access
        this.memoryCache.set(cacheKey, {
          places: cached.data.places,
          timestamp: Date.now()
        });
        
        return cached.data.places;
      }

      // Try to find similar cached queries (smart cache matching)
      const similarResult = await this.findSimilarTextSearch(query, location);
      if (similarResult) {
        // Cache this query too for faster future access
        this.memoryCache.set(cacheKey, {
          places: similarResult,
          timestamp: Date.now()
        });
        return similarResult;
      }

      return null;
    } catch (error) {
      console.warn('Failed to get cached text search results:', error);
      return null;
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear AsyncStorage cache
    await this.clearAllCaches();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    nearbySearches: number;
    textSearches: number;
    totalSizeKB: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.config.keyPrefix + 'nearby_') || key.startsWith(this.config.keyPrefix + 'text_')
      );

      let nearbySearches = 0;
      let textSearches = 0;
      let totalSize = 0;
      let oldestTimestamp = Infinity;
      let newestTimestamp = 0;

      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            totalSize += data.length;
            const parsed = JSON.parse(data);
            
            if (key.startsWith('checkin_nearby_')) {
              nearbySearches++;
            } else if (key.startsWith('checkin_text_')) {
              textSearches++;
            }

            if (parsed.timestamp < oldestTimestamp) {
              oldestTimestamp = parsed.timestamp;
            }
            if (parsed.timestamp > newestTimestamp) {
              newestTimestamp = parsed.timestamp;
            }
          }
        } catch (error) {
          // Skip invalid entries
        }
      }

      return {
        nearbySearches,
        textSearches,
        totalSizeKB: Math.round(totalSize / 1024),
        oldestEntry: oldestTimestamp === Infinity ? null : new Date(oldestTimestamp),
        newestEntry: newestTimestamp === 0 ? null : new Date(newestTimestamp),
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return {
        nearbySearches: 0,
        textSearches: 0,
        totalSizeKB: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Generate cache key for nearby searches
   */
  private getNearbySearchCacheKey(lat: number, lng: number, radius: number): string {
    const locationKey = generateLocationCacheKey('', lat, lng, 3);
    return `${this.config.keyPrefix}nearby_${locationKey}_${radius}`;
  }

  /**
   * Generate cache key for text searches
   */
  private getTextSearchCacheKey(query: string, lat: number, lng: number): string {
    const locationKey = generateLocationCacheKey('', lat, lng, 3);
    const cleanQuery = query.toLowerCase().trim().replace(/\s+/g, '_');
    return `${this.config.keyPrefix}text_${cleanQuery}_${locationKey}`;
  }

  /**
   * Clean up memory cache if it gets too large
   */
  private cleanupMemoryCache(): void {
    if (this.memoryCache.size > 20) {
      const now = Date.now();
      for (const [key, value] of this.memoryCache.entries()) {
        if (now - value.timestamp > this.MEMORY_CACHE_DURATION) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  /**
   * Find nearby cached results within the location threshold
   */
  private async findNearbyCache(
    lat: number, 
    lng: number, 
    radius: number
  ): Promise<SearchCacheData | null> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const nearbyCacheKeys = keys.filter(key => key.startsWith(this.config.keyPrefix + 'nearby_'));

      for (const key of nearbyCacheKeys) {
        try {
          const cached = await this.getFromCache(key);
          if (!cached || !cached.data.radius) continue;
          
          // Check if location is within threshold and radius is similar
          const distance = this.calculateDistance(
            lat, lng,
            cached.data.location.latitude, cached.data.location.longitude
          );

          if (distance <= this.LOCATION_THRESHOLD_METERS && 
              Math.abs(radius - cached.data.radius) <= 100) {
            return cached.data;
          }
        } catch (error) {
          // Skip invalid entries
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to find nearby cache:', error);
      return null;
    }
  }

  /**
   * Find similar text search in cache (e.g., "Coffee" results for "Coffee Shop")
   */
  private async findSimilarTextSearch(
    query: string,
    location: Location.LocationObject
  ): Promise<NearbyPlaceResult[] | null> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      
      // First check memory cache for similar queries
      for (const [cacheKey, cachedData] of this.memoryCache.entries()) {
        if ((Date.now() - cachedData.timestamp) < this.MEMORY_CACHE_DURATION) {
          const keyParts = cacheKey.split('_');
          if (keyParts.length >= 4 && keyParts[0] === 'checkin' && keyParts[1] === 'text') {
            const cachedQuery = keyParts[2].replace(/_/g, ' ');
            
            // Check if current query starts with cached query and is similar
            if (normalizedQuery.startsWith(cachedQuery) && 
                cachedQuery.length >= 3 && 
                normalizedQuery.length - cachedQuery.length <= 3) {
              
              
              return cachedData.places;
            }
          }
        }
      }

      // Check AsyncStorage for similar queries
      const keys = await AsyncStorage.getAllKeys();
      const textCacheKeys = keys.filter(key => key.startsWith(this.config.keyPrefix + 'text_'));

      for (const key of textCacheKeys) {
        try {
          const cached = await this.getFromCache(key);
          if (!cached) continue;

          // Check if location is similar
          const distance = this.calculateDistance(
            location.coords.latitude, location.coords.longitude,
            cached.data.location.latitude, cached.data.location.longitude
          );

          if (distance <= this.LOCATION_THRESHOLD_METERS) {
            const cachedQuery = cached.data.query?.toLowerCase() || '';
            
            // Check if current query starts with cached query and is similar
            if (normalizedQuery.startsWith(cachedQuery) && 
                cachedQuery.length >= 3 && 
                normalizedQuery.length - cachedQuery.length <= 3) {
              
              
              return cached.data.places;
            }
          }
        } catch (error) {
          // Skip invalid entries
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to find similar text search:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Clean up old cache entries to maintain performance
   */
  private async cleanupOldCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.config.keyPrefix + 'nearby_') || key.startsWith(this.config.keyPrefix + 'text_')
      );

      if (cacheKeys.length <= this.MAX_CACHE_ENTRIES) {
        return;
      }

      // Get timestamps for all cache entries
      const cacheEntries: { key: string; timestamp: number }[] = [];
      
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            cacheEntries.push({ key, timestamp: parsed.timestamp });
          }
        } catch (error) {
          // Remove invalid entries
          await AsyncStorage.removeItem(key);
        }
      }

      // Sort by timestamp and remove oldest entries
      cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
      const entriesToRemove = cacheEntries.slice(0, cacheEntries.length - this.MAX_CACHE_ENTRIES);
      
      if (entriesToRemove.length > 0) {
        await AsyncStorage.multiRemove(entriesToRemove.map(entry => entry.key));
      }
    } catch (error) {
      console.warn('Failed to cleanup old cache:', error);
    }
  }
}

// Export singleton instance
export const checkInSearchCache = new CheckInSearchCacheService(); 