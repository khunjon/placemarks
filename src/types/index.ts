// User model interface (extends Supabase User)
export interface User {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
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

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Profile: undefined;
  PlaceDetails: { placeId: string };
  AddPlace: undefined;
  Map: undefined;
  Lists: undefined;
  ListDetails: { listId: string };
};

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