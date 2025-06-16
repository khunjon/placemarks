import * as Location from 'expo-location';
import { LocationCoords, MapRegion } from '../types/navigation';

export const locationUtils = {
  // Request location permissions
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  },

  // Get current location
  async getCurrentLocation(): Promise<LocationCoords | null> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
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
  async reverseGeocode(coords: LocationCoords): Promise<string | null> {
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
        
        return parts.join(', ');
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  },

  // Forward geocoding - get coordinates from address
  async geocode(address: string): Promise<LocationCoords | null> {
    try {
      const locations = await Location.geocodeAsync(address);
      
      if (locations.length > 0) {
        const location = locations[0];
        return {
          latitude: location.latitude,
          longitude: location.longitude,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding:', error);
      return null;
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
}; 