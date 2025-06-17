import AsyncStorage from '@react-native-async-storage/async-storage';
import { ListWithPlaces, EnhancedList } from './listsService';

interface CachedListsData {
  userLists: ListWithPlaces[];
  smartLists: EnhancedList[];
  timestamp: number;
  userId: string;
}

const CACHE_KEY = '@placemarks_lists_cache';
const CACHE_VALIDITY_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const STORAGE_TIMEOUT = 2000; // 2 second timeout for AsyncStorage operations

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
   * Get cached lists if they're still valid (within 10 minutes) and for the correct user
   */
  static async getCachedLists(userId: string): Promise<{
    userLists: ListWithPlaces[];
    smartLists: EnhancedList[];
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
      
      // Check if cache is still valid
      if (this.isCacheValid(cached.timestamp)) {
        return {
          userLists: cached.userLists,
          smartLists: cached.smartLists,
        };
      }

      // Cache is expired, remove it (but don't wait for it)
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
   * Check if cached lists are still valid (within 10 minutes)
   */
  static isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_VALIDITY_DURATION;
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