import { ListWithPlaces, EnhancedList } from './listsService';
import { CACHE_CONFIG } from '../config/cacheConfig';
import { BaseAsyncStorageCache } from '../utils/BaseAsyncStorageCache';
import { CacheConfig } from '../utils/cacheUtils';

interface ListsData {
  userLists: ListWithPlaces[];
  smartLists: EnhancedList[];
}

interface ListSummariesData {
  userListSummaries: ListWithPlaces[]; // These have empty places arrays
  lastUpdated: Date;
}

const CACHE_CONFIG_LISTS: CacheConfig = {
  keyPrefix: '@placemarks_lists_cache',
  validityDurationMs: CACHE_CONFIG.LISTS.VALIDITY_DURATION_MS,
  softExpiryDurationMs: CACHE_CONFIG.LISTS.SOFT_EXPIRY_DURATION_MS,
  storageTimeoutMs: CACHE_CONFIG.LISTS.STORAGE_TIMEOUT_MS,
  enableLogging: true
};

// Separate class for summaries cache
class ListSummariesCache extends BaseAsyncStorageCache<ListSummariesData> {
  constructor(config: CacheConfig) {
    super(config);
  }

  protected generateCacheKey(userId: string): string {
    return `${this.config.keyPrefix}_${userId}_summaries`;
  }

  // Public wrapper methods to expose protected functionality
  async save(userId: string, data: ListSummariesData): Promise<void> {
    const key = this.generateCacheKey(userId);
    return this.saveToCache(key, data, userId);
  }

  async get(userId: string, allowStale: boolean = false) {
    const key = this.generateCacheKey(userId);
    return this.getFromCache(key, userId, allowStale);
  }

  async hasValid(userId: string): Promise<boolean> {
    const key = this.generateCacheKey(userId);
    return this.hasValidCache(key, userId);
  }

  async update(
    userId: string,
    updateFn: (data: ListSummariesData) => ListSummariesData,
    preserveMetadata: boolean = true
  ): Promise<void> {
    const key = this.generateCacheKey(userId);
    return this.updateCache(key, updateFn, userId, preserveMetadata);
  }

  async clear(userId: string): Promise<void> {
    const key = this.generateCacheKey(userId);
    return this.clearCache(key);
  }
}

class ListsCacheService extends BaseAsyncStorageCache<ListsData> {
  private static readonly CACHE_KEY = 'default';
  private static readonly SUMMARIES_SUFFIX = '_summaries';
  
  // Separate cache instance for summaries  
  private summariesCache: ListSummariesCache;
  
  constructor() {
    super(CACHE_CONFIG_LISTS);
    // Create a separate cache instance for summaries with the same config
    this.summariesCache = new ListSummariesCache(CACHE_CONFIG_LISTS);
  }

  /**
   * Generate cache key - lists cache uses a single key per user
   */
  protected generateCacheKey(userId?: string, isSummary: boolean = false): string {
    const suffix = isSummary ? ListsCacheService.SUMMARIES_SUFFIX : '';
    return userId 
      ? `${this.config.keyPrefix}_${userId}${suffix}`
      : `${this.config.keyPrefix}_${ListsCacheService.CACHE_KEY}${suffix}`;
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

  // ========== Summary-specific methods ==========

  /**
   * Save list summaries to cache (lightweight data for lists screen)
   */
  async saveListSummaries(
    userListSummaries: ListWithPlaces[],
    userId: string
  ): Promise<void> {
    const summariesData: ListSummariesData = {
      userListSummaries,
      lastUpdated: new Date(),
    };
    
    await this.summariesCache.save(userId, summariesData);
  }

  /**
   * Get cached list summaries if they're still valid
   * @param allowStale - Allow serving stale cache for immediate response
   */
  async getCachedListSummaries(userId: string, allowStale: boolean = false): Promise<{
    userListSummaries: ListWithPlaces[];
    isStale?: boolean;
  } | null> {
    const cached = await this.summariesCache.get(userId, allowStale);
    
    if (!cached) {
      return null;
    }
    
    return {
      userListSummaries: cached.data.userListSummaries,
      isStale: cached.isStale,
    };
  }

  /**
   * Clear cached list summaries for a specific user
   */
  async clearListSummariesCache(userId: string): Promise<void> {
    await this.summariesCache.clear(userId);
  }

  /**
   * Check if we have cached list summaries for the user
   */
  async hasSummariesCache(userId: string): Promise<boolean> {
    return await this.summariesCache.hasValid(userId);
  }

  /**
   * Update a specific list in the summaries cache (for optimistic updates)
   */
  async updateListInSummariesCache(
    listId: string, 
    updatedList: Partial<ListWithPlaces>,
    userId: string
  ): Promise<void> {
    await this.summariesCache.update(
      userId,
      (data) => ({
        ...data,
        userListSummaries: data.userListSummaries.map(list => 
          list.id === listId ? { ...list, ...updatedList } : list
        )
      }),
      true
    );
  }

  /**
   * Clear all caches (both full data and summaries)
   */
  async clearAllUserCaches(userId: string): Promise<void> {
    await this.clearListsCache(userId);
    await this.clearListSummariesCache(userId);
  }
}

// Export singleton instance for backward compatibility
export const ListsCache = new ListsCacheService(); 