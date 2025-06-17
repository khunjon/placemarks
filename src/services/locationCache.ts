import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationCoords } from '../types/navigation';

interface CachedLocation {
  location: LocationCoords;
  timestamp: number;
  source: 'gps' | 'network' | 'fallback';
}

const CACHE_KEY = '@placemarks_location_cache';
const CACHE_VALIDITY_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
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

export class LocationCache {
  /**
   * Save location to cache with current timestamp
   */
  static async saveLocation(
    location: LocationCoords, 
    source: 'gps' | 'network' | 'fallback' = 'gps'
  ): Promise<void> {
    try {
      const cachedLocation: CachedLocation = {
        location,
        timestamp: Date.now(),
        source,
      };
      
      await withTimeout(
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedLocation)),
        STORAGE_TIMEOUT
      );
    } catch (error) {
      console.warn('Failed to save location to cache:', error);
    }
  }

  /**
   * Get cached location if it's still valid (within 5 minutes)
   */
  static async getCachedLocation(): Promise<LocationCoords | null> {
    try {
      const cachedData = await withTimeout(
        AsyncStorage.getItem(CACHE_KEY),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return null;
      }

      const cached: CachedLocation = JSON.parse(cachedData);
      
      // Check if cache is still valid
      if (this.isCacheValid(cached.timestamp)) {
        return cached.location;
      }

      // Cache is expired, remove it (but don't wait for it)
      this.clearCache().catch(error => {
        console.warn('Failed to clear expired cache:', error);
      });
      return null;
    } catch (error) {
      console.warn('Failed to get cached location:', error);
      return null;
    }
  }

  /**
   * Get cached location regardless of age (for offline fallback)
   */
  static async getLastKnownLocation(): Promise<{
    location: LocationCoords | null;
    age: number;
    source: string;
  }> {
    try {
      const cachedData = await withTimeout(
        AsyncStorage.getItem(CACHE_KEY),
        STORAGE_TIMEOUT
      );
      
      if (!cachedData) {
        return { location: null, age: 0, source: 'none' };
      }

      const cached: CachedLocation = JSON.parse(cachedData);
      const age = Date.now() - cached.timestamp;
      
      return {
        location: cached.location,
        age,
        source: cached.source,
      };
    } catch (error) {
      console.warn('Failed to get last known location:', error);
      return { location: null, age: 0, source: 'error' };
    }
  }

  /**
   * Check if cached location is still valid (within 5 minutes)
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
   * Clear cached location
   */
  static async clearCache(): Promise<void> {
    try {
      await withTimeout(
        AsyncStorage.removeItem(CACHE_KEY),
        STORAGE_TIMEOUT
      );
    } catch (error) {
      console.warn('Failed to clear location cache:', error);
    }
  }

  /**
   * Check if we have any cached location data
   */
  static async hasCache(): Promise<boolean> {
    try {
      const cachedData = await withTimeout(
        AsyncStorage.getItem(CACHE_KEY),
        STORAGE_TIMEOUT
      );
      return cachedData !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache status for debugging
   */
  static async getCacheStatus(): Promise<{
    hasCache: boolean;
    isValid: boolean;
    ageMinutes: number;
    source: string;
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
          source: 'none',
        };
      }

      const cached: CachedLocation = JSON.parse(cachedData);
      const ageMinutes = this.getCacheAge(cached.timestamp);
      const isValid = this.isCacheValid(cached.timestamp);

      return {
        hasCache: true,
        isValid,
        ageMinutes,
        source: cached.source,
      };
    } catch (error) {
      return {
        hasCache: false,
        isValid: false,
        ageMinutes: 0,
        source: 'error',
      };
    }
  }
} 