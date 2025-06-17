import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { LocationCoords } from '../types/navigation';
import { locationUtils } from '../utils/location';
import { LocationCache } from '../services/locationCache';
import { locationService } from '../services/locationService';

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
  sessionMode?: boolean; // New: Only update once per session or after long periods
  sessionUpdateInterval?: number; // How long before allowing session updates (default: 1 hour)
}

// Bangkok center coordinates as fallback
const BANGKOK_CENTER: LocationCoords = {
  latitude: 13.7563,
  longitude: 100.5018,
};

const BACKGROUND_UPDATE_INTERVAL = 2 * 60 * 1000; // Reduced to 2 minutes for faster updates

export function useLocation(options: UseLocationOptions = {}) {
  const {
    enableHighAccuracy = false, // Changed default to false for better performance
    fallbackToBangkok = true,
    autoRequest = true,
    enableBackgroundUpdates = true,
    enableCaching = true,
    enableOfflineFallback = true,
    disabled = false,
    sessionMode = false,
    sessionUpdateInterval = 1 * 60 * 60 * 1000, // 1 hour in milliseconds
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
  const locationServiceUnsubscribeRef = useRef<(() => void) | null>(null);
  const lastBackgroundUpdateRef = useRef<number>(0); // Track last update time
  const sessionLocationLoadedRef = useRef(false); // Track if we've loaded location in this session
  const sessionStartTimeRef = useRef<number>(Date.now()); // Track session start time

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

          // Update global location service with fallback
          locationService.updateLocation(BANGKOK_CENTER, 'fallback');
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

  // Get current location with caching - optimized version
  const getCurrentLocation = useCallback(async (forceRefresh = false): Promise<LocationCoords | null> => {
    if (isUpdatingRef.current && !forceRefresh) {
      return state.location;
    }

    // Session mode logic: only update if forced, or if we haven't loaded in this session, 
    // or if enough time has passed since session start
    if (sessionMode && !forceRefresh) {
      const timeSinceSessionStart = Date.now() - sessionStartTimeRef.current;
      
      // If we already have a location in this session and not enough time has passed, skip
      if (sessionLocationLoadedRef.current && timeSinceSessionStart < sessionUpdateInterval) {
        console.log('📍 Session mode: Skipping location update, using existing location');
        return state.location;
      }
      
      // If we have a cached location and haven't loaded in this session yet, use cache
      if (!sessionLocationLoadedRef.current && state.location && enableCaching) {
        console.log('📍 Session mode: Using cached location from previous session');
        sessionLocationLoadedRef.current = true;
        return state.location;
      }
    }

    try {
      isUpdatingRef.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Check if we already have a recent cached location and don't need to refresh
      if (!forceRefresh && enableCaching && state.location && state.source === 'cache') {
        setState(prev => ({ ...prev, loading: false }));
        
        // Mark as loaded in session mode
        if (sessionMode) {
          sessionLocationLoadedRef.current = true;
        }
        
        return state.location;
      }

      // Use the enhanced location service with optimized settings
      const locationResult = await locationUtils.getLocationWithCache({
        forceRefresh,
        useCache: enableCaching,
        enableOfflineFallback,
        timeout: 8000, // Reduced timeout to 8 seconds
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

        // Update global location service
        locationService.updateLocation(locationResult.location, locationResult.source);

        // Mark as loaded in session mode
        if (sessionMode) {
          sessionLocationLoadedRef.current = true;
          console.log('📍 Session mode: Location loaded successfully');
        }

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

        // Update global location service with fallback
        locationService.updateLocation(BANGKOK_CENTER, 'fallback');

        // Mark as loaded in session mode
        if (sessionMode) {
          sessionLocationLoadedRef.current = true;
          console.log('📍 Session mode: Using Bangkok fallback');
        }

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
            
            // Mark as loaded in session mode
            if (sessionMode) {
              sessionLocationLoadedRef.current = true;
            }
            
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

          // Update global location service with fallback
          locationService.updateLocation(BANGKOK_CENTER, 'fallback');

          // Mark as loaded in session mode
          if (sessionMode) {
            sessionLocationLoadedRef.current = true;
          }

          return BANGKOK_CENTER;
        } catch (fallbackError) {
          console.warn('Failed to save fallback location:', fallbackError);
        }
      }

      return null;
    } finally {
      isUpdatingRef.current = false;
    }
  }, [enableCaching, enableOfflineFallback, fallbackToBangkok, sessionMode, sessionUpdateInterval]);

  // Optimized background location update
  const startBackgroundUpdates = useCallback(() => {
    // Disable background updates in session mode
    if (!enableBackgroundUpdates || sessionMode) {
      console.log('📍 Background updates disabled (session mode or disabled option)');
      return;
    }

    // Clear existing interval
    if (backgroundUpdateRef.current) {
      clearInterval(backgroundUpdateRef.current);
    }

    backgroundUpdateRef.current = setInterval(async () => {
      // Only update if we have permission and aren't currently updating
      if (!state.hasPermission || isUpdatingRef.current) {
        return;
      }

      // Skip if we updated recently (less than 90 seconds ago)
      const timeSinceLastUpdate = Date.now() - lastBackgroundUpdateRef.current;
      if (timeSinceLastUpdate < 90 * 1000) {
        return;
      }

      // Skip if we have a recent cache (less than 3 minutes old)
      if (state.lastUpdated && (Date.now() - state.lastUpdated) < 3 * 60 * 1000) {
        return;
      }

      console.log('🔄 Background location update triggered');
      lastBackgroundUpdateRef.current = Date.now();
      
      try {
        // Use non-blocking background update
        getCurrentLocation(false).catch(error => {
          console.warn('Background location update failed:', error);
        });
      } catch (error) {
        console.warn('Background location update error:', error);
      }
    }, BACKGROUND_UPDATE_INTERVAL);
  }, [enableBackgroundUpdates, sessionMode, state.hasPermission, state.lastUpdated, getCurrentLocation]);

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

      // Update global location service with fallback
      locationService.updateLocation(BANGKOK_CENTER, 'fallback');
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

            // Update global location service with fallback
            locationService.updateLocation(BANGKOK_CENTER, 'fallback');
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

    // Subscribe to global location service updates
    locationServiceUnsubscribeRef.current = locationService.subscribe((location, source) => {
      // Only update if this is a background update that got a real location
      if (source === 'location' && state.source === 'fallback') {
        console.log('🔄 useLocation: Global service got real location, updating from fallback');
        setState(prev => ({
          ...prev,
          location,
          source: 'gps' as const,
          lastUpdated: Date.now(),
          error: null,
        }));
      }
    });
  }, []); // Empty dependency array - only run once

  // Start/stop background updates based on permission
  useEffect(() => {
    if (state.hasPermission && enableBackgroundUpdates && !sessionMode) {
      startBackgroundUpdates();
    } else {
      stopBackgroundUpdates();
    }

    return () => {
      stopBackgroundUpdates();
    };
  }, [state.hasPermission, enableBackgroundUpdates, sessionMode, startBackgroundUpdates, stopBackgroundUpdates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundUpdates();
      if (locationServiceUnsubscribeRef.current) {
        locationServiceUnsubscribeRef.current();
      }
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

  // Force retry through global location service
  const forceLocationRetry = useCallback(async () => {
    return await locationService.forceRetry();
  }, []);

  // Session-specific functions
  const getSessionInfo = useCallback(() => {
    return {
      sessionMode,
      sessionStartTime: sessionStartTimeRef.current,
      sessionLocationLoaded: sessionLocationLoadedRef.current,
      timeSinceSessionStart: Date.now() - sessionStartTimeRef.current,
      allowsUpdate: sessionMode ? 
        (!sessionLocationLoadedRef.current || (Date.now() - sessionStartTimeRef.current) >= sessionUpdateInterval) :
        true,
    };
  }, [sessionMode, sessionUpdateInterval]);

  const resetSession = useCallback(() => {
    sessionStartTimeRef.current = Date.now();
    sessionLocationLoadedRef.current = false;
    console.log('📍 Session reset - will allow location update on next request');
  }, []);

  return {
    ...state,
    requestPermission,
    getCurrentLocation,
    refreshLocation,
    getCacheStatus,
    startBackgroundUpdates,
    stopBackgroundUpdates,
    forceLocationRetry,
    getSessionInfo,
    resetSession,
  };
} 