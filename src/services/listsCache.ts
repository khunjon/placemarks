import AsyncStorage from '@react-native-async-storage/async-storage';
import { ListWithPlaces, EnhancedList } from './listsService';
import { CACHE_CONFIG } from '../config/cacheConfig';

interface CachedListsData {
  userLists: ListWithPlaces[];
  smartLists: EnhancedList[];
  timestamp: number;
  userId: string;
}

const CACHE_KEY = '@placemarks_lists_cache';
const CACHE_VALIDITY_DURATION = CACHE_CONFIG.LISTS.VALIDITY_DURATION_MS;
const SOFT_EXPIRY_DURATION = CACHE_CONFIG.LISTS.SOFT_EXPIRY_DURATION_MS;
const STORAGE_TIMEOUT = CACHE_CONFIG.LISTS.STORAGE_TIMEOUT_MS;

// Helper function to add timeout to AsyncStorage operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Storage operation timeout')), timeoutMs)
    )
  ]);
}

export class ListsCache {
  /**
   * Save lists data to cache with current timestamp
   */
  static async saveLists(
    userLists: ListWithPlaces[],
    smartLists: EnhancedList[],
    userId: string
  ): Promise<void> {
    try {
      const cachedData: CachedListsData = {
        userLists,
        smartLists,
        timestamp: Date.now(),
        userId,
      };
      
      await withTimeout(
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedData)),
        STORAGE_TIMEOUT
      );
    } catch (error) {
      console.warn('Failed to save lists to cache:', error);
    }
  }

  /**
   * Get cached lists if they're still valid (within 60 minutes) and for the correct user
   * @param allowStale - Allow serving stale cache for immediate response
   */
  static async getCachedLists(userId: string, allowStale: boolean = false): Promise<{
    userLists: ListWithPlaces[];
    smartLists: EnhancedList[];
    isStale?: boolean;
  } | null> {
    try {
      const cachedData = await withTimeout(
        AsyncStorage.getItem(CACHE_KEY),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return null;
      }

      const cached: CachedListsData = JSON.parse(cachedData);
      
      // Check if cache is for the correct user
      if (cached.userId !== userId) {
        console.log('Cache is for different user, clearing...');
        this.clearCache().catch(error => {
          console.warn('Failed to clear user-specific cache:', error);
        });
        return null;
      }
      
      // Check cache freshness
      const isValid = this.isCacheValid(cached.timestamp);
      const isStale = this.isCacheStale(cached.timestamp);
      
      // Return fresh cache immediately
      if (isValid) {
        return {
          userLists: cached.userLists,
          smartLists: cached.smartLists,
          isStale: false,
        };
      }
      
      // For stale cache: serve if allowStale is true (soft expiry pattern)
      if (allowStale && isStale) {
        console.log(`🗄️ SOFT EXPIRY: Serving stale lists cache for immediate UX`, {
          userId: userId.substring(0, 8) + '...',
          ageMinutes: Math.round((Date.now() - cached.timestamp) / (60 * 1000)),
          listCount: cached.userLists.length,
          willRefreshInBackground: true
        });
        
        return {
          userLists: cached.userLists,
          smartLists: cached.smartLists,
          isStale: true,
        };
      }

      // Cache is expired beyond stale threshold, remove it
      this.clearCache().catch(error => {
        console.warn('Failed to clear expired cache:', error);
      });
      return null;
    } catch (error) {
      console.warn('Failed to get cached lists:', error);
      return null;
    }
  }

  /**
   * Check if cached lists are still valid (within 30 minutes)
   */
  static isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < SOFT_EXPIRY_DURATION;
  }

  /**
   * Check if cached lists are stale but still usable (30-60 minutes old)
   */
  static isCacheStale(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    return age >= SOFT_EXPIRY_DURATION && age < CACHE_VALIDITY_DURATION;
  }

  /**
   * Get cache age in minutes
   */
  static getCacheAge(timestamp: number): number {
    return (Date.now() - timestamp) / (60 * 1000);
  }

  /**
   * Clear cached lists
   */
  static async clearCache(): Promise<void> {
    try {
      await withTimeout(
        AsyncStorage.removeItem(CACHE_KEY),
        STORAGE_TIMEOUT
      );
    } catch (error) {
      console.warn('Failed to clear lists cache:', error);
    }
  }

  /**
   * Invalidate cache (force refresh on next load)
   */
  static async invalidateCache(): Promise<void> {
    await this.clearCache();
  }

  /**
   * Check if we have any cached lists data for the user
   */
  static async hasCache(userId: string): Promise<boolean> {
    try {
      const cachedData = await withTimeout(
        AsyncStorage.getItem(CACHE_KEY),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return false;
      }

      const cached: CachedListsData = JSON.parse(cachedData);
      return cached.userId === userId && this.isCacheValid(cached.timestamp);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache status for debugging
   */
  static async getCacheStatus(userId: string): Promise<{
    hasCache: boolean;
    isValid: boolean;
    ageMinutes: number;
    isCorrectUser: boolean;
    listCount: number;
  }> {
    try {
      const cachedData = await withTimeout(
        AsyncStorage.getItem(CACHE_KEY),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return {
          hasCache: false,
          isValid: false,
          ageMinutes: 0,
          isCorrectUser: false,
          listCount: 0,
        };
      }

      const cached: CachedListsData = JSON.parse(cachedData);
      const ageMinutes = this.getCacheAge(cached.timestamp);
      const isValid = this.isCacheValid(cached.timestamp);
      const isCorrectUser = cached.userId === userId;

      return {
        hasCache: true,
        isValid,
        ageMinutes,
        isCorrectUser,
        listCount: cached.userLists.length,
      };
    } catch (error) {
      return {
        hasCache: false,
        isValid: false,
        ageMinutes: 0,
        isCorrectUser: false,
        listCount: 0,
      };
    }
  }

  /**
   * Update a specific list in the cache (for optimistic updates)
   */
  static async updateListInCache(
    listId: string, 
    updatedList: Partial<ListWithPlaces>,
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedLists(userId);
      if (!cached) return;

      const updatedUserLists = cached.userLists.map(list => 
        list.id === listId ? { ...list, ...updatedList } : list
      );

      await this.saveLists(updatedUserLists, cached.smartLists, userId);
    } catch (error) {
      console.warn('Failed to update list in cache:', error);
    }
  }

  /**
   * Add a new list to the cache (for optimistic updates)
   */
  static async addListToCache(
    newList: ListWithPlaces,
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedLists(userId);
      if (!cached) return;

      const updatedUserLists = [...cached.userLists, newList];
      await this.saveLists(updatedUserLists, cached.smartLists, userId);
    } catch (error) {
      console.warn('Failed to add list to cache:', error);
    }
  }

  /**
   * Remove a list from the cache (for optimistic updates)
   */
  static async removeListFromCache(
    listId: string,
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedLists(userId);
      if (!cached) return;

      const updatedUserLists = cached.userLists.filter(list => list.id !== listId);
      await this.saveLists(updatedUserLists, cached.smartLists, userId);
    } catch (error) {
      console.warn('Failed to remove list from cache:', error);
    }
  }
} 