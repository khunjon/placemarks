// Check-in related types for Bangkok-specific context
import { 
  ThumbsRating, 
  CheckIn, 
  CheckInContext, 
  WeatherContext, 
  CompanionType, 
  MealType, 
  TransportationMethod,
  CheckInCreate,
  CheckInUpdate
} from './entities';

// Re-export types from entities for backwards compatibility
export {
  ThumbsRating,
  CheckIn,
  CheckInContext,
  WeatherContext,
  CompanionType,
  MealType,
  TransportationMethod,
  CheckInCreate,
  CheckInUpdate
} from './entities';

// Bangkok-specific tag suggestions
export const BANGKOK_TAGS = {
  FOOD: [
    'street_food', 'thai_cuisine', 'international', 'vegetarian', 'halal', 
    'spicy', 'sweet', 'authentic', 'fusion', 'michelin'
  ],
  ATMOSPHERE: [
    'romantic', 'casual', 'business_friendly', 'family_friendly', 'trendy',
    'traditional', 'modern', 'cozy', 'spacious', 'view'
  ],
  LOCATION: [
    'bts_connected', 'mall_location', 'street_side', 'hidden_gem', 'tourist_area',
    'local_favorite', 'riverside', 'rooftop', 'basement', 'ground_floor'
  ],
  EXPERIENCE: [
    'first_time', 'regular_spot', 'special_occasion', 'quick_bite', 'long_meal',
    'takeaway', 'delivery', 'buffet', 'set_menu', 'a_la_carte'
  ]
} as const;

export type BangkokTag = typeof BANGKOK_TAGS[keyof typeof BANGKOK_TAGS][number]; 