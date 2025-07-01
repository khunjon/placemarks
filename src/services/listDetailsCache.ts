import { ListWithPlaces } from './listsService';
import { UserPlaceRating } from './userRatingsService';
import { CACHE_CONFIG } from '../config/cacheConfig';
import { BaseAsyncStorageCache } from '../utils/BaseAsyncStorageCache';
import { CacheConfig } from '../utils/cacheUtils';

interface ListDetailsData {
  list: ListWithPlaces;
  userRatings: Record<string, UserPlaceRating>;
  listId: string;
}

const CACHE_CONFIG_LIST_DETAILS: CacheConfig = {
  keyPrefix: '@placemarks_list_details_cache_',
  validityDurationMs: CACHE_CONFIG.LIST_DETAILS.VALIDITY_DURATION_MS,
  softExpiryDurationMs: CACHE_CONFIG.LIST_DETAILS.SOFT_EXPIRY_DURATION_MS,
  storageTimeoutMs: CACHE_CONFIG.LIST_DETAILS.STORAGE_TIMEOUT_MS,
  enableLogging: true
};

class ListDetailsCacheService extends BaseAsyncStorageCache<ListDetailsData> {
  constructor() {
    super(CACHE_CONFIG_LIST_DETAILS);
  }

  /**
   * Generate cache key for a specific list
   */
  protected generateCacheKey(listId: string): string {
    return `${this.config.keyPrefix}${listId}`;
  }

  /**
   * Save list details to cache with current timestamp
   */
  async saveListDetails(
    listId: string,
    list: ListWithPlaces,
    userRatings: Record<string, UserPlaceRating>,
    userId: string
  ): Promise<void> {
    const listDetailsData: ListDetailsData = {
      list,
      userRatings,
      listId,
    };
    
    const cacheKey = this.generateCacheKey(listId);
    await this.saveToCache(cacheKey, listDetailsData, userId);
  }

  /**
   * Get cached list details if they're still valid and for the correct user
   * @param allowStale - Allow serving stale cache for immediate response
   */
  async getCachedListDetails(
    listId: string,
    userId: string,
    allowStale: boolean = false
  ): Promise<{
    list: ListWithPlaces;
    userRatings: Record<string, UserPlaceRating>;
    isStale?: boolean;
  } | null> {
    const cacheKey = this.generateCacheKey(listId);
    const cached = await this.getFromCache(cacheKey, userId, allowStale);
    
    if (!cached) {
      return null;
    }
    
    // Verify the cached data is for the correct list
    if (cached.data.listId !== listId) {
      console.log(`Cache mismatch for list ${listId}, clearing...`);
      await this.clearListCache(listId);
      return null;
    }
    
    return {
      list: cached.data.list,
      userRatings: cached.data.userRatings,
      isStale: cached.isStale,
    };
  }


  /**
   * Clear cached list details for a specific list
   */
  async clearListCache(listId: string): Promise<void> {
    const cacheKey = this.generateCacheKey(listId);
    await this.clearCache(cacheKey);
  }

  /**
   * Invalidate cache for a specific list (force refresh on next load)
   */
  async invalidateListCache(listId: string): Promise<void> {
    await this.clearListCache(listId);
  }

  /**
   * Check if we have cached list details for a specific list
   */
  async hasCache(listId: string, userId: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(listId);
    return await this.hasValidCache(cacheKey, userId);
  }

  /**
   * Get cache status for debugging
   */
  async getCacheStatus(listId: string, userId: string): Promise<{
    hasCache: boolean;
    isValid: boolean;
    ageMinutes: number;
    isCorrectUser: boolean;
    isCorrectList: boolean;
    placeCount: number;
  }> {
    const cacheKey = this.generateCacheKey(listId);
    const status = await this.getCacheStatusForKey(cacheKey, userId);
    
    // Get additional metadata if cache exists
    if (status.hasCache) {
      const cached = await this.getCachedListDetails(listId, userId, true);
      if (cached) {
        return {
          ...status,
          isCorrectUser: status.metadata?.isCorrectUser || false,
          isCorrectList: true,
          placeCount: cached.list.places.length,
        };
      }
    }
    
    return {
      ...status,
      isCorrectUser: false,
      isCorrectList: false,
      placeCount: 0,
    };
  }

  /**
   * Update user rating in cache (for optimistic updates)
   */
  async updateRatingInCache(
    listId: string,
    placeId: string,
    rating: UserPlaceRating | null,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(listId);
    await this.updateCache(
      cacheKey,
      (data) => {
        const updatedRatings = { ...data.userRatings };
        if (rating) {
          updatedRatings[placeId] = rating;
        } else {
          delete updatedRatings[placeId];
        }
        return { ...data, userRatings: updatedRatings };
      },
      userId,
      true
    );
  }

  /**
   * Update place notes in cache (for optimistic updates)
   */
  async updatePlaceNotesInCache(
    listId: string,
    placeId: string,
    notes: string,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(listId);
    await this.updateCache(
      cacheKey,
      (data) => ({
        ...data,
        list: {
          ...data.list,
          places: data.list.places.map(listPlace => 
            listPlace.place.id === placeId 
              ? { ...listPlace, notes }
              : listPlace
          )
        }
      }),
      userId,
      true
    );
  }

  /**
   * Remove place from cache (for optimistic updates)
   */
  async removePlaceFromCache(
    listId: string,
    placeId: string,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(listId);
    await this.updateCache(
      cacheKey,
      (data) => {
        const updatedRatings = { ...data.userRatings };
        delete updatedRatings[placeId];
        
        return {
          ...data,
          list: {
            ...data.list,
            places: data.list.places.filter(listPlace => listPlace.place.id !== placeId),
            place_count: data.list.place_count - 1
          },
          userRatings: updatedRatings
        };
      },
      userId,
      true
    );
  }

  /**
   * Update list metadata in cache (name, description, etc.)
   */
  async updateListMetadataInCache(
    listId: string,
    updates: Partial<Pick<ListWithPlaces, 'name' | 'description' | 'visibility' | 'icon' | 'color'>>,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(listId);
    await this.updateCache(
      cacheKey,
      (data) => ({
        ...data,
        list: {
          ...data.list,
          ...updates,
        }
      }),
      userId,
      true
    );
  }
  
  /**
   * Legacy method for backward compatibility
   */
  async clearAllListCaches(): Promise<void> {
    await this.clearAllCaches();
  }
}

// Export singleton instance for backward compatibility
export const ListDetailsCache = new ListDetailsCacheService(); 