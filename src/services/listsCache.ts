import { ListWithPlaces, EnhancedList } from './listsService';
import { CACHE_CONFIG } from '../config/cacheConfig';
import { BaseAsyncStorageCache } from '../utils/BaseAsyncStorageCache';
import { CacheConfig } from '../utils/cacheUtils';

interface ListsData {
  userLists: ListWithPlaces[];
  smartLists: EnhancedList[];
}

const CACHE_CONFIG_LISTS: CacheConfig = {
  keyPrefix: '@placemarks_lists_cache',
  validityDurationMs: CACHE_CONFIG.LISTS.VALIDITY_DURATION_MS,
  softExpiryDurationMs: CACHE_CONFIG.LISTS.SOFT_EXPIRY_DURATION_MS,
  storageTimeoutMs: CACHE_CONFIG.LISTS.STORAGE_TIMEOUT_MS,
  enableLogging: true
};

class ListsCacheService extends BaseAsyncStorageCache<ListsData> {
  private static readonly CACHE_KEY = 'default';
  
  constructor() {
    super(CACHE_CONFIG_LISTS);
  }

  /**
   * Generate cache key - lists cache uses a single key per user
   */
  protected generateCacheKey(userId?: string): string {
    return userId 
      ? `${this.config.keyPrefix}_${userId}`
      : `${this.config.keyPrefix}_${ListsCacheService.CACHE_KEY}`;
  }

  /**
   * Save lists data to cache with current timestamp
   */
  async saveLists(
    userLists: ListWithPlaces[],
    smartLists: EnhancedList[],
    userId: string
  ): Promise<void> {
    const listsData: ListsData = {
      userLists,
      smartLists,
    };
    
    const cacheKey = this.generateCacheKey(userId);
    await this.saveToCache(cacheKey, listsData, userId);
  }

  /**
   * Get cached lists if they're still valid (within 60 minutes) and for the correct user
   * @param allowStale - Allow serving stale cache for immediate response
   */
  async getCachedLists(userId: string, allowStale: boolean = false): Promise<{
    userLists: ListWithPlaces[];
    smartLists: EnhancedList[];
    isStale?: boolean;
  } | null> {
    const cacheKey = this.generateCacheKey(userId);
    const cached = await this.getFromCache(cacheKey, userId, allowStale);
    
    if (!cached) {
      return null;
    }
    
    return {
      userLists: cached.data.userLists,
      smartLists: cached.data.smartLists,
      isStale: cached.isStale,
    };
  }


  /**
   * Clear cached lists for a specific user
   */
  async clearListsCache(userId: string): Promise<void> {
    const cacheKey = this.generateCacheKey(userId);
    await super.clearCache(cacheKey);
  }

  /**
   * Invalidate cache (force refresh on next load)
   */
  async invalidateCache(userId: string): Promise<void> {
    await this.clearListsCache(userId);
  }

  /**
   * Check if we have any cached lists data for the user
   */
  async hasCache(userId: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(userId);
    return await this.hasValidCache(cacheKey, userId);
  }

  /**
   * Get cache status for debugging
   */
  async getCacheStatus(userId: string): Promise<{
    hasCache: boolean;
    isValid: boolean;
    ageMinutes: number;
    isCorrectUser: boolean;
    listCount: number;
  }> {
    const cacheKey = this.generateCacheKey(userId);
    const status = await this.getCacheStatusForKey(cacheKey, userId);
    
    // Get additional metadata if cache exists
    if (status.hasCache) {
      const cached = await this.getCachedLists(userId, true);
      if (cached) {
        return {
          ...status,
          isCorrectUser: status.metadata?.isCorrectUser || false,
          listCount: cached.userLists.length,
        };
      }
    }
    
    return {
      ...status,
      isCorrectUser: false,
      listCount: 0,
    };
  }

  /**
   * Update a specific list in the cache (for optimistic updates)
   */
  async updateListInCache(
    listId: string, 
    updatedList: Partial<ListWithPlaces>,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(userId);
    await this.updateCache(
      cacheKey,
      (data) => ({
        ...data,
        userLists: data.userLists.map(list => 
          list.id === listId ? { ...list, ...updatedList } : list
        )
      }),
      userId,
      true
    );
  }

  /**
   * Add a new list to the cache (for optimistic updates)
   */
  async addListToCache(
    newList: ListWithPlaces,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(userId);
    await this.updateCache(
      cacheKey,
      (data) => ({
        ...data,
        userLists: [...data.userLists, newList]
      }),
      userId,
      true
    );
  }

  /**
   * Remove a list from the cache (for optimistic updates)
   */
  async removeListFromCache(
    listId: string,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(userId);
    await this.updateCache(
      cacheKey,
      (data) => ({
        ...data,
        userLists: data.userLists.filter(list => list.id !== listId)
      }),
      userId,
      true
    );
  }
  
  /**
   * Legacy method for backward compatibility
   */
  async clearCache(): Promise<void> {
    await this.clearAllCaches();
  }
}

// Export singleton instance for backward compatibility
export const ListsCache = new ListsCacheService(); 