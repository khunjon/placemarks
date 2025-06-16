import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Bottom Tab Navigator Params
export type BottomTabParamList = {
  CheckInStack: NavigatorScreenParams<CheckInStackParamList>;
  DecideStack: NavigatorScreenParams<DecideStackParamList>;
  ListsStack: NavigatorScreenParams<ListsStackParamList>;
  ProfileStack: NavigatorScreenParams<ProfileStackParamList>;
};

// Check In Stack Params
export type CheckInStackParamList = {
  CheckIn: undefined;
  PlaceDetails: {
    placeId: string;
    placeName: string;
    source?: 'checkin' | 'search' | 'nearby';
  };
  CheckInForm: {
    placeId: string;
    placeName: string;
    placeType: string;
  };
};

// Decide Stack Params
export type DecideStackParamList = {
  Decide: undefined;
  ListDetail: {
    listId: string;
    listName: string;
    listType: 'user' | 'smart';
  };
  PlaceDetails: {
    placeId: string;
    placeName: string;
    source?: 'list' | 'suggestion';
  };
};

// Lists Stack Params
export type ListsStackParamList = {
  Lists: undefined;
  ListDetail: {
    listId: string;
    listName: string;
    listType: 'user' | 'auto';
    isEditable?: boolean;
  };
  EditList: {
    listId: string;
    listName: string;
    listDescription?: string;
    listIcon?: string;
  };
  CreateList: undefined;
  PlaceDetails: {
    placeId: string;
    placeName: string;
    source?: 'list';
  };
};

// Profile Stack Params
export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  Preferences: {
    section?: 'location' | 'notifications' | 'privacy' | 'data';
  };
  AchievementDetail: {
    achievementId: string;
    achievementName: string;
  };
};

// Root Stack Params (for auth flow)
export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<BottomTabParamList>;
};

// Screen Props Types for each stack
export type CheckInStackScreenProps<T extends keyof CheckInStackParamList> = 
  NativeStackScreenProps<CheckInStackParamList, T>;

export type DecideStackScreenProps<T extends keyof DecideStackParamList> = 
  NativeStackScreenProps<DecideStackParamList, T>;

export type ListsStackScreenProps<T extends keyof ListsStackParamList> = 
  NativeStackScreenProps<ListsStackParamList, T>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = 
  NativeStackScreenProps<ProfileStackParamList, T>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

// Bottom Tab Screen Props
export type BottomTabScreenProps<T extends keyof BottomTabParamList> = 
  NativeStackScreenProps<BottomTabParamList, T>;

// Common navigation prop types
export type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  push: (screen: string, params?: any) => void;
  replace: (screen: string, params?: any) => void;
  reset: (state: any) => void;
};

// Place data type for navigation
export interface PlaceNavigationData {
  id: string;
  name: string;
  type: 'restaurant' | 'cafe' | 'shopping' | 'temple' | 'park' | 'hotel' | 'attraction';
  description?: string;
  address?: string;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
  btsStation?: string;
  distance?: string;
}

// List data type for navigation
export interface ListNavigationData {
  id: string;
  name: string;
  description?: string;
  type: 'user' | 'auto' | 'smart';
  listType: 'favorites' | 'coffee' | 'date' | 'work' | 'want_to_try' | 'visited' | 'rated' | 'recent';
  placeCount: number;
  isEditable: boolean;
  icon?: string;
  color?: string;
}

// User data type for navigation
export interface UserNavigationData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinDate?: string;
  stats?: {
    placesVisited: number;
    checkIns: number;
    listsCreated: number;
    followers: number;
  };
}

// Achievement data type for navigation
export interface AchievementNavigationData {
  id: string;
  name: string;
  description: string;
  category: 'exploration' | 'social' | 'collection' | 'expertise';
  isCompleted: boolean;
  progress?: number;
  target?: number;
  current?: number;
  completedDate?: string;
  iconName?: string;
  iconColor?: string;
}

// Navigation helper types
export type NavigateToPlace = (place: PlaceNavigationData, source?: string) => void;
export type NavigateToList = (list: ListNavigationData) => void;
export type NavigateToCheckIn = (place: PlaceNavigationData) => void;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 