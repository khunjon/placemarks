import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import { ProfileStackParamList } from './types';
import type { ProfileStackScreenProps } from './types';

// Import screens
import {
  ProfileScreen,
  PreferencesScreen,
  AchievementDetailScreen,
  EditProfileScreen
} from '../screens/profile';

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
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          headerShown: false, // EditProfileScreen has its own header
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