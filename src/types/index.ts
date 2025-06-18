// Main types index - re-exports from specialized type files
// This file serves as the single entry point for all types

// Core entity types (single source of truth)
export {
  // Base types
  BaseEntity,
  
  // Core entities
  User,
  Place,
  CheckIn,
  List,
  ListPlace,
  UserPlaceRating,
  RecommendationRequest,
  
  // Context interfaces
  UserPreferences,
  BangkokContext,
  CheckInContext,
  WeatherContext,
  
  // Type aliases
  ThumbsRating,
  AuthProvider,
  CompanionType,
  MealType,
  TransportationMethod,
  ListVisibility,
  ListType,
  
  // Create/Update types
  CheckInCreate,
  CheckInUpdate,
  UserUpdate,
  ListCreate,
  ListUpdate,
  ProfileUpdate, // Legacy alias
  
  // Curated list types
  CuratedListCreate,
  CuratedListUpdate,
  CuratedListFilters,
} from './entities';

// Place-specific types (non-entity)
export {
  PlaceSuggestion,
  PlaceDetails,
  PlaceReview,
  Location,
  PlaceSearchParams
} from './places';

// Legacy types from other files (keeping for backwards compatibility)
export {
  BangkokDistrict,
  CuisineType,
  DietaryRestriction,
  PriceRange,
  TransportMethod,
  ActivityType
} from './database';

// Auth-specific types
export {
  AuthResponse,
  SocialAuthData
} from './user';

// Check-in specific constants and tags
export {
  BANGKOK_TAGS,
  BangkokTag
} from './checkins';

// Navigation and location types
export {
  AuthState,
  LocationCoords,
  MapRegion,
  RootStackParamList
} from './navigation';

// Recommendation engine types
export {
  TimeOfDay,
  CityTier,
  RecommendationType,
  TimeContext,
  RecommendationContext,
  Recommendation,
  RecommendationSet,
  RecommendationFilters,
  TimeBasedConfig
} from './recommendations';

// Supabase database schema types
export type { Database } from './supabase';

// Place availability types
export type {
  PlaceAvailabilityConfig,
  PlaceAvailabilityResult,
  PlaceCountResult
} from '../services/placeAvailability'; 