import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { LocationCoords } from '../types/navigation';
import { locationUtils } from '../utils/location';

export interface LocationState {
  location: LocationCoords | null;
  loading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  hasPermission: boolean;
}

export interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  fallbackToBangkok?: boolean;
  autoRequest?: boolean;
}

// Bangkok center coordinates as fallback
const BANGKOK_CENTER: LocationCoords = {
  latitude: 13.7563,
  longitude: 100.5018,
};

export function useLocation(options: UseLocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 300000, // 5 minutes
    fallbackToBangkok = true,
    autoRequest = true,
  } = options;

  const [state, setState] = useState<LocationState>({
    location: null,
    loading: false,
    error: null,
    permissionStatus: null,
    hasPermission: false,
  });

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
        setState(prev => ({
          ...prev,
          error: 'Location permission denied. Please enable location access in your device settings to get personalized recommendations.',
        }));
        
        // Apply fallback if enabled
        if (fallbackToBangkok) {
          setState(prev => ({
            ...prev,
            location: BANGKOK_CENTER,
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
        setState(prev => ({
          ...prev,
          location: BANGKOK_CENTER,
        }));
      }
      
      return false;
    }
  }, [fallbackToBangkok]);

  // Get current location
  const getCurrentLocation = useCallback(async (forceRefresh = false): Promise<LocationCoords | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Check if we already have a recent location and don't need to refresh
      if (!forceRefresh && state.location && !state.error) {
        setState(prev => ({ ...prev, loading: false }));
        return state.location;
      }

      // Check/request permission first
      const hasPermission = state.hasPermission || await requestPermission();
      
      if (!hasPermission) {
        setState(prev => ({ ...prev, loading: false }));
        return fallbackToBangkok ? BANGKOK_CENTER : null;
      }

      // Get location with appropriate accuracy
      const accuracy = enableHighAccuracy 
        ? Location.Accuracy.High 
        : Location.Accuracy.Balanced;

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy,
      });

      const coords: LocationCoords = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy || undefined,
      };

      setState(prev => ({
        ...prev,
        location: coords,
        loading: false,
        error: null,
      }));

      return coords;
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

      // Apply fallback on error
      if (fallbackToBangkok) {
        setState(prev => ({
          ...prev,
          location: BANGKOK_CENTER,
          error: `${errorMessage} Using Bangkok as default location.`,
        }));
        return BANGKOK_CENTER;
      }

      return null;
    }
  }, [state.location, state.error, state.hasPermission, enableHighAccuracy, maximumAge, requestPermission, fallbackToBangkok]);

  // Retry getting location (useful for error recovery)
  const retry = useCallback(() => {
    getCurrentLocation(true);
  }, [getCurrentLocation]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (autoRequest) {
      checkPermissionStatus().then(status => {
        if (status === 'granted') {
          getCurrentLocation();
        } else if (fallbackToBangkok) {
          setState(prev => ({
            ...prev,
            location: BANGKOK_CENTER,
            error: 'Enable location access for personalized recommendations.',
          }));
        }
      });
    }
  }, [autoRequest, checkPermissionStatus, getCurrentLocation, fallbackToBangkok]);

  return {
    // State
    ...state,
    
    // Actions
    requestPermission,
    getCurrentLocation,
    retry,
    clearError,
    checkPermissionStatus,
    
    // Computed values
    isLocationAvailable: !!state.location,
    isUsingFallback: state.location?.latitude === BANGKOK_CENTER.latitude && 
                     state.location?.longitude === BANGKOK_CENTER.longitude,
    
    // Utils
    formatDistance: locationUtils.formatDistance,
    calculateDistance: locationUtils.calculateDistance,
  };
} 