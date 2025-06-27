import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';

/**
 * Utility class for handling place-related navigation with Google Place IDs
 */
export class PlaceNavigationHelper {
  /**
   * Navigate to place details screen using Google Place ID
   */
  static navigateToPlaceDetails(
    navigation: NavigationProp<RootStackParamList>,
    googlePlaceId: string,
    placeName: string,
    source?: 'checkin' | 'search' | 'nearby' | 'list' | 'suggestion' | 'recommendation'
  ) {
    navigation.navigate('PlaceDetails', {
      googlePlaceId,
      placeName,
      source,
    });
  }

  /**
   * Navigate to map with selected place
   */
  static navigateToMapWithPlace(
    navigation: NavigationProp<RootStackParamList>,
    googlePlaceId: string,
    initialRegion?: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    }
  ) {
    navigation.navigate('Map', {
      selectedGooglePlaceId: googlePlaceId,
      initialRegion,
    });
  }

  /**
   * Create a reusable place press handler for lists and search results
   */
  static createPlacePressHandler(
    navigation: NavigationProp<RootStackParamList>,
    source?: 'checkin' | 'search' | 'nearby' | 'list' | 'suggestion' | 'recommendation'
  ) {
    return (googlePlaceId: string, placeName: string) => {
      this.navigateToPlaceDetails(navigation, googlePlaceId, placeName, source);
    };
  }

  /**
   * Create a reusable check-in handler
   */
  static createCheckInHandler(
    navigation: NavigationProp<RootStackParamList>,
    onCheckIn?: (googlePlaceId: string, placeName: string) => Promise<void>
  ) {
    return async (googlePlaceId: string, placeName: string) => {
      if (onCheckIn) {
        try {
          await onCheckIn(googlePlaceId, placeName);
        } catch (error) {
          console.error('Error during check-in:', error);
        }
      } else {
        // Default: navigate to check-in form
        // This would need to be implemented based on your navigation structure
        console.log('Navigate to check-in form for:', googlePlaceId, placeName);
      }
    };
  }
}

/**
 * Hook for creating place navigation handlers
 */
export function usePlaceNavigation(
  navigation: NavigationProp<RootStackParamList>,
  source?: 'checkin' | 'search' | 'nearby' | 'list' | 'suggestion' | 'recommendation'
) {
  const navigateToPlace = (googlePlaceId: string, placeName: string) => {
    PlaceNavigationHelper.navigateToPlaceDetails(navigation, googlePlaceId, placeName, source);
  };

  const navigateToMapWithPlace = (
    googlePlaceId: string,
    initialRegion?: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    }
  ) => {
    PlaceNavigationHelper.navigateToMapWithPlace(navigation, googlePlaceId, initialRegion);
  };

  const createCheckInHandler = (
    onCheckIn?: (googlePlaceId: string, placeName: string) => Promise<void>
  ) => {
    return PlaceNavigationHelper.createCheckInHandler(navigation, onCheckIn);
  };

  return {
    navigateToPlace,
    navigateToMapWithPlace,
    createCheckInHandler,
  };
}