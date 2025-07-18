// Core entity types based on actual database schema
// Single source of truth for all database entities

// Base entity interface
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

// User entity - matches public.users table
export interface User extends BaseEntity {
  email: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider: AuthProvider;
  preferences?: UserPreferences;
}

// User preferences interface
export interface UserPreferences {
  dietary_restrictions?: string[];
  favorite_cuisines?: string[];
  budget_preference?: string;
  [key: string]: any;
}

// Auth provider type
export type AuthProvider = 'email' | 'google' | 'apple' | 'facebook';

// Place entity - matches google_places_cache table (primary place source)
export interface Place {
  // Primary keys and identifiers
  google_place_id: string; // Primary key
  id?: string; // Legacy compatibility - maps to google_place_id
  place_id?: string; // Alternative place_id field
  
  // Basic place information
  name?: string;
  formatted_address?: string;
  address?: string; // Legacy compatibility - maps to formatted_address
  geometry?: any; // JSONB geometry data from Google Places
  coordinates?: [number, number]; // Legacy compatibility - computed from geometry
  
  // Place categorization
  types?: string[]; // Google Places API types array
  place_type?: string; // Legacy compatibility - computed from types[0]
  primary_type?: string; // Legacy compatibility - computed from types[0]
  
  // Ratings and reviews
  rating?: number; // Google rating (numeric)
  user_ratings_total?: number;
  price_level?: number;
  
  // Contact information
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  
  // Hours and availability
  opening_hours?: any; // JSONB opening hours data
  current_opening_hours?: any; // JSONB current opening hours
  
  // Media and content
  photos?: any; // JSONB photos data from Google Places
  photo_urls?: string[]; // Pre-generated photo URLs array
  reviews?: any; // JSONB reviews data
  
  // Status and metadata
  business_status?: string;
  plus_code?: any; // JSONB plus code data
  
  // Cache management
  cached_at?: string;
  expires_at?: string;
  last_accessed?: string;
  access_count?: number;
  has_basic_data?: boolean;
  has_contact_data?: boolean;
  has_hours_data?: boolean;
  has_photos_data?: boolean;
  has_reviews_data?: boolean;
  
  // Legacy context fields
  bangkok_context?: BangkokContext; // Legacy field for backwards compatibility
  city_context?: CityContext; // New field replacing bangkok_context
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

// Legacy places table entity - for backwards compatibility
export interface LegacyPlaceEntity extends BaseEntity {
  google_place_id: string;
  name: string;
  address?: string;
  coordinates?: any; // PostGIS geometry type
  place_type?: string;
  price_level?: number;
  bangkok_context?: BangkokContext;
  hours?: any; // Legacy hours field
  phone?: string;
  website?: string;
  google_rating?: number;
  photos_urls?: string[]; // Legacy photo URLs array
  hours_open?: any; // New structured hours data
  google_types?: string[]; // Google Places API types
  primary_type?: string; // Generated from google_types[0] or place_type
  photo_references?: any; // JSONB photo references with metadata
}

// Editorial places entity - matches editorial_places table  
export interface EditorialPlace {
  google_place_id: string; // Primary key, references google_places_cache
  custom_description?: string;
  featured_image_url?: string;
  pro_tips?: string;
  editorial_notes?: string;
  is_featured?: boolean;
  admin_tags?: string[];
  priority_score?: number;
  city_context?: CityContext;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

// Enriched place - combination of Place + EditorialPlace data
export interface EnrichedPlace extends Place {
  // Editorial fields
  custom_description?: string;
  featured_image_url?: string;
  pro_tips?: string;
  editorial_notes?: string;
  is_featured?: boolean;
  admin_tags?: string[];
  priority_score?: number;
  city_context?: CityContext;
  
  // Computed fields for backward compatibility
  id?: string; // For components expecting id field
  address?: string; // Alias for formatted_address
  coordinates?: [number, number]; // [lng, lat] computed from geometry
  primary_type?: string; // First type from types array
  place_type?: string; // Legacy field mapping
  bangkok_context?: BangkokContext; // Legacy Bangkok context
  
  // Additional computed/display fields
  timezone?: string; // Computed timezone
  has_editorial_content?: boolean; // Whether place has editorial content
  display_description?: string; // Computed display description
}

// Check-in entity - matches check_ins table
export interface CheckIn extends BaseEntity {
  user_id?: string;
  place_id?: string; // References google_places_cache.google_place_id
  timestamp?: string;
  tags?: string[];
  context?: CheckInContext;
  photos?: string[];
  notes?: string;
  weather_context?: WeatherContext;
  companion_type?: CompanionType;
  meal_type?: MealType;
  transportation_method?: TransportationMethod;
  visit_duration?: number;
  would_return?: boolean;
  rating?: ThumbsRating; // thumbs_down, neutral, thumbs_up
  comment?: string; // Alias for notes
}

// List entity - matches lists table
export interface List extends BaseEntity {
  user_id?: string;
  name: string;
  description?: string;
  auto_generated?: boolean;
  list_type?: string;
  icon?: string;
  color?: string;
  type?: ListType;
  is_default?: boolean;
  visibility?: ListVisibility;
  publisher_name?: string;
  publisher_logo_url?: string;
  external_link?: string;
  location_scope?: string;
  is_curated?: boolean;
  curator_priority?: number;
  default_list_type?: string;
}

// List with places - List + place count and places array
export interface ListWithPlaces extends List {
  places: EnrichedListPlace[];
  place_count: number;
}

// List place entity - matches list_places table
export interface ListPlace {
  list_id: string;
  place_id?: string; // References google_places_cache.google_place_id
  added_at?: string;
  notes?: string;
  personal_rating?: number; // 1-5 rating
  visit_count?: number;
  sort_order?: number;
}

// Enriched list place - ListPlace + Place data
export interface EnrichedListPlace extends ListPlace {
  place?: EnrichedPlace;
}

// User place rating entity - matches user_place_ratings table
export interface UserPlaceRating extends BaseEntity {
  user_id: string;
  place_id?: string; // References google_places_cache.google_place_id
  rating_type: UserRatingType;
  rating_value?: number; // 1-5 scale
  notes?: string;
}

// Recommendation request entity - matches recommendation_requests table
export interface RecommendationRequest extends BaseEntity {
  user_id?: string;
  context: any; // JSONB context data
  suggested_places?: string[]; // Array of UUIDs
  user_feedback?: string;
  timestamp?: string;
}

// Context interfaces
export interface CityContext {
  district?: string;
  neighborhood?: string;
  environment_type?: 'urban' | 'nature' | 'mixed';
  noise_level?: 'quiet' | 'moderate' | 'busy';
  tourist_level?: 'local' | 'some_tourists' | 'very_touristy';
  bts_accessibility?: {
    nearest_station?: string;
    walking_distance_minutes?: number;
    walking_difficulty?: 'easy' | 'moderate' | 'difficult';
  };
  [key: string]: any;
}

// Legacy Bangkok context - for backwards compatibility
export interface BangkokContext extends CityContext {
  // All fields inherited from CityContext
}

export interface CheckInContext {
  weather?: WeatherContext;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  special_occasion?: string;
  mood?: string;
  [key: string]: any;
}

export interface WeatherContext {
  temperature?: number;
  condition?: string;
  humidity?: number;
  description?: string;
  [key: string]: any;
}

// Type aliases and enums
export type ThumbsRating = 'thumbs_down' | 'neutral' | 'thumbs_up';
export type UserRatingType = 'thumbs_up' | 'thumbs_down' | 'neutral';
export type CompanionType = 'solo' | 'partner' | 'couple' | 'family' | 'friends' | 'business' | 'group' | 'date';
export type MealType = 'breakfast' | 'brunch' | 'lunch' | 'afternoon_snack' | 'dinner' | 'snack' | 'drinks' | 'late_night';
export type TransportationMethod = 'walking' | 'bts' | 'mrt' | 'bus' | 'taxi' | 'grab' | 'motorcycle' | 'car' | 'boat';
export type ListVisibility = 'private' | 'friends' | 'public' | 'curated';
export type ListType = 'user' | 'auto' | 'curated';

// Create/Update types
export type CheckInCreate = Omit<CheckIn, 'id' | 'created_at' | 'updated_at'>;
export type CheckInUpdate = Partial<CheckInCreate>;
export type UserUpdate = Partial<Omit<User, 'id' | 'email' | 'created_at'>>;
export type ListCreate = Omit<List, 'id' | 'created_at' | 'updated_at'>;
export type ListUpdate = Partial<ListCreate>;

// Legacy alias
export type ProfileUpdate = UserUpdate;

// Editorial place types
export type EditorialPlaceCreate = Omit<EditorialPlace, 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type EditorialPlaceUpdate = Partial<EditorialPlaceCreate>;

// Curated list types
export type CuratedListCreate = Omit<List, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
  is_curated: true;
  type: 'curated';
  visibility: 'curated' | 'public';
};

export type CuratedListUpdate = Partial<CuratedListCreate>;

export interface CuratedListFilters {
  location_scope?: string;
  publisher_name?: string;
  is_featured?: boolean;
  min_priority?: number;
}

// CheckIn with place data - for components expecting this interface
export interface CheckInWithPlace extends CheckIn {
  place?: EnrichedPlace;
}

// User recommendation preferences - matches user_recommendation_preferences table
export interface UserRecommendationPreferences extends BaseEntity {
  user_id: string;
  search_radius_km: number;
  price_ranges: number[];
}