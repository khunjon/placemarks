// Navigation and location types extracted from index.ts

// Auth types
export interface AuthState {
  user: any | null;
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

// Root Stack Params (for auth flow and main navigation)
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSetup: undefined;
  MainTabs: undefined;
  PlaceDetails: {
    placeId: string;
    placeName: string;
    source?: 'checkin' | 'search' | 'nearby' | 'list' | 'suggestion';
  };
  CheckInHistory: undefined;
  Map: {
    initialRegion?: MapRegion;
    selectedPlaceId?: string;
  };
}; 