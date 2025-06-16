// Recommendation Engine Types for Placemarks
// Structured for easy integration with Bangkok curated data and Google Places API

import { Location } from '../services/cityContext';

export type TimeOfDay = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
export type CityTier = 'bangkok' | 'standard';
export type RecommendationType = 'curated' | 'popular' | 'nearby' | 'trending' | 'personal';

export interface TimeContext {
  timeOfDay: TimeOfDay;
  hour: number;
  isWeekend: boolean;
  date: Date;
}

export interface RecommendationContext {
  userLocation: Location;
  timeContext: TimeContext;
  cityTier: CityTier;
  userId?: string;
}

export interface Recommendation {
  id: string;
  name: string;
  description: string;
  location: Location;
  address?: string;
  category: string;
  subcategory?: string;
  type: RecommendationType;
  
  // Scoring and relevance
  score: number; // 0-100 relevance score
  distanceKm: number;
  
  // Time-based relevance
  timeRelevance: {
    bestTimes: TimeOfDay[];
    currentRelevance: number; // 0-1 how relevant right now
  };
  
  // Visual and metadata
  imageUrl?: string;
  tags: string[];
  priceRange?: 1 | 2 | 3 | 4; // $ to $$$$
  rating?: number; // 1-5 stars
  reviewCount?: number;
  
  // Bangkok-specific data (for curated recommendations)
  bangkokData?: {
    district: string;
    localTips?: string[];
    bestTransport?: string;
    crowdLevel?: 'low' | 'medium' | 'high';
  };
  
  // Google Places data (for API recommendations)
  googleData?: {
    placeId: string;
    businessStatus?: string;
    openingHours?: string[];
    phoneNumber?: string;
    website?: string;
  };
}

export interface RecommendationSet {
  context: RecommendationContext;
  recommendations: Recommendation[];
  generatedAt: Date;
  totalCount: number;
  
  // Grouped by type for easy display
  sections: {
    curated: Recommendation[];
    popular: Recommendation[];
    nearby: Recommendation[];
    trending: Recommendation[];
    personal: Recommendation[];
  };
}

export interface RecommendationFilters {
  categories?: string[];
  priceRange?: {
    min: 1;
    max: 4;
  };
  maxDistance?: number; // in km
  timeRelevant?: boolean; // only show time-relevant places
  minRating?: number;
  excludeVisited?: boolean;
}

export interface RecommendationRequest {
  context: RecommendationContext;
  filters?: RecommendationFilters;
  limit?: number;
  includePersonal?: boolean;
}

// Time-based configuration
export interface TimeBasedConfig {
  morning: {
    categories: string[];
    keywords: string[];
    startHour: number;
    endHour: number;
  };
  lunch: {
    categories: string[];
    keywords: string[];
    startHour: number;
    endHour: number;
  };
  afternoon: {
    categories: string[];
    keywords: string[];
    startHour: number;
    endHour: number;
  };
  dinner: {
    categories: string[];
    keywords: string[];
    startHour: number;
    endHour: number;
  };
  evening: {
    categories: string[];
    keywords: string[];
    startHour: number;
    endHour: number;
  };
} 