// Navigation and location types extracted from index.ts

// Auth types
export interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
}

// Location types - primary location interface for the app
export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Alias for backward compatibility
export type Location = LocationCoords;

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Root Stack Params (for auth flow and main navigation)
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSetup: undefined;
  MainTabs: undefined;
  PlaceDetails: {
    googlePlaceId: string; // Updated to use Google Place ID
    placeName: string;
    source?: 'checkin' | 'search' | 'nearby' | 'list' | 'suggestion' | 'recommendation';
  };
  CheckInHistory: undefined;
  Map: {
    initialRegion?: MapRegion;
    selectedGooglePlaceId?: string; // Updated to use Google Place ID
  };
}; 