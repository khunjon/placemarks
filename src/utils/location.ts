import * as Location from 'expo-location';
import { LocationCoords, MapRegion } from '../types/navigation';

// Location error types for better error handling
export enum LocationErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  LOCATION_UNAVAILABLE = 'LOCATION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  SETTINGS_DISABLED = 'SETTINGS_DISABLED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface LocationError {
  type: LocationErrorType;
  message: string;
  userMessage: string;
  canRetry: boolean;
}

// Bangkok boundaries for city detection
export const BANGKOK_BOUNDS = {
  north: 13.956,
  south: 13.494,
  east: 100.928,
  west: 100.321,
};

// Default fallback location (Bangkok center)
export const DEFAULT_LOCATION: LocationCoords = {
  latitude: 13.7563,
  longitude: 100.5018,
};

export const locationUtils = {
  // Request location permissions with better error handling
  async requestLocationPermission(): Promise<{
    granted: boolean;
    status: Location.PermissionStatus;
    error?: LocationError;
  }> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        return { granted: true, status };
      }
      
      const error = this.createLocationError(status);
      return { granted: false, status, error };
    } catch (error) {
      console.error('Error requesting location permission:', error);
             return {
         granted: false,
         status: Location.PermissionStatus.UNDETERMINED,
         error: {
           type: LocationErrorType.UNKNOWN,
           message: 'Failed to request location permission',
           userMessage: 'Unable to request location access. Please try again.',
           canRetry: true,
         },
       };
    }
  },

  // Create appropriate error based on permission status
  createLocationError(status: Location.PermissionStatus): LocationError {
    switch (status) {
      case 'denied':
        return {
          type: LocationErrorType.PERMISSION_DENIED,
          message: 'Location permission denied',
          userMessage: 'Location access is disabled. Please enable it in your device settings to get personalized recommendations.',
          canRetry: false,
        };
      case 'undetermined':
        return {
          type: LocationErrorType.PERMISSION_DENIED,
          message: 'Location permission undetermined',
          userMessage: 'Location permission is required for personalized recommendations.',
          canRetry: true,
        };
      default:
        return {
          type: LocationErrorType.UNKNOWN,
          message: `Unknown permission status: ${status}`,
          userMessage: 'Unable to access location. Please check your device settings.',
          canRetry: true,
        };
    }
  },

  // Get current location with enhanced error handling
  async getCurrentLocation(): Promise<{
    location: LocationCoords | null;
    error?: LocationError;
  }> {
    try {
      const permissionResult = await this.requestLocationPermission();
      if (!permissionResult.granted) {
        return { location: null, error: permissionResult.error };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || undefined,
        },
      };
    } catch (error: any) {
      console.error('Error getting current location:', error);
      
      const locationError = this.parseLocationError(error);
      return { location: null, error: locationError };
    }
  },

  // Parse location errors into user-friendly messages
  parseLocationError(error: any): LocationError {
    if (error.code) {
      switch (error.code) {
        case 'E_LOCATION_TIMEOUT':
          return {
            type: LocationErrorType.TIMEOUT,
            message: 'Location request timed out',
            userMessage: 'Location request timed out. Please try again.',
            canRetry: true,
          };
        case 'E_LOCATION_UNAVAILABLE':
          return {
            type: LocationErrorType.LOCATION_UNAVAILABLE,
            message: 'Location services unavailable',
            userMessage: 'Location services are not available. Please check your device settings.',
            canRetry: false,
          };
        case 'E_LOCATION_SETTINGS_UNSATISFIED':
          return {
            type: LocationErrorType.SETTINGS_DISABLED,
            message: 'Location settings not satisfied',
            userMessage: 'Location settings need to be enabled. Please check your device settings.',
            canRetry: false,
          };
        case 'E_NETWORK_ERROR':
          return {
            type: LocationErrorType.NETWORK_ERROR,
            message: 'Network error while getting location',
            userMessage: 'Network error. Please check your internet connection and try again.',
            canRetry: true,
          };
      }
    }

    return {
      type: LocationErrorType.UNKNOWN,
      message: error.message || 'Unknown location error',
      userMessage: 'Unable to get your current location. Please try again.',
      canRetry: true,
    };
  },

  // Check if location is within Bangkok bounds
  isLocationInBangkok(coords: LocationCoords): boolean {
    return (
      coords.latitude >= BANGKOK_BOUNDS.south &&
      coords.latitude <= BANGKOK_BOUNDS.north &&
      coords.longitude >= BANGKOK_BOUNDS.west &&
      coords.longitude <= BANGKOK_BOUNDS.east
    );
  },

  // Get city context based on location
  getCityContext(coords: LocationCoords): 'bangkok' | 'standard' {
    return this.isLocationInBangkok(coords) ? 'bangkok' : 'standard';
  },

  // Calculate distance between two coordinates (in kilometers)
  calculateDistance(
    coord1: LocationCoords,
    coord2: LocationCoords
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) *
        Math.cos(this.toRadians(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Convert degrees to radians
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  // Create map region from coordinates
  createMapRegion(
    coords: LocationCoords,
    latitudeDelta: number = 0.01,
    longitudeDelta: number = 0.01
  ): MapRegion {
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta,
      longitudeDelta,
    };
  },

  // Reverse geocoding - get address from coordinates
  async reverseGeocode(coords: LocationCoords): Promise<{
    address: string | null;
    error?: LocationError;
  }> {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        const parts = [
          address.name,
          address.street,
          address.city,
          address.region,
          address.country,
        ].filter(Boolean);
        
        return { address: parts.join(', ') };
      }
      
      return { address: null };
    } catch (error: any) {
      console.error('Error reverse geocoding:', error);
      return {
        address: null,
        error: {
          type: LocationErrorType.NETWORK_ERROR,
          message: 'Reverse geocoding failed',
          userMessage: 'Unable to get address for this location.',
          canRetry: true,
        },
      };
    }
  },

  // Forward geocoding - get coordinates from address
  async geocode(address: string): Promise<{
    location: LocationCoords | null;
    error?: LocationError;
  }> {
    try {
      const locations = await Location.geocodeAsync(address);
      
      if (locations.length > 0) {
        const location = locations[0];
        return {
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        };
      }
      
      return { location: null };
    } catch (error: any) {
      console.error('Error geocoding:', error);
      return {
        location: null,
        error: {
          type: LocationErrorType.NETWORK_ERROR,
          message: 'Geocoding failed',
          userMessage: 'Unable to find location for this address.',
          canRetry: true,
        },
      };
    }
  },

  // Format distance for display
  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  },

  // Get location context string for UI display
  getLocationContextString(coords: LocationCoords): string {
    const isInBangkok = this.isLocationInBangkok(coords);
    
    if (isInBangkok) {
      return 'Near Bangkok';
    }
    
    // For locations outside Bangkok, provide a generic context
    return 'Your area';
  },

  // Check if coordinates are the default fallback location
  isDefaultLocation(coords: LocationCoords): boolean {
    return (
      Math.abs(coords.latitude - DEFAULT_LOCATION.latitude) < 0.001 &&
      Math.abs(coords.longitude - DEFAULT_LOCATION.longitude) < 0.001
    );
  },

  // Validate coordinates
  isValidCoordinates(coords: LocationCoords): boolean {
    return (
      typeof coords.latitude === 'number' &&
      typeof coords.longitude === 'number' &&
      coords.latitude >= -90 &&
      coords.latitude <= 90 &&
      coords.longitude >= -180 &&
      coords.longitude <= 180
    );
  },
}; 