// Legacy database types for backwards compatibility
// New code should use types from entities/index.ts

// Re-export core entity types from entities for backwards compatibility
export { 
  UserPreferences, 
  User, 
  Place, 
  CheckIn, 
  List, 
  CityContext,
  BangkokContext, // Legacy - deprecated
  CheckInContext 
} from './entities'; 