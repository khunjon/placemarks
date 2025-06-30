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

// Multi-city context interface for scalable city support
export interface CityContext {
  city_code: string; // 'BKK', 'TYO', 'NYC', 'LON', etc.
  environment: 'indoor' | 'outdoor' | 'mixed';
  location_type: string; // City-specific location types
  noise_level: 'quiet' | 'moderate' | 'loud';
  air_conditioning?: boolean;
  transport_proximity?: {
    system: string; // 'BTS', 'MRT', 'JR', 'Subway', etc.
    distance: 'walking' | 'near' | 'far' | 'none';
    stations?: string[];
  };
  price_context: {
    tier: string; // City-specific price tier
    local_scale: string[]; // Ordered array of price descriptors for this city
  };
  local_characteristics: Record<string, any>; // Flexible city-specific metadata
  crowd_level?: 'empty' | 'few' | 'moderate' | 'busy' | 'packed';
  wifi_available?: boolean;
  parking_available?: boolean;
}

// Legacy Bangkok context interface - deprecated, use CityContext instead
// @deprecated Use CityContext with city_code: 'BKK' instead
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
 * Place entity - matches google_places_cache table in Supabase
 * Primary identifier is google_place_id (string), not UUID
 */
export interface Place {
  google_place_id: string; // Primary identifier - Google Place ID
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: any; // JSONB field
  current_opening_hours?: any; // JSONB field
  utc_offset_minutes?: number; // UTC offset in minutes from Google Places API
  timezone?: string; // Timezone identifier (e.g., 'Asia/Bangkok') from geo-tz
  photos?: any; // JSONB field
  reviews?: any; // JSONB field
  business_status: string;
  place_id?: string; // Google's deprecated place_id field
  plus_code?: any; // JSONB field
  cached_at: string;
  expires_at: string;
  last_accessed?: string;
  access_count: number;
  has_basic_data: boolean;
  has_contact_data: boolean;
  has_hours_data: boolean;
  has_photos_data: boolean;
  has_reviews_data: boolean;
  created_at: string;
  updated_at: string;
  photo_urls?: string[]; // Array of photo URLs
}

/**
 * EditorialPlace entity - matches editorial_places table in Supabase
 * Contains admin-curated content for places
 */
export interface EditorialPlace {
  google_place_id: string; // Primary key - references google_places_cache
  custom_description?: string;
  featured_image_url?: string;
  pro_tips?: string;
  editorial_notes?: string;
  is_featured: boolean;
  admin_tags?: string[];
  priority_score: number;
  city_context?: any; // JSONB field
  created_at: string;
  updated_at: string;
  created_by?: string; // UUID reference to auth.users
  updated_by?: string; // UUID reference to auth.users
}

/**
 * EnrichedPlace interface - matches enriched_places view in Supabase
 * Combines Google Places data with editorial content and computed fields
 */
export interface EnrichedPlace extends Place {
  // Editorial fields (null if no editorial content)
  custom_description?: string;
  featured_image_url?: string;
  pro_tips?: string;
  editorial_notes?: string;
  is_featured?: boolean;
  admin_tags?: string[];
  priority_score?: number;
  city_context?: any;
  editorial_created_by?: string;
  editorial_updated_by?: string;
  editorial_created_at?: string;
  editorial_updated_at?: string;
  
  // Computed fields
  primary_image_url?: string; // Editorial override or first Google photo
  display_description?: string; // Editorial override or excerpt from reviews
  has_editorial_content: boolean;
  effective_priority_score: number;
  enhanced_types: string[]; // Google types + admin tags
  effective_rating?: number;
  effective_rating_count?: number;
}

/**
 * CheckIn entity - matches check_ins table in Supabase
 * Now uses google_place_id as place reference
 */
export interface CheckIn extends BaseEntity {
  user_id: string;
  place_id: string; // References google_places_cache.google_place_id
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
    google_place_id: string;
    name: string;
    formatted_address: string;
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
 * Now uses google_place_id as place reference
 */
export interface ListPlace {
  list_id: string;
  place_id: string; // References google_places_cache.google_place_id
  added_at: string;
  notes?: string;
  personal_rating?: number;
  visit_count?: number;
  sort_order?: number;
  // Joined relationships (when included)
  places?: Place;
  lists?: List;
}

/**
 * UserPlaceRating entity - matches user_place_ratings table in Supabase
 * Now uses google_place_id as place reference
 */
export interface UserPlaceRating extends BaseEntity {
  user_id: string;
  place_id: string; // References google_places_cache.google_place_id
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
  place_id: string; // Google Place ID (string)
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

// Editorial place create/update types
export interface EditorialPlaceCreate {
  google_place_id: string;
  custom_description?: string;
  featured_image_url?: string;
  pro_tips?: string;
  editorial_notes?: string;
  is_featured?: boolean;
  admin_tags?: string[];
  priority_score?: number;
  city_context?: any;
}

export interface EditorialPlaceUpdate {
  custom_description?: string;
  featured_image_url?: string;
  pro_tips?: string;
  editorial_notes?: string;
  is_featured?: boolean;
  admin_tags?: string[];
  priority_score?: number;
  city_context?: any;
} 