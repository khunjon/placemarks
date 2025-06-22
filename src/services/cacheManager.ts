import { Place, PlaceDetails, PlaceSuggestion, Location } from '../types';
import { LocationCoords } from '../types/navigation';
import { ListWithPlaces, EnhancedList } from './listsService';

// Import existing cache services
import { placesCacheService } from './placesCache';
import { googlePlacesCache, GooglePlacesCacheEntry, GooglePlacesCacheStats } from './googlePlacesCache';
import { LocationCache } from './locationCache';
import { ListsCache } from './listsCache';
import { checkInSearchCache } from './checkInSearchCache';

/**
 * Unified Cache Manager
 * 
 * Provides a single interface for all cache operations while routing
 * to the appropriate specialized cache services. This preserves all
 * existing optimizations while simplifying cache usage across the app.
 */
export class CacheManager {
  /**
   * Places cache operations (database-level caching)
   */
  places = {
    /**
     * Get a cached place by Google Place ID
     */
    get: async (googlePlaceId: string): Promise<Place | null> => {
      return placesCacheService.getCachedPlace(googlePlaceId);
    },

    /**
     * Cache a place in the database
     */
    store: async (place: Place): Promise<void> => {
      return placesCacheService.cachePlace(place);
    },

    /**
     * Get cached places within a radius of a location
     */
    getNearby: async (location: Location, radius: number, type?: string): Promise<Place[]> => {
      return placesCacheService.getCachedNearbyPlaces(location, radius, type);
    },

    /**
     * Get cache statistics
     */
    getStats: async () => {
      return placesCacheService.getCacheStats();
    },

    /**
     * Clear expired cache entries
     */
    clearExpired: async (): Promise<number> => {
      return placesCacheService.clearExpiredCache();
    }
  };

  /**
   * Google Places API cache operations (with soft expiry and cost optimization)
   */
  googlePlaces = {
    /**
     * Get place details with intelligent caching and soft expiry
     */
    get: async (
      googlePlaceId: string, 
      forceRefresh = false, 
      allowStale = false
    ): Promise<GooglePlacesCacheEntry | null> => {
      return googlePlacesCache.getPlaceDetails(googlePlaceId, forceRefresh, allowStale);
    },

    /**
     * Get multiple places with batch optimization
     */
    getMultiple: async (googlePlaceIds: string[]): Promise<Map<string, GooglePlacesCacheEntry>> => {
      return googlePlacesCache.getMultiplePlaceDetails(googlePlaceIds);
    },

    /**
     * Check if multiple places are cached (no API calls)
     */
    checkMultiple: async (googlePlaceIds: string[]): Promise<Map<string, GooglePlacesCacheEntry>> => {
      return googlePlacesCache.getMultipleCachedPlaces(googlePlaceIds);
    },

    /**
     * Get cached place data only (no API call)
     */
    getCachedOnly: async (googlePlaceId: string): Promise<GooglePlacesCacheEntry | null> => {
      return googlePlacesCache.getCachedPlace(googlePlaceId);
    },

    /**
     * Get cache statistics including soft expiry information
     */
    getStats: async (): Promise<GooglePlacesCacheStats> => {
      return googlePlacesCache.getCacheStats();
    },

    /**
     * Clear expired cache entries
     */
    clearExpired: async (): Promise<number> => {
      return googlePlacesCache.clearExpiredEntries();
    },

    /**
     * Get cache configuration
     */
    getConfig: () => {
      return googlePlacesCache.getCacheConfig();
    }
  };

  /**
   * Location cache operations (fast AsyncStorage with fallback)
   */
  location = {
    /**
     * Get cached location if valid (within 3 minutes)
     */
    get: async (): Promise<LocationCoords | null> => {
      return LocationCache.getCachedLocation();
    },

    /**
     * Save location to cache
     */
    store: async (
      location: LocationCoords, 
      source: 'gps' | 'network' | 'fallback' = 'gps'
    ): Promise<void> => {
      return LocationCache.saveLocation(location, source);
    },

    /**
     * Get last known location regardless of age (for offline fallback)
     */
    getLastKnown: async (): Promise<{
      location: LocationCoords | null;
      age: number;
      source: string;
    }> => {
      return LocationCache.getLastKnownLocation();
    },

    /**
     * Check if we have cached location data
     */
    hasCache: async (): Promise<boolean> => {
      return LocationCache.hasCache();
    },

    /**
     * Get cache status for debugging
     */
    getStatus: async () => {
      return LocationCache.getCacheStatus();
    },

    /**
     * Clear cached location
     */
    clear: async (): Promise<void> => {
      return LocationCache.clearCache();
    }
  };

  /**
   * Lists cache operations (user-specific with optimistic updates)
   */
  lists = {
    /**
     * Get cached lists for a user
     */
    get: async (userId: string): Promise<{
      userLists: ListWithPlaces[];
      smartLists: EnhancedList[];
    } | null> => {
      return ListsCache.getCachedLists(userId);
    },

    /**
     * Save lists to cache
     */
    store: async (
      userLists: ListWithPlaces[],
      smartLists: EnhancedList[],
      userId: string
    ): Promise<void> => {
      return ListsCache.saveLists(userLists, smartLists, userId);
    },

    /**
     * Update a specific list in cache (optimistic update)
     */
    updateList: async (
      listId: string, 
      updatedList: Partial<ListWithPlaces>,
      userId: string
    ): Promise<void> => {
      return ListsCache.updateListInCache(listId, updatedList, userId);
    },

    /**
     * Add new list to cache (optimistic update)
     */
    addList: async (newList: ListWithPlaces, userId: string): Promise<void> => {
      return ListsCache.addListToCache(newList, userId);
    },

    /**
     * Remove list from cache (optimistic update)
     */
    removeList: async (listId: string, userId: string): Promise<void> => {
      return ListsCache.removeListFromCache(listId, userId);
    },

    /**
     * Check if we have cached lists for user
     */
    hasCache: async (userId: string): Promise<boolean> => {
      return ListsCache.hasCache(userId);
    },

    /**
     * Get cache status for debugging
     */
    getStatus: async (userId: string) => {
      return ListsCache.getCacheStatus(userId);
    },

    /**
     * Clear cached lists
     */
    clear: async (): Promise<void> => {
      return ListsCache.clearCache();
    },

    /**
     * Invalidate cache (force refresh)
     */
    invalidate: async (): Promise<void> => {
      return ListsCache.invalidateCache();
    }
  };

  /**
   * Search cache operations (check-in search with smart matching)
   */
  search = {
    /**
     * Get cached nearby search results
     */
    getNearby: async (
      location: { coords: { latitude: number; longitude: number } },
      radius: number
    ) => {
      return checkInSearchCache.getCachedNearbySearch(location as any, radius);
    },

    /**
     * Cache nearby search results
     */
    storeNearby: async (
      location: { coords: { latitude: number; longitude: number } },
      radius: number,
      places: any[]
    ): Promise<void> => {
      return checkInSearchCache.cacheNearbySearch(location as any, radius, places);
    },

    /**
     * Get cached text search results with smart matching
     */
    getText: async (
      query: string,
      location: { coords: { latitude: number; longitude: number } }
    ) => {
      return checkInSearchCache.getCachedTextSearch(query, location as any);
    },

    /**
     * Cache text search results
     */
    storeText: async (
      query: string,
      location: { coords: { latitude: number; longitude: number } },
      places: any[]
    ): Promise<void> => {
      return checkInSearchCache.cacheTextSearch(query, location as any, places);
    },

    /**
     * Get search cache statistics
     */
    getStats: async () => {
      return checkInSearchCache.getCacheStats();
    },

    /**
     * Clear all search cache
     */
    clear: async (): Promise<void> => {
      return checkInSearchCache.clearCache();
    }
  };

  /**
   * Global cache operations
   */
  global = {
    /**
     * Get comprehensive cache statistics from all cache layers
     */
    getStats: async () => {
      const [placesStats, googlePlacesStats, searchStats] = await Promise.all([
        this.places.getStats(),
        this.googlePlaces.getStats(),
        this.search.getStats()
      ]);

      return {
        places: placesStats,
        googlePlaces: googlePlacesStats,
        search: searchStats,
        summary: {
          totalCachedPlaces: placesStats.totalPlaces + googlePlacesStats.totalEntries,
          totalSearches: searchStats.nearbySearches + searchStats.textSearches,
          searchCacheSizeKB: searchStats.totalSizeKB,
          costSavings: {
            googlePlacesHits: googlePlacesStats.validEntries + googlePlacesStats.staleButUsableEntries,
            estimatedSavings: `$${((googlePlacesStats.validEntries + googlePlacesStats.staleButUsableEntries) * 0.017).toFixed(2)}`
          }
        }
      };
    },

    /**
     * Clear all expired cache entries across all layers
     */
    clearAllExpired: async () => {
      const [placesCleared, googlePlacesCleared] = await Promise.all([
        this.places.clearExpired(),
        this.googlePlaces.clearExpired()
      ]);

      return {
        placesCleared,
        googlePlacesCleared,
        total: placesCleared + googlePlacesCleared
      };
    },

    /**
     * Get overall cache health status
     */
    getHealthStatus: async () => {
      const stats = await this.global.getStats();
      
      return {
        status: 'healthy', // Could add logic to determine health based on hit rates
        googlePlacesHitRate: stats.googlePlaces.totalEntries > 0 
          ? (stats.googlePlaces.validEntries / stats.googlePlaces.totalEntries * 100).toFixed(1) + '%'
          : '0%',
        cacheLayers: {
          places: stats.places.totalPlaces > 0,
          googlePlaces: stats.googlePlaces.totalEntries > 0,
          search: (stats.search.nearbySearches + stats.search.textSearches) > 0
        },
        estimatedMonthlySavings: `$${(stats.summary.costSavings.googlePlacesHits * 0.017 * 30).toFixed(2)}`
      };
    }
  };
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Export individual cache services for backward compatibility
export {
  placesCacheService,
  googlePlacesCache,
  LocationCache,
  ListsCache,
  checkInSearchCache
};