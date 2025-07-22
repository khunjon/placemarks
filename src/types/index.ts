// Main types index - re-exports from specialized type files
// This file serves as the single entry point for all types

// Core entity types (single source of truth)
export {
  // Base types
  BaseEntity,
  
  // Core entities
  User,
  Place,
  EditorialPlace,
  EnrichedPlace,
  CheckIn,
  List,
  ListPlace,
  UserPlaceRating,
  UserPlacePhoto,
  RecommendationRequest,
  UserRecommendationPreferences,
  
  // Context interfaces
  UserPreferences,
  CityContext,
  BangkokContext, // Legacy - deprecated
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
  
  // Editorial place types
  EditorialPlaceCreate,
  EditorialPlaceUpdate,
  
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
  PlaceSearchParams,
  LegacyPlace // For backwards compatibility
} from './places';

// Legacy types from other files (keeping for backwards compatibility)
// These have been removed from database.ts as they were unused

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
  Location, // Primary location type for the app
  MapRegion,
  RootStackParamList
} from './navigation';

// Recommendation engine types
export {
  TimeOfDay,
  CityTier,
  TimeContext,
  DatabaseRecommendationRequest,
  ScoredPlace,
  RecommendationResponse
} from './recommendations';

// Supabase database schema types
export type { Database } from './supabase';

// Migration utilities for place_id transition
export {
  PlaceMigrationUtils,
  PlaceTypeGuards,
  MigrationValidation,
  MIGRATION_CONSTANTS
} from './migrations';

// Place availability types
export type {
  PlaceAvailabilityConfig,
  PlaceAvailabilityResult,
  PlaceCountResult
} from '../services/placeAvailability';

// Analytics types
export {
  BaseAnalyticsEvent,
  ScreenViewedEvent,
  UserIdentifiedEvent,
  PlaceAddedToListEvent,
  PlaceViewedEvent,
  ListCreatedEvent,
  ListViewedEvent,
  ListSharedEvent,
  CheckInCreatedEvent,
  CheckInViewedEvent,
  SearchPerformedEvent,
  ErrorOccurredEvent,
  PerformanceEvent,
  AnalyticsEvent,
  AnalyticsEventName,
  UserProperties,
  AnalyticsConfig,
  IAnalyticsService
} from './analytics'; 