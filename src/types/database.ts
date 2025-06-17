// Bangkok-specific context interfaces
export interface BangkokContext {
  environment: 'indoor' | 'outdoor' | 'mixed';
  location_type: 'mall' | 'street' | 'building' | 'market';
  bts_proximity: 'walking' | 'near' | 'far' | 'none';
  air_conditioning: boolean;
  noise_level: 'quiet' | 'moderate' | 'loud';
  price_tier: 'street' | 'casual' | 'mid' | 'upscale' | 'luxury';
}

export interface CheckInContext {
  weather?: string;
  companion?: 'solo' | 'partner' | 'friends' | 'business';
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  transportation?: 'walking' | 'bts' | 'taxi' | 'car';
  mood?: 'adventurous' | 'comfort' | 'healthy' | 'indulgent';
}

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

export interface UserPreferences {
  favorite_districts: string[];
  dietary_restrictions: string[];
  preferred_cuisines: string[];
  price_range: 'budget' | 'mid' | 'upscale' | 'luxury';
  transport_preference: 'walking' | 'bts' | 'taxi' | 'car';
  activity_types: string[];
}

// Main database interfaces as specified in Task 1
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider: 'email' | 'google' | 'facebook' | 'apple';
  preferences: UserPreferences;
  created_at: string;
}

export interface Place {
  id: string;
  google_place_id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [longitude, latitude] format
  place_type: string;
  google_types?: string[]; // Full array of Google Places API types
  primary_type?: string; // Primary type (computed from google_types[0] or place_type)
  price_level?: number;
  bangkok_context: BangkokContext;
}

export interface CheckIn {
  id: string;
  user_id: string;
  place_id: string;
  timestamp: string;
  rating: number;
  tags: string[];
  context: CheckInContext;
  photos: string[];
  notes?: string;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  auto_generated: boolean;
  privacy_level: 'private' | 'friends' | 'public';
  description?: string;
  list_type?: string;
  icon?: string;
  color?: string;
  type?: 'user' | 'auto';
  created_at: string;
} 