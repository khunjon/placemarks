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
  coordinates: [number, number];
  place_type: string;
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
  created_at: string;
} 