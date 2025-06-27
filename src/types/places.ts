import { BangkokContext, CityContext, Place } from './entities';

// Place-specific types that are not core entities
export interface PlaceSuggestion {
  place_id: string; // Google Place ID
  description: string;
  main_text: string;
  secondary_text: string;
}

/**
 * PlaceDetails interface - for detailed place information
 * Updated to use google_place_id as primary identifier
 */
export interface PlaceDetails {
  google_place_id: string; // Primary identifier
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: any; // JSONB field from Google Places
  current_opening_hours?: any; // JSONB field from Google Places
  price_level?: number;
  rating?: number;
  user_ratings_total?: number;
  photos?: any; // JSONB field from Google Places
  photo_urls?: string[]; // Processed photo URLs
  reviews?: PlaceReview[];
  types: string[];
  business_status: string;
  // Computed coordinates for backwards compatibility
  coordinates?: [number, number]; // [lng, lat] derived from geometry
  // Legacy field - for transition period
  city_context?: CityContext;
  bangkok_context?: BangkokContext; // Legacy field
}

export interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface PlaceSearchParams {
  location: Location;
  radius: number;
  type?: string;
  keyword?: string;
  price_level?: number;
}

/**
 * Legacy Place interface - for backwards compatibility
 * @deprecated Use EnrichedPlace from entities instead
 */
export interface LegacyPlace {
  id: string; // UUID from legacy places table
  google_place_id: string;
  name: string;
  address: string;
  coordinates: [number, number];
  place_type?: string;
  google_types?: string[];
  primary_type?: string;
  price_level?: number;
  city_context?: CityContext;
  bangkok_context?: BangkokContext;
} 