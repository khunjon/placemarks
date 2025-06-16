import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import { DecideStackParamList } from './types';

// Import screens
import DecideScreen from '../screens/DecideScreen';
import ListDetailScreen from '../screens/ListDetailScreen';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';

const Stack = createNativeStackNavigator<DecideStackParamList>();

export default function DecideStackNavigator() {
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
        name="Decide" 
        component={DecideScreen}
        options={{
          headerShown: false, // DecideScreen has its own header
        }}
      />
      
      <Stack.Screen 
        name="ListDetail" 
        component={ListDetailScreen}
        options={({ route }) => ({
          title: route.params.listName,
          headerShown: true,
        })}
      />
      
      <Stack.Screen 
        name="PlaceDetails" 
        component={PlaceDetailsScreen}
        options={({ route }) => ({
          title: route.params.placeName,
          headerShown: true,
        })}
      />
    </Stack.Navigator>
  );
} 