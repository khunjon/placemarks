import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import { ProfileStackParamList } from './types';

// Import screens
import ProfileScreen from '../screens/ProfileScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import AchievementDetailScreen from '../screens/AchievementDetailScreen';
// import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.semantic.backgroundSecondary,
        },
        headerTintColor: Colors.semantic.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        headerShadowVisible: false,
        headerBackVisible: true,
        contentStyle: {
          backgroundColor: Colors.semantic.backgroundPrimary,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          headerShown: false, // ProfileScreen has its own header
        }}
      />
      
      <Stack.Screen 
        name="EditProfile" 
        component={() => null} // Placeholder - EditProfileScreen will be implemented later
        options={{
          title: 'Edit Profile',
          headerShown: true,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      
      <Stack.Screen 
        name="Preferences" 
        component={PreferencesScreen}
        options={({ route }) => ({
          title: `${route.params.section || 'Preferences'}`.charAt(0).toUpperCase() + 
                 `${route.params.section || 'preferences'}`.slice(1),
          headerShown: true,
        })}
      />
      
      <Stack.Screen 
        name="AchievementDetail" 
        component={AchievementDetailScreen}
        options={({ route }) => ({
          title: route.params.achievementName,
          headerShown: true,
        })}
      />
    </Stack.Navigator>
  );
} 