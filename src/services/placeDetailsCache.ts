import { EnrichedPlace, UserPlacePhoto } from '../types';
import { CheckIn } from './checkInsService';
import { UserRatingType } from './userRatingsService';
import { EnrichedListPlace } from './listsService';
import { CACHE_CONFIG } from '../config/cacheConfig';
import { BaseAsyncStorageCache } from '../utils/BaseAsyncStorageCache';
import { CacheConfig } from '../utils/cacheUtils';

interface PlaceDetailsData {
  place: EnrichedPlace;
  userRating: UserRatingType | null;
  checkIns: CheckIn[];
  listsContainingPlace: (EnrichedListPlace & { list_name: string })[];
  userPhotos: UserPlacePhoto[];
  googlePlaceId: string;
}

const CACHE_CONFIG_PLACE_DETAILS: CacheConfig = {
  keyPrefix: '@placemarks_place_details_cache_',
  validityDurationMs: CACHE_CONFIG.PLACE_DETAILS.VALIDITY_DURATION_MS,
  softExpiryDurationMs: CACHE_CONFIG.PLACE_DETAILS.SOFT_EXPIRY_DURATION_MS,
  storageTimeoutMs: CACHE_CONFIG.PLACE_DETAILS.STORAGE_TIMEOUT_MS,
  enableLogging: true
};

class PlaceDetailsCacheService extends BaseAsyncStorageCache<PlaceDetailsData> {
  constructor() {
    super(CACHE_CONFIG_PLACE_DETAILS);
  }

  /**
   * Generate cache key for a specific place
   */
  protected generateCacheKey(googlePlaceId: string): string {
    return `${this.config.keyPrefix}${googlePlaceId}`;
  }

  /**
   * Save place details to cache with current timestamp
   */
  async savePlaceDetails(
    googlePlaceId: string,
    place: EnrichedPlace,
    userRating: UserRatingType | null,
    checkIns: CheckIn[],
    listsContainingPlace: (EnrichedListPlace & { list_name: string })[],
    userPhotos: UserPlacePhoto[],
    userId: string
  ): Promise<void> {
    const placeDetailsData: PlaceDetailsData = {
      place,
      userRating,
      checkIns,
      listsContainingPlace,
      userPhotos,
      googlePlaceId,
    };
    
    const cacheKey = this.generateCacheKey(googlePlaceId);
    await this.saveToCache(cacheKey, placeDetailsData, userId);
  }

  /**
   * Get cached place details if they're still valid and for the correct user
   * @param allowStale - Allow serving stale cache for immediate response while refreshing in background
   */
  async getCachedPlaceDetails(
    googlePlaceId: string,
    userId: string,
    allowStale: boolean = false
  ): Promise<{
    place: EnrichedPlace;
    userRating: UserRatingType | null;
    checkIns: CheckIn[];
    listsContainingPlace: (EnrichedListPlace & { list_name: string })[];
    userPhotos: UserPlacePhoto[];
    isStale?: boolean;
  } | null> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    const cached = await this.getFromCache(cacheKey, userId, allowStale);
    
    if (!cached) {
      return null;
    }
    
    // Verify the cached data is for the correct place
    if (!cached.data || cached.data.googlePlaceId !== googlePlaceId) {
      console.log(`Cache invalid or mismatch for place ${googlePlaceId}, clearing...`);
      await this.clearPlaceCache(googlePlaceId);
      return null;
    }
    
    return {
      place: cached.data.place,
      userRating: cached.data.userRating,
      checkIns: cached.data.checkIns,
      listsContainingPlace: cached.data.listsContainingPlace,
      userPhotos: cached.data.userPhotos || [],
      isStale: cached.isStale,
    };
  }


  /**
   * Clear cached place details for a specific place
   */
  async clearPlaceCache(googlePlaceId: string): Promise<void> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    await this.clearCache(cacheKey);
  }

  /**
   * Invalidate cache for a specific place (force refresh on next load)
   */
  async invalidatePlaceCache(googlePlaceId: string): Promise<void> {
    await this.clearPlaceCache(googlePlaceId);
  }

  /**
   * Check if we have cached place details for a specific place
   */
  async hasCache(googlePlaceId: string, userId: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    return await this.hasValidCache(cacheKey, userId);
  }

  /**
   * Get cache status for debugging
   */
  async getCacheStatus(googlePlaceId: string, userId: string): Promise<{
    hasCache: boolean;
    isValid: boolean;
    ageMinutes: number;
    isCorrectUser: boolean;
    isCorrectPlace: boolean;
    checkInsCount: number;
    listsCount: number;
  }> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    const status = await this.getCacheStatusForKey(cacheKey, userId);
    
    // Get additional metadata if cache exists
    if (status.hasCache) {
      const cached = await this.getCachedPlaceDetails(googlePlaceId, userId, true);
      if (cached) {
        return {
          ...status,
          isCorrectUser: status.metadata?.isCorrectUser || false,
          isCorrectPlace: true,
          checkInsCount: cached.checkIns.length,
          listsCount: cached.listsContainingPlace.length,
        };
      }
    }
    
    return {
      ...status,
      isCorrectUser: false,
      isCorrectPlace: false,
      checkInsCount: 0,
      listsCount: 0,
    };
  }

  /**
   * Update user rating in cache (for optimistic updates)
   */
  async updateRatingInCache(
    googlePlaceId: string,
    rating: UserRatingType | null,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    await this.updateCache(
      cacheKey,
      (data) => ({ ...data, userRating: rating }),
      userId,
      true // preserve timestamp for optimistic updates
    );
  }

  /**
   * Update check-ins in cache (for optimistic updates)
   */
  async updateCheckInsInCache(
    googlePlaceId: string,
    checkIns: CheckIn[],
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    await this.updateCache(
      cacheKey,
      (data) => ({ ...data, checkIns }),
      userId,
      true
    );
  }

  /**
   * Update lists containing place in cache (for optimistic updates)
   */
  async updateListsInCache(
    googlePlaceId: string,
    listsContainingPlace: (EnrichedListPlace & { list_name: string })[],
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    await this.updateCache(
      cacheKey,
      (data) => ({ ...data, listsContainingPlace }),
      userId,
      true
    );
  }

  /**
   * Update user photos in cache (for optimistic updates)
   */
  async updateUserPhotosInCache(
    googlePlaceId: string,
    userPhotos: UserPlacePhoto[],
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    await this.updateCache(
      cacheKey,
      (data) => ({ ...data, userPhotos }),
      userId,
      true
    );
  }

  /**
   * Update place notes in a specific list (optimistic update)
   * @deprecated Notes are now user-specific, not list-specific
   */
  async updatePlaceNotesInCache(
    googlePlaceId: string,
    listId: string,
    notes: string,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    await this.updateCache(
      cacheKey,
      (data) => ({
        ...data,
        listsContainingPlace: data.listsContainingPlace.map(listPlace => 
          listPlace.list_id === listId 
            ? { ...listPlace, notes }
            : listPlace
        )
      }),
      userId,
      true
    );
  }

  /**
   * Update user note for a place (applies to all lists)
   */
  async updateUserNoteInCache(
    googlePlaceId: string,
    notes: string,
    userId: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(googlePlaceId);
    const userNote = notes ? {
      user_id: userId,
      place_id: googlePlaceId,
      notes: notes,
      updated_at: new Date().toISOString()
    } : undefined;

    await this.updateCache(
      cacheKey,
      (data) => ({
        ...data,
        listsContainingPlace: data.listsContainingPlace.map(listPlace => ({
          ...listPlace,
          userNote: userNote
        }))
      }),
      userId,
      true
    );
  }
}

// Export singleton instance for backward compatibility
export const PlaceDetailsCache = new PlaceDetailsCacheService();