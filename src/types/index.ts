// User model interface (extends Supabase User)
export interface User {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider?: 'email' | 'google' | 'facebook' | 'apple';
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

// User preferences interface with Bangkok-specific options
export interface UserPreferences {
  // Bangkok districts
  preferred_districts: BangkokDistrict[];
  
  // Cuisine preferences
  cuisine_preferences: CuisineType[];
  
  // Dietary restrictions
  dietary_restrictions: DietaryRestriction[];
  
  // Price range preference
  price_range: PriceRange;
  
  // Transportation preferences
  transportation_methods: TransportMethod[];
  
  // Activity preferences
  activity_types: ActivityType[];
  
  // Social preferences
  typical_group_size: 'solo' | 'couple' | 'small_group' | 'large_group';
  
  // Notification preferences
  notifications: NotificationPreferences;
  
  // Privacy settings
  privacy: PrivacySettings;
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

export interface NotificationPreferences {
  recommendations: boolean;
  check_in_reminders: boolean;
  social_updates: boolean;
  marketing: boolean;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  location_sharing: boolean;
  check_in_visibility: 'public' | 'friends' | 'private';
  list_sharing_default: 'public' | 'friends' | 'private';
}

// Profile update interface
export interface ProfileUpdate {
  full_name?: string;
  avatar_url?: string;
  preferences?: Partial<UserPreferences>;
}

// Place model interface
export interface Place {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  category?: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// CheckIn model interface
export interface CheckIn {
  id: string;
  user_id: string;
  place_id: string;
  notes?: string;
  photos?: string[];
  rating?: number;
  visited_at: string;
  created_at: string;
  updated_at: string;
}

// List model interface
export interface List {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean;
  place_ids: string[];
  created_at: string;
  updated_at: string;
}

// Legacy navigation types - moved to src/navigation/types.ts
// These are kept for backward compatibility but should use the new navigation types

// Auth types
export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}

// Location types
export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} 