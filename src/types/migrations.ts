/**
 * Type utilities for the place_id migration
 * Provides helpers for transitioning between UUID and google_place_id systems
 */

import { Place, EnrichedPlace, LegacyPlace } from './index';

/**
 * Utility functions for converting between old and new place formats
 */
export class PlaceMigrationUtils {
  /**
   * Convert geometry object to coordinates array for backwards compatibility
   */
  static geometryToCoordinates(geometry: Place['geometry']): [number, number] {
    return [geometry.location.lng, geometry.location.lat];
  }

  /**
   * Convert coordinates array to geometry object
   */
  static coordinatesToGeometry(coordinates: [number, number]): Place['geometry'] {
    return {
      location: {
        lat: coordinates[1],
        lng: coordinates[0]
      }
    };
  }

  /**
   * Convert new Place format to legacy format for backwards compatibility
   * @deprecated Use this only during transition period
   */
  static toLegacyPlace(place: Place, legacyId?: string): LegacyPlace {
    return {
      id: legacyId || place.google_place_id, // Fallback to google_place_id if no UUID
      google_place_id: place.google_place_id,
      name: place.name || 'Unknown Place',
      address: place.formatted_address || '',
      coordinates: this.geometryToCoordinates(place.geometry),
      place_type: place.types?.[0],
      google_types: place.types,
      primary_type: place.types?.[0],
      price_level: place.price_level,
      // Legacy context fields would need to be derived if needed
    };
  }

  /**
   * Convert legacy place format to new Place format
   */
  static fromLegacyPlace(legacyPlace: LegacyPlace): Partial<Place> {
    return {
      google_place_id: legacyPlace.google_place_id,
      name: legacyPlace.name,
      formatted_address: legacyPlace.address,
      geometry: this.coordinatesToGeometry(legacyPlace.coordinates),
      types: legacyPlace.google_types || [],
      price_level: legacyPlace.price_level,
      business_status: 'OPERATIONAL', // Default assumption
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      access_count: 0,
      has_basic_data: true,
      has_contact_data: false,
      has_hours_data: false,
      has_photos_data: false,
      has_reviews_data: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Extract display-friendly data from EnrichedPlace
   */
  static getDisplayData(place: EnrichedPlace) {
    return {
      id: place.google_place_id,
      name: place.name,
      address: place.formatted_address,
      coordinates: this.geometryToCoordinates(place.geometry),
      primaryImage: place.primary_image_url,
      description: place.display_description,
      rating: place.effective_rating,
      ratingCount: place.effective_rating_count,
      priceLevel: place.price_level,
      types: place.enhanced_types,
      isFeatured: place.is_featured || false,
      hasEditorialContent: place.has_editorial_content,
      phone: place.formatted_phone_number,
      website: place.website,
      isOperational: place.business_status === 'OPERATIONAL',
    };
  }
}

/**
 * Type guards for place identification
 */
export class PlaceTypeGuards {
  static isEnrichedPlace(place: any): place is EnrichedPlace {
    return place && 
           typeof place.google_place_id === 'string' &&
           typeof place.has_editorial_content === 'boolean' &&
           'effective_priority_score' in place;
  }

  static isLegacyPlace(place: any): place is LegacyPlace {
    return place && 
           'id' in place && 
           'google_place_id' in place &&
           Array.isArray(place.coordinates) &&
           place.coordinates.length === 2;
  }

  static isGooglePlaceId(id: string): boolean {
    // Google Place IDs typically start with ChIJ, EhI, or similar patterns
    return typeof id === 'string' && 
           (id.startsWith('ChIJ') || id.startsWith('EhI') || id.startsWith('EkI') || id.startsWith('ChIJ'));
  }

  static isUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}

/**
 * Constants for the migration
 */
export const MIGRATION_CONSTANTS = {
  // Default cache expiry for places
  DEFAULT_CACHE_HOURS: 24,
  
  // Placeholder values for missing data
  UNKNOWN_ADDRESS: 'Address Unknown',
  PLACEHOLDER_NAME: 'Placeholder - Missing Place Data',
  
  // Bangkok center coordinates for fallback
  BANGKOK_CENTER: {
    lat: 13.7563,
    lng: 100.5018
  },
  
  // Priority scores
  DEFAULT_PRIORITY: 0,
  FEATURED_PRIORITY_MIN: 50,
  
  // Business status values
  BUSINESS_STATUS: {
    OPERATIONAL: 'OPERATIONAL',
    CLOSED_TEMPORARILY: 'CLOSED_TEMPORARILY',
    CLOSED_PERMANENTLY: 'CLOSED_PERMANENTLY'
  }
} as const;

/**
 * Migration validation helpers
 */
export class MigrationValidation {
  /**
   * Validate that a place has required fields for the new system
   */
  static validatePlace(place: Partial<Place>): string[] {
    const errors: string[] = [];
    
    if (!place.google_place_id) {
      errors.push('Missing google_place_id');
    }
    
    if (!place.name) {
      errors.push('Missing name');
    }
    
    if (!place.formatted_address) {
      errors.push('Missing formatted_address');
    }
    
    if (!place.geometry?.location) {
      errors.push('Missing geometry.location');
    }
    
    if (!Array.isArray(place.types)) {
      errors.push('Missing or invalid types array');
    }
    
    return errors;
  }

  /**
   * Validate editorial place data
   */
  static validateEditorialPlace(place: any): string[] {
    const errors: string[] = [];
    
    if (!place.google_place_id) {
      errors.push('Missing google_place_id');
    }
    
    if (place.priority_score !== undefined && (typeof place.priority_score !== 'number' || place.priority_score < 0)) {
      errors.push('Invalid priority_score - must be non-negative number');
    }
    
    if (place.admin_tags !== undefined && !Array.isArray(place.admin_tags)) {
      errors.push('Invalid admin_tags - must be array');
    }
    
    return errors;
  }
}