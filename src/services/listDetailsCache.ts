import AsyncStorage from '@react-native-async-storage/async-storage';
import { ListWithPlaces } from './listsService';
import { UserPlaceRating } from './userRatingsService';

interface CachedListDetails {
  list: ListWithPlaces;
  userRatings: Record<string, UserPlaceRating>;
  timestamp: number;
  userId: string;
  listId: string;
}

const CACHE_KEY_PREFIX = '@placemarks_list_details_cache_';
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

export class ListDetailsCache {
  /**
   * Generate cache key for a specific list
   */
  private static getCacheKey(listId: string): string {
    return `${CACHE_KEY_PREFIX}${listId}`;
  }

  /**
   * Save list details to cache with current timestamp
   */
  static async saveListDetails(
    listId: string,
    list: ListWithPlaces,
    userRatings: Record<string, UserPlaceRating>,
    userId: string
  ): Promise<void> {
    try {
      const cachedData: CachedListDetails = {
        list,
        userRatings,
        timestamp: Date.now(),
        userId,
        listId,
      };
      
      const cacheKey = this.getCacheKey(listId);
      await withTimeout(
        AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData)),
        STORAGE_TIMEOUT
      );
    } catch (error) {
      console.warn(`Failed to save list details to cache for list ${listId}:`, error);
    }
  }

  /**
   * Get cached list details if they're still valid and for the correct user
   */
  static async getCachedListDetails(
    listId: string,
    userId: string
  ): Promise<{
    list: ListWithPlaces;
    userRatings: Record<string, UserPlaceRating>;
  } | null> {
    try {
      const cacheKey = this.getCacheKey(listId);
      const cachedData = await withTimeout(
        AsyncStorage.getItem(cacheKey),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return null;
      }

      const cached: CachedListDetails = JSON.parse(cachedData);
      
      // Check if cache is for the correct user and list
      if (cached.userId !== userId || cached.listId !== listId) {
        console.log(`Cache is for different user/list, clearing cache for list ${listId}...`);
        this.clearListCache(listId).catch(error => {
          console.warn(`Failed to clear user-specific cache for list ${listId}:`, error);
        });
        return null;
      }
      
      // Check if cache is still valid
      if (this.isCacheValid(cached.timestamp)) {
        return {
          list: cached.list,
          userRatings: cached.userRatings,
        };
      }

      // Cache is expired, remove it (but don't wait for it)
      this.clearListCache(listId).catch(error => {
        console.warn(`Failed to clear expired cache for list ${listId}:`, error);
      });
      return null;
    } catch (error) {
      console.warn(`Failed to get cached list details for list ${listId}:`, error);
      return null;
    }
  }

  /**
   * Check if cached list details are still valid (within 10 minutes)
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
   * Clear cached list details for a specific list
   */
  static async clearListCache(listId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(listId);
      await withTimeout(
        AsyncStorage.removeItem(cacheKey),
        STORAGE_TIMEOUT
      );
    } catch (error) {
      console.warn(`Failed to clear list cache for list ${listId}:`, error);
    }
  }

  /**
   * Invalidate cache for a specific list (force refresh on next load)
   */
  static async invalidateListCache(listId: string): Promise<void> {
    await this.clearListCache(listId);
  }

  /**
   * Clear all list detail caches (useful for user logout)
   */
  static async clearAllListCaches(): Promise<void> {
    try {
      // Get all AsyncStorage keys
      const allKeys = await withTimeout(
        AsyncStorage.getAllKeys(),
        STORAGE_TIMEOUT
      );
      
      // Filter keys that match our cache prefix
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      
      // Remove all cache keys
      if (cacheKeys.length > 0) {
        await withTimeout(
          AsyncStorage.multiRemove(cacheKeys),
          STORAGE_TIMEOUT
        );
      }
    } catch (error) {
      console.warn('Failed to clear all list caches:', error);
    }
  }

  /**
   * Check if we have cached list details for a specific list
   */
  static async hasCache(listId: string, userId: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(listId);
      const cachedData = await withTimeout(
        AsyncStorage.getItem(cacheKey),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return false;
      }

      const cached: CachedListDetails = JSON.parse(cachedData);
      return cached.userId === userId && 
             cached.listId === listId && 
             this.isCacheValid(cached.timestamp);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache status for debugging
   */
  static async getCacheStatus(listId: string, userId: string): Promise<{
    hasCache: boolean;
    isValid: boolean;
    ageMinutes: number;
    isCorrectUser: boolean;
    isCorrectList: boolean;
    placeCount: number;
  }> {
    try {
      const cacheKey = this.getCacheKey(listId);
      const cachedData = await withTimeout(
        AsyncStorage.getItem(cacheKey),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return {
          hasCache: false,
          isValid: false,
          ageMinutes: 0,
          isCorrectUser: false,
          isCorrectList: false,
          placeCount: 0,
        };
      }

      const cached: CachedListDetails = JSON.parse(cachedData);
      const ageMinutes = this.getCacheAge(cached.timestamp);
      const isValid = this.isCacheValid(cached.timestamp);
      const isCorrectUser = cached.userId === userId;
      const isCorrectList = cached.listId === listId;

      return {
        hasCache: true,
        isValid,
        ageMinutes,
        isCorrectUser,
        isCorrectList,
        placeCount: cached.list.places.length,
      };
    } catch (error) {
      return {
        hasCache: false,
        isValid: false,
        ageMinutes: 0,
        isCorrectUser: false,
        isCorrectList: false,
        placeCount: 0,
      };
    }
  }

  /**
   * Update user rating in cache (for optimistic updates)
   */
  static async updateRatingInCache(
    listId: string,
    placeId: string,
    rating: UserPlaceRating | null,
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedListDetails(listId, userId);
      if (!cached) return;

      const updatedRatings = { ...cached.userRatings };
      if (rating) {
        updatedRatings[placeId] = rating;
      } else {
        delete updatedRatings[placeId];
      }

      await this.saveListDetails(listId, cached.list, updatedRatings, userId);
    } catch (error) {
      console.warn(`Failed to update rating in cache for list ${listId}:`, error);
    }
  }

  /**
   * Update place notes in cache (for optimistic updates)
   */
  static async updatePlaceNotesInCache(
    listId: string,
    placeId: string,
    notes: string,
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedListDetails(listId, userId);
      if (!cached) return;

      const updatedList = {
        ...cached.list,
        places: cached.list.places.map(listPlace => 
          listPlace.place.id === placeId 
            ? { ...listPlace, notes }
            : listPlace
        )
      };

      await this.saveListDetails(listId, updatedList, cached.userRatings, userId);
    } catch (error) {
      console.warn(`Failed to update place notes in cache for list ${listId}:`, error);
    }
  }

  /**
   * Remove place from cache (for optimistic updates)
   */
  static async removePlaceFromCache(
    listId: string,
    placeId: string,
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedListDetails(listId, userId);
      if (!cached) return;

      const updatedList = {
        ...cached.list,
        places: cached.list.places.filter(listPlace => listPlace.place.id !== placeId),
        place_count: cached.list.place_count - 1
      };

      // Also remove any rating for this place
      const updatedRatings = { ...cached.userRatings };
      delete updatedRatings[placeId];

      await this.saveListDetails(listId, updatedList, updatedRatings, userId);
    } catch (error) {
      console.warn(`Failed to remove place from cache for list ${listId}:`, error);
    }
  }

  /**
   * Update list metadata in cache (name, description, etc.)
   */
  static async updateListMetadataInCache(
    listId: string,
    updates: Partial<Pick<ListWithPlaces, 'name' | 'description' | 'visibility' | 'icon' | 'color'>>,
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedListDetails(listId, userId);
      if (!cached) return;

      const updatedList = {
        ...cached.list,
        ...updates,
      };

      await this.saveListDetails(listId, updatedList, cached.userRatings, userId);
    } catch (error) {
      console.warn(`Failed to update list metadata in cache for list ${listId}:`, error);
    }
  }
} 