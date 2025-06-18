// Core entity types - Single source of truth for all database entities
// These types match the Supabase schema exactly

// Base entity interface that all entities extend
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

// User preferences interface
export interface UserPreferences {
  favorite_districts: string[];
  dietary_restrictions: string[];
  preferred_cuisines: string[];
  price_range: 'budget' | 'mid' | 'upscale' | 'luxury';
  transport_preference: 'walking' | 'bts' | 'taxi' | 'car';
  activity_types: string[];
}

// Bangkok-specific context interfaces
export interface BangkokContext {
  environment: 'indoor' | 'outdoor' | 'mixed';
  location_type: 'mall' | 'street' | 'building' | 'market' | 'rooftop' | 'riverside';
  bts_proximity: 'walking' | 'near' | 'far' | 'none';
  air_conditioning: boolean;
  noise_level: 'quiet' | 'moderate' | 'loud';
  price_tier: 'street' | 'casual' | 'mid' | 'upscale' | 'luxury';
  crowd_level?: 'empty' | 'few' | 'moderate' | 'busy' | 'packed';
  wifi_available?: boolean;
  parking_available?: boolean;
}

export interface CheckInContext {
  environment: 'indoor' | 'outdoor' | 'mixed';
  location_type: 'mall' | 'street' | 'building' | 'market' | 'rooftop' | 'riverside';
  bts_proximity: 'walking' | 'near' | 'far' | 'none';
  air_conditioning: boolean;
  noise_level: 'quiet' | 'moderate' | 'loud';
  price_tier: 'street' | 'casual' | 'mid' | 'upscale' | 'luxury';
  crowd_level: 'empty' | 'few' | 'moderate' | 'busy' | 'packed';
  wifi_available: boolean;
  parking_available: boolean;
}

export interface WeatherContext {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  temperature_feel: 'cool' | 'comfortable' | 'warm' | 'hot' | 'sweltering';
  humidity_level: 'low' | 'moderate' | 'high';
}

// Type aliases for better type safety
export type ThumbsRating = 'thumbs_down' | 'neutral' | 'thumbs_up';
export type AuthProvider = 'email' | 'google' | 'facebook' | 'apple';
export type CompanionType = 'solo' | 'partner' | 'friends' | 'family' | 'business' | 'date';
export type MealType = 'breakfast' | 'brunch' | 'lunch' | 'afternoon_snack' | 'dinner' | 'late_night' | 'drinks';
export type TransportationMethod = 'walking' | 'bts' | 'mrt' | 'bus' | 'taxi' | 'grab' | 'motorcycle' | 'car' | 'boat';
export type ListVisibility = 'private' | 'friends' | 'public' | 'curated';
export type ListType = 'user' | 'auto' | 'curated';

// Core entity interfaces matching Supabase schema exactly

/**
 * User entity - matches users table in Supabase
 */
export interface User extends BaseEntity {
  email: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider: AuthProvider;
  preferences: UserPreferences;
}

/**
 * Place entity - matches places table in Supabase
 */
export interface Place extends BaseEntity {
  google_place_id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [longitude, latitude] format to match PostGIS POINT
  place_type?: string;
  google_types?: string[];
  primary_type?: string;
  price_level?: number;
  bangkok_context: BangkokContext;
}

/**
 * CheckIn entity - matches check_ins table in Supabase
 */
export interface CheckIn extends BaseEntity {
  user_id: string;
  place_id: string;
  timestamp: string;
  rating?: ThumbsRating; // Updated to use thumbs rating system
  tags: string[];
  context: CheckInContext;
  photos: string[];
  notes?: string;
  comment?: string; // Alias for notes
  weather_context?: WeatherContext;
  companion_type?: CompanionType;
  meal_type?: MealType;
  transportation_method?: TransportationMethod;
  visit_duration?: number; // in minutes
  would_return?: boolean;
  // Joined relationships (when included)
  places?: {
    id: string;
    name: string;
    address: string;
    google_place_id: string;
  };
  users?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

/**
 * List entity - matches lists table in Supabase
 */
export interface List extends BaseEntity {
  user_id?: string; // Nullable for curated lists
  name: string;
  auto_generated: boolean;
  visibility: ListVisibility; // Privacy control field
  description?: string;
  list_type?: string;
  icon?: string;
  color?: string;
  type?: ListType;
  is_default?: boolean;
  // New curated list fields
  publisher_name?: string;
  publisher_logo_url?: string;
  external_link?: string;
  location_scope?: string;
  is_curated: boolean;
  curator_priority?: number;
}

/**
 * ListPlace entity - matches list_places table in Supabase
 */
export interface ListPlace {
  list_id: string;
  place_id: string;
  added_at: string;
  notes?: string;
  // Joined relationships (when included)
  places?: Place;
  lists?: List;
}

/**
 * UserPlaceRating entity - matches user_place_ratings table in Supabase
 */
export interface UserPlaceRating extends BaseEntity {
  user_id: string;
  place_id: string;
  rating_type: ThumbsRating;
  rating_value?: number; // Optional numeric rating 1-5
  notes?: string;
}

/**
 * RecommendationRequest entity - matches recommendation_requests table in Supabase
 */
export interface RecommendationRequest extends BaseEntity {
  user_id: string;
  context: Record<string, any>; // JSONB context
  suggested_places: string[]; // Array of place UUIDs
  user_feedback?: string;
  timestamp: string;
}

// Create and update types for entities
export interface CheckInCreate {
  place_id: string;
  rating?: ThumbsRating;
  tags?: string[];
  context: CheckInContext;
  photos?: string[];
  notes?: string;
  comment?: string;
  weather_context?: WeatherContext;
  companion_type?: CompanionType;
  meal_type?: MealType;
  transportation_method?: TransportationMethod;
  visit_duration?: number;
  would_return?: boolean;
}

export interface CheckInUpdate {
  rating?: ThumbsRating;
  tags?: string[];
  context?: CheckInContext;
  photos?: string[];
  notes?: string;
  comment?: string;
  weather_context?: WeatherContext;
  companion_type?: CompanionType;
  meal_type?: MealType;
  transportation_method?: TransportationMethod;
  visit_duration?: number;
  would_return?: boolean;
}

export interface UserUpdate {
  full_name?: string;
  avatar_url?: string;
  preferences?: Partial<UserPreferences>;
}

export interface ListCreate {
  name: string;
  auto_generated?: boolean;
  visibility?: ListVisibility; // Privacy control field
  description?: string;
  list_type?: string;
  icon?: string;
  color?: string;
  type?: ListType;
  is_default?: boolean;
  // Curated list fields
  publisher_name?: string;
  publisher_logo_url?: string;
  external_link?: string;
  location_scope?: string;
  is_curated?: boolean;
  curator_priority?: number;
}

export interface ListUpdate {
  name?: string;
  visibility?: ListVisibility; // Privacy control field
  description?: string;
  list_type?: string;
  icon?: string;
  color?: string;
  type?: ListType;
  is_default?: boolean;
  // Curated list fields
  publisher_name?: string;
  publisher_logo_url?: string;
  external_link?: string;
  location_scope?: string;
  is_curated?: boolean;
  curator_priority?: number;
}

// Legacy type aliases for backwards compatibility during migration
export type ProfileUpdate = UserUpdate;

// Curated list specific interfaces
export interface CuratedListCreate {
  name: string;
  description?: string;
  publisher_name: string;
  publisher_logo_url?: string;
  external_link?: string;
  location_scope?: string;
  curator_priority?: number;
  list_type?: string;
  icon?: string;
  color?: string;
  visibility?: 'public' | 'curated'; // Curated lists should be public or curated
  is_curated: true;
  type: 'curated';
}

export interface CuratedListUpdate {
  name?: string;
  description?: string;
  publisher_name?: string;
  publisher_logo_url?: string;
  external_link?: string;
  location_scope?: string;
  curator_priority?: number;
  list_type?: string;
  icon?: string;
  color?: string;
  visibility?: 'public' | 'curated';
}

// Helper type for filtering curated lists
export interface CuratedListFilters {
  location_scope?: string;
  list_type?: string;
  publisher_name?: string;
  min_priority?: number;
} 