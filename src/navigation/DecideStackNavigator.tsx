import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import { DecideStackParamList, DecideStackScreenProps } from './types';

// Import screens
import { DecideScreen, RecommendationsScreen } from '../screens/decide';
import { ListDetailScreen } from '../screens/lists';
import { PlaceDetailScreen } from '../screens/places';

const Stack = createNativeStackNavigator<DecideStackParamList>();

// Wrapper component to adapt DecideStack navigation props to ListsStack props
function ListDetailScreenWrapper({ navigation, route }: DecideStackScreenProps<'ListDetail'>) {
  // Convert DecideStack params to ListsStack params format
  const adaptedRoute = {
    ...route,
    params: {
      ...route.params,
      listType: route.params.listType === 'smart' ? 'auto' as const : 
                route.params.listType === 'curated' ? 'curated' as const : 'user' as const,
      isEditable: route.params.listType === 'user',
    }
  };

  // Type assertion is safe here because we're adapting the props
  return (
    <ListDetailScreen 
      navigation={navigation as any} 
      route={adaptedRoute as any} 
    />
  );
}

// Wrapper component to adapt DecideStack navigation props to ListsStack props for PlaceDetailScreen
function PlaceDetailScreenWrapper({ navigation, route }: DecideStackScreenProps<'PlaceInListDetail'>) {
  // Convert DecideStack params to ListsStack params format
  const adaptedRoute = {
    ...route,
    params: {
      ...route.params,
    }
  };

  // Type assertion is safe here because we're adapting the props
  return (
    <PlaceDetailScreen 
      navigation={navigation as any} 
      route={adaptedRoute as any} 
    />
  );
}

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
        name="Recommendations" 
        component={RecommendationsScreen}
        options={{
          title: 'Recommendations',
          headerShown: false, // RecommendationsScreen has its own header
        }}
      />
      
      <Stack.Screen 
        name="ListDetail" 
        component={ListDetailScreenWrapper}
        options={({ route }) => ({
          title: route.params.listName,
          headerShown: true,
        })}
      />
      
      <Stack.Screen 
        name="PlaceInListDetail" 
        component={PlaceDetailScreenWrapper}
        options={({ route }) => ({
          title: route.params.listName || 'Place Details',
          headerShown: false, // PlaceDetailScreen has its own header
        })}
      />
    </Stack.Navigator>
  );
} 