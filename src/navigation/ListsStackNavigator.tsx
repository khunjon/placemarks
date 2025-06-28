import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import { ListsStackParamList } from './types';
import type { ListsStackScreenProps } from './types';

// Import screens
import {
  ListsScreen,
  ListDetailScreen,
  EditListScreen,
  CreateListScreen,
  AddPlaceToListScreen
} from '../screens/lists';
import {
  PlaceDetailScreen
} from '../screens/places';

// Wrapper component for CreateList screen to avoid inline function
function CreateListScreenWrapper({ navigation }: ListsStackScreenProps<'CreateList'>) {
  return (
    <CreateListScreen
      onClose={() => navigation.goBack()}
      onSave={(listData) => {
        // Handle save logic here
        console.log('Saving list:', listData);
        navigation.goBack();
      }}
    />
  );
}

// Wrapper component to adapt ListsStack navigation props for PlaceDetailScreen
function PlaceDetailScreenWrapper({ navigation, route }: ListsStackScreenProps<'PlaceInListDetail'>) {
  // Convert ListsStack params to format expected by PlaceDetailScreen
  const adaptedRoute = {
    ...route,
    params: {
      ...route.params, // Preserve all original params
      googlePlaceId: route.params.placeId, // Map placeId to googlePlaceId for backward compatibility
      source: 'list' as const,
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

const Stack = createNativeStackNavigator<ListsStackParamList>();

export default function ListsStackNavigator() {
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
        name="Lists" 
        component={ListsScreen}
        options={{
          headerShown: false, // ListsScreen has its own header
        }}
      />
      
      <Stack.Screen 
        name="ListDetail" 
        component={ListDetailScreen}
        options={({ route }) => ({
          title: route.params.listName,
          headerShown: route.params.listType !== 'curated',
        })}
      />
      
      <Stack.Screen 
        name="EditList" 
        component={EditListScreen}
        options={{
          title: 'Edit List',
          headerShown: false, // EditListScreen has its own header
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      
      <Stack.Screen 
        name="CreateList" 
        component={CreateListScreenWrapper}
        options={{
          title: 'Create List',
          headerShown: false, // CreateListScreen has its own header
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      
      <Stack.Screen 
        name="AddPlaceToList" 
        component={AddPlaceToListScreen}
        options={{
          headerShown: false, // AddPlaceToListScreen has its own header
          animation: 'slide_from_right',
        }}
      />
      
      {/* PlaceDetails screen removed - redundant with PlaceInListDetail */}
      
      <Stack.Screen 
        name="PlaceInListDetail" 
        component={PlaceDetailScreenWrapper}
        options={{
          headerShown: false, // PlaceDetailScreen has its own header
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
} 