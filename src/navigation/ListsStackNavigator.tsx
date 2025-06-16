import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import { ListsStackParamList } from './types';
import type { ListsStackScreenProps } from './types';

// Import screens
import ListsScreen from '../screens/ListsScreen';
import ListDetailScreen from '../screens/ListDetailScreen';
import EditListScreen from '../screens/EditListScreen';
import CreateListScreen from '../screens/CreateListScreen';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';

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
          headerShown: true,
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