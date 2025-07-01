import { LocationCoords } from '../types/navigation';
import { locationUtils } from '../utils/location';
import { cacheManager } from './cacheManager';
import { ErrorFactory, ErrorLogger, withRetry, DEFAULT_RETRY_CONFIG } from '../utils/errorHandling';
import { CACHE_CONFIG } from '../config/cacheConfig';

interface LocationServiceState {
  currentLocation: LocationCoords | null;
  isUsingFallback: boolean;
  retryAttempts: number;
  lastRetryTime: number | null;
  isRetrying: boolean;
}

class LocationService {
  private state: LocationServiceState = {
    currentLocation: null,
    isUsingFallback: false,
    retryAttempts: 0,
    lastRetryTime: null,
    isRetrying: false,
  };

  private listeners: Set<(location: LocationCoords, source: string) => void> = new Set();
  private retryInterval: NodeJS.Timeout | null = null;
  
  // Configuration - optimized for better responsiveness
  private readonly RETRY_INTERVAL = CACHE_CONFIG.LOCATION.RETRY_INTERVAL_MS;
  private readonly MAX_RETRY_ATTEMPTS = 8; // Reduced to 8 attempts to avoid excessive retries
  private readonly MIN_RETRY_DELAY = CACHE_CONFIG.LOCATION.MIN_RETRY_DELAY_MS;

  // Bangkok fallback coordinates
  private readonly BANGKOK_CENTER: LocationCoords = {
    latitude: 13.7563,
    longitude: 100.5018,
  };

  /**
   * Subscribe to location updates
   */
  subscribe(callback: (location: LocationCoords, source: string) => void) {
    this.listeners.add(callback);
    
    // Immediately call with current location if available
    if (this.state.currentLocation) {
      callback(
        this.state.currentLocation, 
        this.state.isUsingFallback ? 'fallback' : 'location'
      );
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of location update
   */
  private notifyListeners(location: LocationCoords, source: string) {
    this.listeners.forEach(callback => {
      try {
        callback(location, source);
      } catch (error) {
        ErrorLogger.log(
          ErrorFactory.location(
            'Location listener error',
            { service: 'location', operation: 'notifyListeners', metadata: { source } },
            error instanceof Error ? error : undefined
          )
        );
      }
    });
  }

  /**
   * Update the current location and start/stop retry logic as needed
   */
  updateLocation(location: LocationCoords, source: 'gps' | 'network' | 'fallback' | 'cache' | 'offline') {
    const wasUsingFallback = this.state.isUsingFallback;
    const isNowUsingFallback = source === 'fallback';

    this.state.currentLocation = location;
    this.state.isUsingFallback = isNowUsingFallback;

    // Reset retry attempts if we got a real location
    if (!isNowUsingFallback && wasUsingFallback) {
      this.state.retryAttempts = 0;
      this.state.lastRetryTime = null;
      this.stopRetryTimer();
      console.log('✅ LocationService: Got real location, stopping retries');
    }

    // Start retry timer if we're using fallback
    if (isNowUsingFallback && !wasUsingFallback) {
      this.startRetryTimer();
      console.log('🔄 LocationService: Using fallback, starting background retries');
    }

    // Notify listeners
    this.notifyListeners(location, source);
  }

  /**
   * Start the retry timer for background location fetching
   */
  private startRetryTimer() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }

    this.retryInterval = setInterval(() => {
      this.attemptLocationRetry();
    }, this.RETRY_INTERVAL);

    // Also attempt an immediate retry after a short delay
    setTimeout(() => {
      this.attemptLocationRetry();
    }, this.MIN_RETRY_DELAY);
  }

  /**
   * Stop the retry timer
   */
  private stopRetryTimer() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  /**
   * Attempt to get real location in the background
   */
  private async attemptLocationRetry() {
    // Don't retry if we already have a real location
    if (!this.state.isUsingFallback) {
      this.stopRetryTimer();
      return;
    }

    // Don't retry if we've exceeded max attempts
    if (this.state.retryAttempts >= this.MAX_RETRY_ATTEMPTS) {
      this.stopRetryTimer();
      console.log('❌ LocationService: Max retry attempts reached, stopping retries');
      return;
    }

    // Don't retry if we're already in the middle of a retry
    if (this.state.isRetrying) {
      return;
    }

    // Don't retry too frequently
    if (this.state.lastRetryTime && Date.now() - this.state.lastRetryTime < this.MIN_RETRY_DELAY) {
      return;
    }

    try {
      this.state.isRetrying = true;
      this.state.retryAttempts += 1;
      this.state.lastRetryTime = Date.now();

      console.log(`🔄 LocationService: Retry attempt ${this.state.retryAttempts}/${this.MAX_RETRY_ATTEMPTS}`);

      // Use the location utils to get real location
      const locationResult = await locationUtils.getLocationWithCache({
        forceRefresh: true,
        useCache: false,
        enableOfflineFallback: false,
      });

      if (locationResult.location && locationResult.source !== 'fallback') {
        // Got a real location!
        console.log('✅ LocationService: Background retry successful!');
        this.updateLocation(locationResult.location, locationResult.source as 'gps' | 'network');
        
        // Save to cache
        await cacheManager.location.store(locationResult.location, locationResult.source as 'gps' | 'network');
      } else {
        console.log(`⏭️ LocationService: Retry ${this.state.retryAttempts} failed, will try again later`);
      }
    } catch (error) {
      ErrorLogger.log(
        ErrorFactory.location(
          `Background retry ${this.state.retryAttempts} failed`,
          { 
            service: 'location', 
            operation: 'backgroundRetry', 
            metadata: { 
              attempt: this.state.retryAttempts,
              maxAttempts: this.MAX_RETRY_ATTEMPTS 
            } 
          },
          error instanceof Error ? error : undefined
        )
      );
    } finally {
      this.state.isRetrying = false;
    }
  }

  /**
   * Force a location retry now (called by user action)
   */
  async forceRetry(): Promise<boolean> {
    if (this.state.isRetrying) {
      return false;
    }

    try {
      this.state.isRetrying = true;
      console.log('🔄 LocationService: Force retry triggered by user');

      const locationResult = await locationUtils.getLocationWithCache({
        forceRefresh: true,
        useCache: false,
        enableOfflineFallback: false,
      });

      if (locationResult.location && locationResult.source !== 'fallback') {
        console.log('✅ LocationService: Force retry successful!');
        this.updateLocation(locationResult.location, locationResult.source as 'gps' | 'network');
        await cacheManager.location.store(locationResult.location, locationResult.source as 'gps' | 'network');
        return true;
      }

      return false;
    } catch (error) {
      ErrorLogger.log(
        ErrorFactory.location(
          'Force retry failed',
          { 
            service: 'location', 
            operation: 'forceRetry', 
            metadata: { triggeredBy: 'user' } 
          },
          error instanceof Error ? error : undefined
        )
      );
      return false;
    } finally {
      this.state.isRetrying = false;
    }
  }

  /**
   * Get current location state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get current location
   */
  getCurrentLocation(): LocationCoords | null {
    return this.state.currentLocation;
  }

  /**
   * Check if currently using fallback location
   */
  isUsingFallback(): boolean {
    return this.state.isUsingFallback;
  }

  /**
   * Cleanup - stop all timers
   */
  cleanup() {
    this.stopRetryTimer();
    this.listeners.clear();
  }
}

// Export singleton instance
export const locationService = new LocationService(); 