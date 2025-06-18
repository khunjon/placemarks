import { supabase } from './supabase';

export interface PlaceAvailabilityConfig {
  radiusMeters: number;
  minimumPlaces: number;
}

export interface PlaceAvailabilityResult {
  hasEnoughPlaces: boolean;
  placeCount: number;
  radiusMeters: number;
  minimumPlaces: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface PlaceCountResult {
  count: number;
  location: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
}

/**
 * Service for checking place availability in geographic areas
 * Uses PostGIS database functions for efficient spatial queries
 */
export class PlaceAvailabilityService {
  // Default configuration
  private readonly DEFAULT_RADIUS_METERS = 15000; // 15km
  private readonly DEFAULT_MINIMUM_PLACES = 5;

  /**
   * Check if there are enough places in an area for recommendations
   * @param latitude - Center latitude
   * @param longitude - Center longitude
   * @param config - Optional configuration for radius and minimum places
   * @returns Promise with availability result
   */
  async checkPlaceAvailability(
    latitude: number,
    longitude: number,
    config?: Partial<PlaceAvailabilityConfig>
  ): Promise<PlaceAvailabilityResult> {
    const radiusMeters = config?.radiusMeters ?? this.DEFAULT_RADIUS_METERS;
    const minimumPlaces = config?.minimumPlaces ?? this.DEFAULT_MINIMUM_PLACES;

    try {
      // Validate input
      this.validateCoordinates(latitude, longitude);
      this.validateRadius(radiusMeters);
      this.validateMinimumPlaces(minimumPlaces);

      // Call the optimized database function (stops counting early for better performance)
      const { data, error } = await supabase.rpc('has_minimum_places_within_radius', {
        center_lat: latitude,
        center_lng: longitude,
        radius_meters: radiusMeters,
        minimum_places: minimumPlaces
      });

      if (error) {
        console.error('Error checking place availability:', error);
        throw new Error(`Failed to check place availability: ${error.message}`);
      }

      // Get the actual count for detailed information
      const countResult = await this.getPlaceCount(latitude, longitude, radiusMeters);

      return {
        hasEnoughPlaces: data as boolean,
        placeCount: countResult.count,
        radiusMeters,
        minimumPlaces,
        location: {
          latitude,
          longitude
        }
      };
    } catch (error) {
      console.error('Error in checkPlaceAvailability:', error);
      throw error;
    }
  }

  /**
   * Get the exact count of places within a radius
   * @param latitude - Center latitude
   * @param longitude - Center longitude
   * @param radiusMeters - Radius in meters (default: 15km)
   * @returns Promise with place count result
   */
  async getPlaceCount(
    latitude: number,
    longitude: number,
    radiusMeters: number = this.DEFAULT_RADIUS_METERS
  ): Promise<PlaceCountResult> {
    try {
      // Validate input
      this.validateCoordinates(latitude, longitude);
      this.validateRadius(radiusMeters);

      // Call the database function
      const { data, error } = await supabase.rpc('count_places_within_radius', {
        center_lat: latitude,
        center_lng: longitude,
        radius_meters: radiusMeters
      });

      if (error) {
        console.error('Error getting place count:', error);
        throw new Error(`Failed to get place count: ${error.message}`);
      }

      return {
        count: data as number,
        location: {
          latitude,
          longitude
        },
        radiusMeters
      };
    } catch (error) {
      console.error('Error in getPlaceCount:', error);
      throw error;
    }
  }

  /**
   * Check multiple locations efficiently
   * @param locations - Array of locations to check
   * @param config - Optional configuration
   * @returns Promise with array of availability results
   */
  async checkMultipleLocations(
    locations: Array<{ latitude: number; longitude: number }>,
    config?: Partial<PlaceAvailabilityConfig>
  ): Promise<PlaceAvailabilityResult[]> {
    const promises = locations.map(location =>
      this.checkPlaceAvailability(location.latitude, location.longitude, config)
    );

    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error checking multiple locations:', error);
      throw error;
    }
  }

  /**
   * Get place availability statistics for different radii
   * @param latitude - Center latitude
   * @param longitude - Center longitude
   * @param radii - Array of radii to check (in meters)
   * @returns Promise with statistics for each radius
   */
  async getPlaceAvailabilityStats(
    latitude: number,
    longitude: number,
    radii: number[] = [5000, 10000, 15000, 20000, 25000]
  ): Promise<Array<{ radiusMeters: number; radiusKm: number; placeCount: number }>> {
    try {
      this.validateCoordinates(latitude, longitude);

      const promises = radii.map(async (radius) => {
        const result = await this.getPlaceCount(latitude, longitude, radius);
        return {
          radiusMeters: radius,
          radiusKm: Math.round(radius / 1000),
          placeCount: result.count
        };
      });

      return await Promise.all(promises);
    } catch (error) {
      console.error('Error getting place availability stats:', error);
      throw error;
    }
  }

  /**
   * Validate coordinates
   */
  private validateCoordinates(latitude: number, longitude: number): void {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }

    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
  }

  /**
   * Validate radius
   */
  private validateRadius(radiusMeters: number): void {
    if (typeof radiusMeters !== 'number' || radiusMeters <= 0) {
      throw new Error('Radius must be a positive number');
    }

    if (radiusMeters > 100000) {
      throw new Error('Radius cannot exceed 100km');
    }
  }

  /**
   * Validate minimum places
   */
  private validateMinimumPlaces(minimumPlaces: number): void {
    if (typeof minimumPlaces !== 'number' || minimumPlaces < 1) {
      throw new Error('Minimum places must be a positive integer');
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): PlaceAvailabilityConfig {
    return {
      radiusMeters: this.DEFAULT_RADIUS_METERS,
      minimumPlaces: this.DEFAULT_MINIMUM_PLACES
    };
  }

  /**
   * Convert meters to kilometers for display
   */
  static metersToKm(meters: number): number {
    return Math.round(meters / 1000);
  }

  /**
   * Convert kilometers to meters
   */
  static kmToMeters(km: number): number {
    return km * 1000;
  }
}

// Export singleton instance
export const placeAvailabilityService = new PlaceAvailabilityService();

// Export utility functions
export const placeAvailabilityUtils = {
  /**
   * Format availability result for display
   */
  formatAvailabilityMessage(result: PlaceAvailabilityResult): string {
    const radiusKm = PlaceAvailabilityService.metersToKm(result.radiusMeters);
    
    if (result.hasEnoughPlaces) {
      return `Found ${result.placeCount} places within ${radiusKm}km - recommendations available!`;
    } else {
      return `Only ${result.placeCount} places within ${radiusKm}km - need ${result.minimumPlaces} for recommendations`;
    }
  },

  /**
   * Get recommendation for radius adjustment
   */
  getRadiusRecommendation(result: PlaceAvailabilityResult): string | null {
    if (result.hasEnoughPlaces) {
      return null;
    }

    const currentRadiusKm = PlaceAvailabilityService.metersToKm(result.radiusMeters);
    const suggestedRadiusKm = Math.min(currentRadiusKm + 10, 50); // Suggest up to 50km max
    
    return `Try expanding search radius to ${suggestedRadiusKm}km`;
  },

  /**
   * Check if location is likely in a supported area (rough bounds check)
   */
  isInSupportedArea(latitude: number, longitude: number): boolean {
    // Rough bounds for Thailand (where most places are located)
    // These bounds are generous to avoid false negatives
    const bounds = {
      north: 21,
      south: 5,
      east: 106,
      west: 97
    };

    return (
      latitude >= bounds.south &&
      latitude <= bounds.north &&
      longitude >= bounds.west &&
      longitude <= bounds.east
    );
  }
}; 