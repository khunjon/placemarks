import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { LocationCoords } from '../types/navigation';
import { locationUtils } from '../utils/location';
import { LocationCache } from '../services/locationCache';

export interface LocationState {
  location: LocationCoords | null;
  loading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  hasPermission: boolean;
  source: 'cache' | 'gps' | 'network' | 'offline' | 'fallback' | null;
  lastUpdated: number | null;
}

export interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  fallbackToBangkok?: boolean;
  autoRequest?: boolean;
  enableBackgroundUpdates?: boolean;
  enableCaching?: boolean;
  enableOfflineFallback?: boolean;
  disabled?: boolean; // For debugging - completely disable location operations
}

// Bangkok center coordinates as fallback
const BANGKOK_CENTER: LocationCoords = {
  latitude: 13.7563,
  longitude: 100.5018,
};

const BACKGROUND_UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useLocation(options: UseLocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    fallbackToBangkok = true,
    autoRequest = true,
    enableBackgroundUpdates = true,
    enableCaching = true,
    enableOfflineFallback = true,
    disabled = false,
  } = options;

  const [state, setState] = useState<LocationState>({
    location: null,
    loading: false,
    error: null,
    permissionStatus: null,
    hasPermission: false,
    source: null,
    lastUpdated: null,
  });

  const backgroundUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Check current permission status
  const checkPermissionStatus = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setState(prev => ({
        ...prev,
        permissionStatus: status,
        hasPermission: status === 'granted',
      }));
      return status;
    } catch (error) {
      console.error('Error checking location permission:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to check location permissions',
      }));
      return 'undetermined' as Location.PermissionStatus;
    }
  }, []);

  // Request location permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      setState(prev => ({
        ...prev,
        permissionStatus: status,
        hasPermission: status === 'granted',
        loading: false,
      }));

      if (status === 'denied') {
        const errorMessage = 'Location permission denied. Please enable location access in your device settings to get personalized recommendations.';
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
        
        // Apply fallback if enabled
        if (fallbackToBangkok) {
          await LocationCache.saveLocation(BANGKOK_CENTER, 'fallback');
          setState(prev => ({
            ...prev,
            location: BANGKOK_CENTER,
            source: 'fallback',
            lastUpdated: Date.now(),
            error: 'Using Bangkok as default location. Enable location access for personalized recommendations.',
          }));
        }
        
        return false;
      }

      if (status === 'granted') {
        return true;
      }

      // Handle other statuses (undetermined, etc.)
      setState(prev => ({
        ...prev,
        error: 'Location permission is required for personalized recommendations.',
      }));
      
      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to request location permission. Please try again.',
      }));
      
      // Apply fallback on error
      if (fallbackToBangkok) {
        await LocationCache.saveLocation(BANGKOK_CENTER, 'fallback');
        setState(prev => ({
          ...prev,
          location: BANGKOK_CENTER,
          source: 'fallback',
          lastUpdated: Date.now(),
        }));
      }
      
      return false;
    }
  }, [fallbackToBangkok]);

  // Get current location with caching
  const getCurrentLocation = useCallback(async (forceRefresh = false): Promise<LocationCoords | null> => {
    if (isUpdatingRef.current && !forceRefresh) {
      return state.location;
    }

    try {
      isUpdatingRef.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Check if we already have a recent cached location and don't need to refresh
      if (!forceRefresh && enableCaching && state.location && state.source === 'cache') {
        setState(prev => ({ ...prev, loading: false }));
        return state.location;
      }

      // Use the enhanced location service with caching
      const locationResult = await locationUtils.getLocationWithCache({
        forceRefresh,
        useCache: enableCaching,
        enableOfflineFallback,
      });

      if (locationResult.location) {
        setState(prev => ({
          ...prev,
          location: locationResult.location,
          source: locationResult.source,
          lastUpdated: Date.now(),
          loading: false,
          error: locationResult.error?.userMessage || null,
        }));

        return locationResult.location;
      }

      // If no location and fallback is enabled
      if (fallbackToBangkok) {
        await LocationCache.saveLocation(BANGKOK_CENTER, 'fallback');
        setState(prev => ({
          ...prev,
          location: BANGKOK_CENTER,
          source: 'fallback',
          lastUpdated: Date.now(),
          loading: false,
          error: 'Unable to get your location. Using Bangkok as default.',
        }));
        return BANGKOK_CENTER;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: locationResult.error?.userMessage || 'Unable to get your current location.',
      }));

      return null;
    } catch (error: any) {
      console.error('Error getting current location:', error);
      
      let errorMessage = 'Unable to get your current location.';
      
      // Provide specific error messages
      if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'Location services are not available. Please check your device settings.';
      } else if (error.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
        errorMessage = 'Location settings need to be enabled. Please check your device settings.';
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      // Try offline fallback
      if (enableOfflineFallback) {
        try {
          const lastKnown = await LocationCache.getLastKnownLocation();
          if (lastKnown.location) {
            setState(prev => ({
              ...prev,
              location: lastKnown.location,
              source: 'offline',
              lastUpdated: Date.now() - lastKnown.age,
              error: `${errorMessage} Using last known location.`,
            }));
            return lastKnown.location;
          }
        } catch (cacheError) {
          console.warn('Failed to get last known location:', cacheError);
        }
      }

      // Apply final fallback
      if (fallbackToBangkok) {
        try {
          await LocationCache.saveLocation(BANGKOK_CENTER, 'fallback');
          setState(prev => ({
            ...prev,
            location: BANGKOK_CENTER,
            source: 'fallback',
            lastUpdated: Date.now(),
            error: `${errorMessage} Using Bangkok as default location.`,
          }));
          return BANGKOK_CENTER;
        } catch (fallbackError) {
          console.warn('Failed to save fallback location:', fallbackError);
        }
      }

      return null;
    } finally {
      isUpdatingRef.current = false;
    }
  }, [enableCaching, enableOfflineFallback, fallbackToBangkok]);

  // Background location update
  const startBackgroundUpdates = useCallback(() => {
    if (!enableBackgroundUpdates) return;

    // Clear existing interval
    if (backgroundUpdateRef.current) {
      clearInterval(backgroundUpdateRef.current);
    }

    backgroundUpdateRef.current = setInterval(async () => {
      if (state.hasPermission && !isUpdatingRef.current) {
        console.log('Background location update triggered');
        try {
          await getCurrentLocation(false);
        } catch (error) {
          console.warn('Background location update failed:', error);
        }
      }
    }, BACKGROUND_UPDATE_INTERVAL);
  }, [enableBackgroundUpdates, state.hasPermission, getCurrentLocation]);

  // Stop background updates
  const stopBackgroundUpdates = useCallback(() => {
    if (backgroundUpdateRef.current) {
      clearInterval(backgroundUpdateRef.current);
      backgroundUpdateRef.current = null;
    }
  }, []);

  // Load cached location on mount (non-blocking)
  const loadCachedLocation = useCallback(async () => {
    if (!enableCaching) return;

    try {
      const cachedLocation = await LocationCache.getCachedLocation();
      if (cachedLocation) {
        setState(prev => ({
          ...prev,
          location: cachedLocation,
          source: 'cache',
          lastUpdated: Date.now(),
        }));
        return;
      }
      
      if (enableOfflineFallback) {
        // Try to get last known location for offline use
        const lastKnown = await LocationCache.getLastKnownLocation();
        if (lastKnown.location) {
          setState(prev => ({
            ...prev,
            location: lastKnown.location,
            source: 'offline',
            lastUpdated: Date.now() - lastKnown.age,
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load cached location:', error);
    }
  }, [enableCaching, enableOfflineFallback]);

  // Initialize location on mount (non-blocking)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // If disabled, immediately set Bangkok fallback and return
    if (disabled) {
      setState(prev => ({
        ...prev,
        location: BANGKOK_CENTER,
        source: 'fallback',
        lastUpdated: Date.now(),
        error: 'Location disabled for testing',
      }));
      return;
    }

    const initialize = async () => {
      try {
        // Load cached location first (immediate)
        await loadCachedLocation();
        
        // Check permissions (non-blocking)
        const permissionStatus = await checkPermissionStatus();
        
        // Auto-request location if enabled and we have permission
        if (autoRequest && permissionStatus === 'granted') {
          // Don't await this - let it run in background
          getCurrentLocation().catch(error => {
            console.warn('Auto location request failed:', error);
          });
        } else if (autoRequest && fallbackToBangkok && !state.location) {
          // Set fallback immediately if no permission and no cached location
          try {
            await LocationCache.saveLocation(BANGKOK_CENTER, 'fallback');
            setState(prev => ({
              ...prev,
              location: BANGKOK_CENTER,
              source: 'fallback',
              lastUpdated: Date.now(),
              error: 'Enable location access for personalized recommendations.',
            }));
          } catch (error) {
            console.warn('Failed to set fallback location:', error);
          }
        }
      } catch (error) {
        console.warn('Location initialization failed:', error);
      }
    };

    // Run initialization without blocking
    initialize();
  }, []); // Empty dependency array - only run once

  // Start/stop background updates based on permission
  useEffect(() => {
    if (state.hasPermission && enableBackgroundUpdates) {
      startBackgroundUpdates();
    } else {
      stopBackgroundUpdates();
    }

    return () => {
      stopBackgroundUpdates();
    };
  }, [state.hasPermission, enableBackgroundUpdates, startBackgroundUpdates, stopBackgroundUpdates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundUpdates();
    };
  }, [stopBackgroundUpdates]);

  // Refresh location manually
  const refreshLocation = useCallback(async () => {
    return await getCurrentLocation(true);
  }, [getCurrentLocation]);

  // Get cache status for debugging
  const getCacheStatus = useCallback(async () => {
    try {
      return await LocationCache.getCacheStatus();
    } catch (error) {
      console.warn('Failed to get cache status:', error);
      return {
        hasCache: false,
        isValid: false,
        ageMinutes: 0,
        source: 'error',
      };
    }
  }, []);

  return {
    ...state,
    requestPermission,
    getCurrentLocation,
    refreshLocation,
    getCacheStatus,
    startBackgroundUpdates,
    stopBackgroundUpdates,
  };
} 