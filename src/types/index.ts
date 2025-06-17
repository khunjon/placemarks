// Main types index - re-exports from specialized type files
// This file serves as the single entry point for all types

// Core database types (source of truth)
export {
  User,
  Place,
  List,
  UserPreferences,
  BangkokContext,
  CheckInContext,
  BangkokDistrict,
  CuisineType,
  DietaryRestriction,
  PriceRange,
  TransportMethod,
  ActivityType
} from './database';

// User-specific types
export {
  AuthResponse,
  ProfileUpdate,
  AuthProvider,
  SocialAuthData
} from './user';

// Place-specific types
export {
  PlaceSuggestion,
  PlaceDetails,
  PlaceReview,
  Location,
  PlaceSearchParams
} from './places';

// CheckIn-specific types
export {
  ThumbsRating,
  CheckIn,
  WeatherContext,
  CompanionType,
  MealType,
  TransportationMethod,
  CheckInCreate,
  CheckInUpdate,
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
  RecommendationRequest,
  TimeBasedConfig
} from './recommendations';

// Supabase database schema types
export type { Database } from './supabase'; 