// Legacy database types for backwards compatibility
// New code should use types from entities/index.ts

// Bangkok-specific types
export type BangkokDistrict = 
  | 'sukhumvit' | 'silom' | 'siam' | 'chatuchak' | 'khao_san'
  | 'thonglor' | 'ekkamai' | 'ari' | 'phrom_phong' | 'asok'
  | 'saphan_phut' | 'chinatown' | 'dusit' | 'bang_sue'
  | 'lat_phrao' | 'huai_khwang' | 'ratchada' | 'ramkhamhaeng';

export type CuisineType = 
  | 'thai' | 'japanese' | 'korean' | 'chinese' | 'italian'
  | 'american' | 'indian' | 'mexican' | 'french' | 'vietnamese'
  | 'street_food' | 'seafood' | 'vegetarian' | 'desserts';

export type DietaryRestriction = 
  | 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten_free'
  | 'dairy_free' | 'nut_free' | 'low_carb' | 'keto';

export type PriceRange = 'budget' | 'moderate' | 'upscale' | 'luxury';

export type TransportMethod = 'bts' | 'mrt' | 'bus' | 'taxi' | 'grab' | 'walking' | 'motorcycle' | 'car';

export type ActivityType = 
  | 'dining' | 'shopping' | 'nightlife' | 'culture' | 'nature'
  | 'fitness' | 'entertainment' | 'business' | 'relaxation';

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