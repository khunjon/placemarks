/**
 * Centralized cache configuration for all caching strategies across the app.
 * This file serves as the single source of truth for cache TTL values, timeouts,
 * and other cache-related configuration.
 */

import { config } from './environment';

export const CACHE_CONFIG = {
  // Google Places API Cache
  GOOGLE_PLACES: {
    CACHE_DURATION_DAYS: config.googlePlacesCacheDays,
    STALE_TIME_DAYS: 180, // 6 months before data is considered truly stale
    RATE_LIMIT_DELAY_MS: 100, // Delay between API calls to avoid rate limits
  },

  // Place Details Cache
  PLACE_DETAILS: {
    VALIDITY_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
    SOFT_EXPIRY_DURATION_MS: 12 * 60 * 60 * 1000, // 12 hours (background refresh)
    STORAGE_TIMEOUT_MS: 2000, // 2 seconds for AsyncStorage operations
  },

  // Location Cache
  LOCATION: {
    VALIDITY_DURATION_MS: 3 * 60 * 1000, // 3 minutes
    STORAGE_TIMEOUT_MS: 1500, // 1.5 seconds for AsyncStorage operations
    RETRY_INTERVAL_MS: 90 * 1000, // 90 seconds between retries
    MIN_RETRY_DELAY_MS: 15 * 1000, // 15 seconds minimum retry delay
    BACKGROUND_UPDATE_INTERVAL_MS: 2 * 60 * 1000, // 2 minutes for background updates
    SESSION_UPDATE_INTERVAL_MS: 1 * 60 * 60 * 1000, // 1 hour for session updates
    RECENT_CACHE_THRESHOLD_MS: 3 * 60 * 1000, // 3 minutes for recent location cache
  },

  // Check-In Search Cache
  CHECK_IN_SEARCH: {
    CACHE_EXPIRY_MS: 15 * 60 * 1000, // 15 minutes
    MEMORY_CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes for in-memory cache
    LOCATION_THRESHOLD_METERS: 100, // 100 meters location threshold
  },

  // Lists Cache
  LISTS: {
    VALIDITY_DURATION_MS: 60 * 60 * 1000, // 60 minutes
    SOFT_EXPIRY_DURATION_MS: 30 * 60 * 1000, // 30 minutes (background refresh)
    STORAGE_TIMEOUT_MS: 2000, // 2 seconds for AsyncStorage operations
  },

  // List Details Cache
  LIST_DETAILS: {
    VALIDITY_DURATION_MS: 60 * 60 * 1000, // 60 minutes
    SOFT_EXPIRY_DURATION_MS: 30 * 60 * 1000, // 30 minutes (background refresh)
    STORAGE_TIMEOUT_MS: 2000, // 2 seconds for AsyncStorage operations
  },

  // Places Service Cache
  PLACES_SERVICE: {
    AUTOCOMPLETE_CACHE_DURATION_MS: 10 * 60 * 1000, // 10 minutes
    PLACES_CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  },

  // API Timeouts
  TIMEOUTS: {
    API_DEFAULT_MS: 10000, // 10 seconds for general API calls
    API_AUTOCOMPLETE_MS: 5000, // 5 seconds for autocomplete calls
    LOCATION_REQUEST_MS: 3000, // 3 seconds for location requests
    DATABASE_OPERATION_MS: 10000, // 10 seconds for database operations
  },

  // UI Debouncing
  DEBOUNCE: {
    AUTOCOMPLETE_MS: 300, // 300ms for autocomplete input
    SEARCH_MS: 800, // 800ms for search input
  },
} as const;

/**
 * Helper functions for common time calculations
 */
export const CACHE_HELPERS = {
  /**
   * Convert days to milliseconds
   */
  daysToMs: (days: number): number => days * 24 * 60 * 60 * 1000,

  /**
   * Convert hours to milliseconds
   */
  hoursToMs: (hours: number): number => hours * 60 * 60 * 1000,

  /**
   * Convert minutes to milliseconds
   */
  minutesToMs: (minutes: number): number => minutes * 60 * 1000,

  /**
   * Convert seconds to milliseconds
   */
  secondsToMs: (seconds: number): number => seconds * 1000,

  /**
   * Check if a timestamp is expired based on TTL
   */
  isExpired: (timestamp: number, ttlMs: number): boolean => {
    return Date.now() - timestamp > ttlMs;
  },

  /**
   * Get expiration date for a given TTL
   */
  getExpirationDate: (ttlMs: number): Date => {
    return new Date(Date.now() + ttlMs);
  },
} as const;

/**
 * Cache strategy documentation
 * 
 * ## Cache Layer Strategy
 * 
 * 1. **Google Places Cache (90 days)**
 *    - Long-term cache for expensive API calls
 *    - Configurable via environment variable
 *    - 180-day stale threshold before complete invalidation
 * 
 * 2. **Place Details Cache (24 hours)**
 *    - Medium-term cache for place details
 *    - 12-hour soft expiry for background refresh
 *    - Balances freshness with API cost optimization
 * 
 * 3. **Location Cache (3 minutes)**
 *    - Short-term cache for user location
 *    - Frequent updates to maintain accuracy
 *    - Background refresh every 2 minutes
 * 
 * 4. **Search Caches (5-15 minutes)**
 *    - Check-in search: 15 minutes for location-based searches
 *    - Memory cache: 5 minutes for frequently accessed data
 *    - Autocomplete: 10 minutes for search suggestions
 * 
 * 5. **Lists Cache (60 minutes)**
 *    - User-generated content cache
 *    - 30-minute soft expiry for background updates
 *    - Real-time invalidation on user actions
 * 
 * ## Performance Considerations
 * 
 * - **Cost Optimization**: Longer TTLs for expensive Google Places API calls
 * - **User Experience**: Shorter TTLs for location and search for accuracy
 * - **Background Refresh**: Soft expiry allows serving cached data while updating
 * - **Rate Limiting**: Built-in delays to respect API rate limits
 * - **Timeout Protection**: All cache operations have timeout safeguards
 */