// Recommendation Engine Types for Placemarks
// ✅ Updated for Google Place ID architecture
// Database-backed recommendation system types

import { Location } from './navigation';

export type TimeOfDay = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
export type CityTier = 'bangkok' | 'standard';

export interface TimeContext {
  timeOfDay: TimeOfDay;
  hour: number;
  isWeekend: boolean;
  date: Date;
}

export interface DatabaseRecommendationRequest {
  userId: string;
  latitude: number;
  longitude: number;
  limit?: number;
  timeContext?: TimeContext;
}

export interface ScoredPlace {
  // Google Places Cache data
  google_place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  business_status?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  
  // Calculated fields
  distance_km: number;
  recommendation_score: number;
  
  // Optional metadata
  photo_urls?: string[];
  website?: string;
  formatted_phone_number?: string;
  editorial_summary?: string;
}

export interface RecommendationResponse {
  places: ScoredPlace[];
  hasMorePlaces: boolean;
  totalAvailable?: number;
  generatedAt: Date;
  radiusKm: number;
  excludedCheckedInCount?: number;
} 