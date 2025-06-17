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

      console.log(`📋 Using cached nearby search results (${parsed.places.length} places)`);
      return parsed.places;
    } catch (error) {
      console.warn('Failed to get cached nearby search results:', error);
      return null;
    }
  }

  /**
   * Cache text search results
   */
  async cacheTextSearch(
    query: string,
    location: Location.LocationObject,
    places: NearbyPlaceResult[]
  ): Promise<void> {
    try {
      const cacheKey = this.getTextSearchCacheKey(query, location.coords.latitude, location.coords.longitude);
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
   * Get cached text search results
   */
  async getCachedTextSearch(
    query: string,
    location: Location.LocationObject
  ): Promise<NearbyPlaceResult[] | null> {
    try {
      const cacheKey = this.getTextSearchCacheKey(query, location.coords.latitude, location.coords.longitude);
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (!cachedData) {
        return null;
      }

      const parsed: TextSearchCacheResult = JSON.parse(cachedData);

      // Check if cache is still valid
      if (Date.now() - parsed.timestamp > this.CACHE_EXPIRY_MS) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      console.log(`📋 Using cached text search results for "${query}" (${parsed.places.length} places)`);
      return parsed.places;
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