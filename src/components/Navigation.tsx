import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../services/auth-context';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MapScreen from '../screens/MapScreen';
import AddPlaceScreen from '../screens/AddPlaceScreen';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';
import ListsScreen from '../screens/ListsScreen';
import ListDetailsScreen from '../screens/ListDetailsScreen';

// Import new auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

// Import new profile screens
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import PreferencesScreen from '../screens/profile/PreferencesScreen';

// Import places screens
import PlacesSearchScreen from '../screens/places/PlacesSearchScreen';

// Import check-in screens
import CheckInScreen from '../screens/checkin/CheckInScreen';
import CheckInHistoryScreen from '../screens/checkin/CheckInHistoryScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    // You can replace this with a proper loading screen
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {user ? (
          // Authenticated screens
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Placemarks' }}
            />
            <Stack.Screen 
              name="Map" 
              component={MapScreen}
              options={{ title: 'Map' }}
            />
            <Stack.Screen 
              name="AddPlace" 
              component={AddPlaceScreen}
              options={{ title: 'Add Place' }}
            />
            <Stack.Screen 
              name="PlaceDetails" 
              component={PlaceDetailsScreen}
              options={{ title: 'Place Details' }}
            />
            <Stack.Screen 
              name="Lists" 
              component={ListsScreen}
              options={{ title: 'My Lists' }}
            />
            <Stack.Screen 
              name="ListDetails" 
              component={ListDetailsScreen}
              options={{ title: 'List Details' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen 
              name="UserProfile" 
              component={UserProfileScreen}
              options={{ title: 'My Profile' }}
            />
            <Stack.Screen 
              name="Preferences" 
              component={PreferencesScreen}
              options={{ title: 'Preferences' }}
            />
            <Stack.Screen 
              name="PlacesSearch" 
              component={PlacesSearchScreen}
              options={{ title: 'Google Places Demo' }}
            />
            <Stack.Screen 
              name="CheckIn" 
              component={CheckInScreen}
              options={{ title: 'Check In' }}
            />
            <Stack.Screen 
              name="CheckInHistory" 
              component={CheckInHistoryScreen}
              options={{ title: 'Check-in History' }}
            />
          </>
        ) : (
          // Unauthenticated screens
          <>
            <Stack.Screen 
              name="Welcome" 
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ProfileSetup" 
              component={ProfileSetupScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 