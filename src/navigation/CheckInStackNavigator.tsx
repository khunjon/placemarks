import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import { CheckInStackParamList } from './types';

// Import screens
import CheckInScreen from '../screens/CheckInScreen';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';
import CheckInFormScreen from '../screens/CheckInFormScreen';

const Stack = createNativeStackNavigator<CheckInStackParamList>();

export default function CheckInStackNavigator() {
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
        name="CheckIn" 
        component={CheckInScreen}
        options={{
          headerShown: false, // CheckInScreen has its own header
        }}
      />
      
      <Stack.Screen 
        name="PlaceDetails" 
        component={PlaceDetailsScreen}
        options={({ route }) => ({
          title: route.params.placeName,
          headerShown: true,
        })}
      />
      
      <Stack.Screen 
        name="CheckInForm" 
        component={CheckInFormScreen}
        options={({ route }) => ({
          title: `Check in at ${route.params.placeName}`,
          headerShown: true,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        })}
      />
    </Stack.Navigator>
  );
} 