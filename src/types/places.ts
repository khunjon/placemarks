import { BangkokContext, Place } from './database';

// Re-export Place from database for convenience
export { Place } from './database';

export interface PlaceSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export interface PlaceDetails {
  id: string;
  google_place_id: string;
  name: string;
  address: string;
  coordinates: [number, number];
  phone_number?: string;
  website?: string;
  opening_hours?: string[];
  price_level?: number;
  rating?: number;
  photos?: string[];
  reviews?: PlaceReview[];
  types?: string[];
  bangkok_context?: BangkokContext;
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