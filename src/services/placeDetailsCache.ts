import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnrichedPlace } from '../types';
import { CheckIn } from './checkInsService';
import { UserRatingType } from './userRatingsService';
import { EnrichedListPlace } from './listsService';

interface CachedPlaceDetails {
  place: EnrichedPlace;
  userRating: UserRatingType | null;
  checkIns: CheckIn[];
  listsContainingPlace: (EnrichedListPlace & { list_name: string })[];
  timestamp: number;
  userId: string;
  googlePlaceId: string;
}

const CACHE_KEY_PREFIX = '@placemarks_place_details_cache_';
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

export class PlaceDetailsCache {
  /**
   * Generate cache key for a specific place
   */
  private static getCacheKey(googlePlaceId: string): string {
    return `${CACHE_KEY_PREFIX}${googlePlaceId}`;
  }

  /**
   * Save place details to cache with current timestamp
   */
  static async savePlaceDetails(
    googlePlaceId: string,
    place: EnrichedPlace,
    userRating: UserRatingType | null,
    checkIns: CheckIn[],
    listsContainingPlace: (EnrichedListPlace & { list_name: string })[],
    userId: string
  ): Promise<void> {
    try {
      const cachedData: CachedPlaceDetails = {
        place,
        userRating,
        checkIns,
        listsContainingPlace,
        timestamp: Date.now(),
        userId,
        googlePlaceId,
      };
      
      const cacheKey = this.getCacheKey(googlePlaceId);
      await withTimeout(
        AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData)),
        STORAGE_TIMEOUT
      );
    } catch (error) {
      console.warn(`Failed to save place details to cache for place ${googlePlaceId}:`, error);
    }
  }

  /**
   * Get cached place details if they're still valid and for the correct user
   */
  static async getCachedPlaceDetails(
    googlePlaceId: string,
    userId: string
  ): Promise<{
    place: EnrichedPlace;
    userRating: UserRatingType | null;
    checkIns: CheckIn[];
    listsContainingPlace: (EnrichedListPlace & { list_name: string })[];
  } | null> {
    try {
      const cacheKey = this.getCacheKey(googlePlaceId);
      const cachedData = await withTimeout(
        AsyncStorage.getItem(cacheKey),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return null;
      }

      const cached: CachedPlaceDetails = JSON.parse(cachedData);
      
      // Check if cache is for the correct user and place
      if (cached.userId !== userId || cached.googlePlaceId !== googlePlaceId) {
        console.log(`Cache is for different user/place, clearing cache for place ${googlePlaceId}...`);
        this.clearPlaceCache(googlePlaceId).catch(error => {
          console.warn(`Failed to clear user-specific cache for place ${googlePlaceId}:`, error);
        });
        return null;
      }
      
      // Check if cache is still valid
      if (this.isCacheValid(cached.timestamp)) {
        return {
          place: cached.place,
          userRating: cached.userRating,
          checkIns: cached.checkIns,
          listsContainingPlace: cached.listsContainingPlace,
        };
      }

      // Cache is expired, remove it (but don't wait for it)
      this.clearPlaceCache(googlePlaceId).catch(error => {
        console.warn(`Failed to clear expired cache for place ${googlePlaceId}:`, error);
      });
      return null;
    } catch (error) {
      console.warn(`Failed to get cached place details for place ${googlePlaceId}:`, error);
      return null;
    }
  }

  /**
   * Check if cached place details are still valid (within 10 minutes)
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
   * Clear cached place details for a specific place
   */
  static async clearPlaceCache(googlePlaceId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(googlePlaceId);
      await withTimeout(
        AsyncStorage.removeItem(cacheKey),
        STORAGE_TIMEOUT
      );
    } catch (error) {
      console.warn(`Failed to clear place cache for place ${googlePlaceId}:`, error);
    }
  }

  /**
   * Invalidate cache for a specific place (force refresh on next load)
   */
  static async invalidatePlaceCache(googlePlaceId: string): Promise<void> {
    await this.clearPlaceCache(googlePlaceId);
  }

  /**
   * Clear all place detail caches (useful for user logout)
   */
  static async clearAllPlaceCaches(): Promise<void> {
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
      console.warn('Failed to clear all place caches:', error);
    }
  }

  /**
   * Check if we have cached place details for a specific place
   */
  static async hasCache(googlePlaceId: string, userId: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(googlePlaceId);
      const cachedData = await withTimeout(
        AsyncStorage.getItem(cacheKey),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return false;
      }

      const cached: CachedPlaceDetails = JSON.parse(cachedData);
      return cached.userId === userId && 
             cached.googlePlaceId === googlePlaceId && 
             this.isCacheValid(cached.timestamp);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache status for debugging
   */
  static async getCacheStatus(googlePlaceId: string, userId: string): Promise<{
    hasCache: boolean;
    isValid: boolean;
    ageMinutes: number;
    isCorrectUser: boolean;
    isCorrectPlace: boolean;
    checkInsCount: number;
    listsCount: number;
  }> {
    try {
      const cacheKey = this.getCacheKey(googlePlaceId);
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
          isCorrectPlace: false,
          checkInsCount: 0,
          listsCount: 0,
        };
      }

      const cached: CachedPlaceDetails = JSON.parse(cachedData);
      const ageMinutes = this.getCacheAge(cached.timestamp);
      const isValid = this.isCacheValid(cached.timestamp);
      const isCorrectUser = cached.userId === userId;
      const isCorrectPlace = cached.googlePlaceId === googlePlaceId;

      return {
        hasCache: true,
        isValid,
        ageMinutes,
        isCorrectUser,
        isCorrectPlace,
        checkInsCount: cached.checkIns.length,
        listsCount: cached.listsContainingPlace.length,
      };
    } catch (error) {
      return {
        hasCache: false,
        isValid: false,
        ageMinutes: 0,
        isCorrectUser: false,
        isCorrectPlace: false,
        checkInsCount: 0,
        listsCount: 0,
      };
    }
  }

  /**
   * Update user rating in cache (for optimistic updates)
   */
  static async updateRatingInCache(
    googlePlaceId: string,
    rating: UserRatingType | null,
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedPlaceDetails(googlePlaceId, userId);
      if (!cached) return;

      await this.savePlaceDetails(
        googlePlaceId,
        cached.place,
        rating,
        cached.checkIns,
        cached.listsContainingPlace,
        userId
      );
    } catch (error) {
      console.warn(`Failed to update rating in cache for place ${googlePlaceId}:`, error);
    }
  }

  /**
   * Update check-ins in cache (for optimistic updates)
   */
  static async updateCheckInsInCache(
    googlePlaceId: string,
    checkIns: CheckIn[],
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedPlaceDetails(googlePlaceId, userId);
      if (!cached) return;

      await this.savePlaceDetails(
        googlePlaceId,
        cached.place,
        cached.userRating,
        checkIns,
        cached.listsContainingPlace,
        userId
      );
    } catch (error) {
      console.warn(`Failed to update check-ins in cache for place ${googlePlaceId}:`, error);
    }
  }

  /**
   * Update lists containing place in cache (for optimistic updates)
   */
  static async updateListsInCache(
    googlePlaceId: string,
    listsContainingPlace: (EnrichedListPlace & { list_name: string })[],
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedPlaceDetails(googlePlaceId, userId);
      if (!cached) return;

      await this.savePlaceDetails(
        googlePlaceId,
        cached.place,
        cached.userRating,
        cached.checkIns,
        listsContainingPlace,
        userId
      );
    } catch (error) {
      console.warn(`Failed to update lists in cache for place ${googlePlaceId}:`, error);
    }
  }

  /**
   * Update place notes in a specific list (optimistic update)
   */
  static async updatePlaceNotesInCache(
    googlePlaceId: string,
    listId: string,
    notes: string,
    userId: string
  ): Promise<void> {
    try {
      const cached = await this.getCachedPlaceDetails(googlePlaceId, userId);
      if (!cached) return;

      const updatedLists = cached.listsContainingPlace.map(listPlace => 
        listPlace.list_id === listId 
          ? { ...listPlace, notes }
          : listPlace
      );

      await this.savePlaceDetails(
        googlePlaceId,
        cached.place,
        cached.userRating,
        cached.checkIns,
        updatedLists,
        userId
      );
    } catch (error) {
      console.warn(`Failed to update place notes in cache for place ${googlePlaceId}:`, error);
    }
  }
}