// Check-in related types for Bangkok-specific context

export interface CheckIn {
  id: string;
  user_id: string;
  place_id: string;
  timestamp: string;
  rating: number; // Overall rating 1-5
  aspect_ratings: AspectRatings;
  tags: string[];
  context: CheckInContext;
  photos: string[];
  notes?: string;
  weather_context: WeatherContext;
  companion_type?: CompanionType;
  meal_type?: MealType;
  transportation_method?: TransportationMethod;
  visit_duration?: number; // in minutes
  would_return: boolean;
  created_at: string;
  updated_at: string;
  // Relationships (when joined)
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

export interface AspectRatings {
  food_quality?: number; // 1-5
  service?: number; // 1-5
  atmosphere?: number; // 1-5
  value_for_money?: number; // 1-5
  cleanliness?: number; // 1-5
  location_convenience?: number; // 1-5
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

export type CompanionType = 'solo' | 'partner' | 'friends' | 'family' | 'business' | 'date';
export type MealType = 'breakfast' | 'brunch' | 'lunch' | 'afternoon_snack' | 'dinner' | 'late_night' | 'drinks';
export type TransportationMethod = 'walking' | 'bts' | 'mrt' | 'bus' | 'taxi' | 'grab' | 'motorcycle' | 'car' | 'boat';

export interface CheckInCreate {
  place_id: string;
  rating: number;
  aspect_ratings?: AspectRatings;
  tags?: string[];
  context: CheckInContext;
  photos?: string[];
  notes?: string;
  weather_context: WeatherContext;
  companion_type?: CompanionType;
  meal_type?: MealType;
  transportation_method?: TransportationMethod;
  visit_duration?: number;
  would_return: boolean;
}

export interface CheckInUpdate {
  rating?: number;
  aspect_ratings?: AspectRatings;
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
}

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