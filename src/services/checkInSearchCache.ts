import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

interface NearbyPlaceResult {
  google_place_id: string;
  name: string;
  address: string;
  types: string[];
  distance: number; // in meters
  coordinates: [number, number]; // [longitude, latitude]
  business_status?: string;
}

interface CachedSearchResult {
  location: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  places: NearbyPlaceResult[];
  timestamp: number;
  searchType: 'nearby' | 'text';
  query?: string; // for text searches
}

interface TextSearchCacheResult {
  query: string;
  location: {
    latitude: number;
    longitude: number;
  };
  places: NearbyPlaceResult[];
  timestamp: number;
}

export class CheckInSearchCache {
  private readonly CACHE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_CACHE_ENTRIES = 50;
  private readonly LOCATION_THRESHOLD_METERS = 100; // Consider locations within 100m as the same
  
  // In-memory cache for faster access to recent searches
  private memoryCache: Map<string, { places: NearbyPlaceResult[]; timestamp: number }> = new Map();
  private readonly MEMORY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Cache nearby search results
   */
  async cacheNearbySearch(
    location: Location.LocationObject,
    radius: number,
    places: NearbyPlaceResult[]
  ): Promise<void> {
    try {
      const cacheKey = this.getNearbySearchCacheKey(location.coords.latitude, location.coords.longitude, radius);
      const cacheData: CachedSearchResult = {
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        radius,
        places,
        timestamp: Date.now(),
        searchType: 'nearby',
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      await this.cleanupOldCache();
    } catch (error) {
      console.warn('Failed to cache nearby search results:', error);
    }
  }

  /**
   * Get cached nearby search results
   */
  async getCachedNearbySearch(
    location: Location.LocationObject,
    radius: number
  ): Promise<NearbyPlaceResult[] | null> {
    try {
      // First try exact cache key
      const exactCacheKey = this.getNearbySearchCacheKey(location.coords.latitude, location.coords.longitude, radius);
      let cachedData = await AsyncStorage.getItem(exactCacheKey);

      if (!cachedData) {
        // If no exact match, look for nearby cached results
        cachedData = await this.findNearbyCache(location.coords.latitude, location.coords.longitude, radius);
      }

      if (!cachedData) {
        return null;
      }

      const parsed: CachedSearchResult = JSON.parse(cachedData);

      // Check if cache is still valid
      if (Date.now() - parsed.timestamp > this.CACHE_EXPIRY_MS) {
        await AsyncStorage.removeItem(exactCacheKey);
        return null;
      }

      return parsed.places;
    } catch (error) {
      console.warn('Failed to get cached nearby search results:', error);
      return null;
    }
  }

  /**
   * Cache text search results in both memory and storage
   */
  async cacheTextSearch(
    query: string,
    location: Location.LocationObject,
    places: NearbyPlaceResult[]
  ): Promise<void> {
    try {
      const cacheKey = this.getTextSearchCacheKey(query, location.coords.latitude, location.coords.longitude);
      
      // Store in memory cache for fast access
      this.memoryCache.set(cacheKey, {
        places,
        timestamp: Date.now()
      });

      // Clean up memory cache if it gets too large
      if (this.memoryCache.size > 20) {
        const now = Date.now();
        for (const [key, value] of this.memoryCache.entries()) {
          if (now - value.timestamp > this.MEMORY_CACHE_DURATION) {
            this.memoryCache.delete(key);
          }
        }
      }

      // Store in AsyncStorage for persistence
      const cacheData: TextSearchCacheResult = {
        query: query.toLowerCase().trim(),
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        places,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      await this.cleanupOldCache();
    } catch (error) {
      console.warn('Failed to cache text search results:', error);
    }
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
        console.log('🗄️ MEMORY CACHE HIT: Retrieved text search from memory cache', {
          query: query.trim(),
          resultCount: memoryResult.places.length,
          cost: '$0.000 - FREE!',
          cacheAge: `${Math.round((Date.now() - memoryResult.timestamp) / 1000)}s ago`
        });
        return memoryResult.places;
      }

      // Check AsyncStorage for exact match
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed: TextSearchCacheResult = JSON.parse(cachedData);

        // Check if cache is still valid
        if (Date.now() - parsed.timestamp > this.CACHE_EXPIRY_MS) {
          await AsyncStorage.removeItem(cacheKey);
        } else {
          // Add to memory cache for faster future access
          this.memoryCache.set(cacheKey, {
            places: parsed.places,
            timestamp: Date.now()
          });
          
          console.log('🗄️ STORAGE CACHE HIT: Retrieved text search from AsyncStorage cache', {
            query: query.trim(),
            resultCount: parsed.places.length,
            cost: '$0.000 - FREE!',
            cacheAge: `${Math.round((Date.now() - parsed.timestamp) / 1000)}s ago`
          });
          return parsed.places;
        }
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
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('checkin_nearby_') || key.startsWith('checkin_text_')
      );
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`🗑️ Cleared ${cacheKeys.length} cache entries`);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
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
        key.startsWith('checkin_nearby_') || key.startsWith('checkin_text_')
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
    const roundedLat = Math.round(lat * 1000) / 1000; // Round to ~100m precision
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `checkin_nearby_${roundedLat}_${roundedLng}_${radius}`;
  }

  /**
   * Generate cache key for text searches
   */
  private getTextSearchCacheKey(query: string, lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    const cleanQuery = query.toLowerCase().trim().replace(/\s+/g, '_');
    return `checkin_text_${cleanQuery}_${roundedLat}_${roundedLng}`;
  }

  /**
   * Find nearby cached results within the location threshold
   */
  private async findNearbyCache(
    lat: number, 
    lng: number, 
    radius: number
  ): Promise<string | null> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const nearbyCacheKeys = keys.filter(key => key.startsWith('checkin_nearby_'));

      for (const key of nearbyCacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (!data) continue;

          const parsed: CachedSearchResult = JSON.parse(data);
          
          // Check if cache is still valid
          if (Date.now() - parsed.timestamp > this.CACHE_EXPIRY_MS) {
            continue;
          }

          // Check if location is within threshold and radius is similar
          const distance = this.calculateDistance(
            lat, lng,
            parsed.location.latitude, parsed.location.longitude
          );

          if (distance <= this.LOCATION_THRESHOLD_METERS && 
              Math.abs(radius - parsed.radius) <= 100) {
            return data;
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
              
              console.log('🗄️ SMART MEMORY CACHE: Using similar cached query', {
                originalQuery: query,
                cachedQuery: cachedQuery,
                resultCount: cachedData.places.length,
                cost: '$0.000 - FREE!',
                reason: 'Similar query likely has same results'
              });
              
              return cachedData.places;
            }
          }
        }
      }

      // Check AsyncStorage for similar queries
      const keys = await AsyncStorage.getAllKeys();
      const textCacheKeys = keys.filter(key => key.startsWith('checkin_text_'));

      for (const key of textCacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (!data) continue;

          const parsed: TextSearchCacheResult = JSON.parse(data);
          
          // Check if cache is still valid
          if (Date.now() - parsed.timestamp > this.CACHE_EXPIRY_MS) {
            continue;
          }

          // Check if location is similar
          const distance = this.calculateDistance(
            location.coords.latitude, location.coords.longitude,
            parsed.location.latitude, parsed.location.longitude
          );

          if (distance <= this.LOCATION_THRESHOLD_METERS) {
            const cachedQuery = parsed.query.toLowerCase();
            
            // Check if current query starts with cached query and is similar
            if (normalizedQuery.startsWith(cachedQuery) && 
                cachedQuery.length >= 3 && 
                normalizedQuery.length - cachedQuery.length <= 3) {
              
              console.log('🗄️ SMART STORAGE CACHE: Using similar cached query', {
                originalQuery: query,
                cachedQuery: cachedQuery,
                resultCount: parsed.places.length,
                cost: '$0.000 - FREE!',
                reason: 'Similar query likely has same results'
              });
              
              return parsed.places;
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
        key.startsWith('checkin_nearby_') || key.startsWith('checkin_text_')
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
        console.log(`🗑️ Cleaned up ${entriesToRemove.length} old cache entries`);
      }
    } catch (error) {
      console.warn('Failed to cleanup old cache:', error);
    }
  }
}

// Export singleton instance
export const checkInSearchCache = new CheckInSearchCache(); 