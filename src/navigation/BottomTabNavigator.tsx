import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { MapPin, Shuffle, List, User } from '../components/icons';
import { Colors } from '../constants/Colors';

// Import stack navigators
import CheckInStackNavigator from './CheckInStackNavigator';
import DecideStackNavigator from './DecideStackNavigator';
import ListsStackNavigator from './ListsStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';

// Import types
import type { BottomTabParamList } from './types';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        // Header styling
        headerStyle: {
          backgroundColor: Colors.semantic.backgroundSecondary,
          borderBottomColor: Colors.semantic.borderPrimary,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: Colors.semantic.textPrimary,
        },
        headerTintColor: Colors.accent.blue,
        
        // Tab bar styling
        tabBarStyle: {
          backgroundColor: Colors.semantic.backgroundSecondary,
          borderTopColor: Colors.semantic.borderPrimary,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 88, // Increased height for better touch targets
        },
        tabBarActiveTintColor: Colors.accent.blue,
        tabBarInactiveTintColor: Colors.semantic.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        
        // Icon styling
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="DecideStack"
        component={DecideStackNavigator}
        options={{
          title: 'Decide',
          headerShown: false, // Stack navigator handles headers
          tabBarIcon: ({ color, size }) => (
            <Shuffle 
              size={size} 
              color={color}
              strokeWidth={2}
            />
          ),
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            // Check if we're already on this tab
            const state = navigation.getState();
            const tabIndex = state.routes.findIndex(r => r.name === route.name);
            const isTabFocused = state.index === tabIndex;
            
            if (isTabFocused) {
              // If already on this tab, reset its stack
              e.preventDefault();
              navigation.navigate('DecideStack', {
                screen: 'Decide',
              });
            }
          },
        })}
      />
      
      <Tab.Screen
        name="ListsStack"
        component={ListsStackNavigator}
        options={{
          title: 'Lists',
          headerShown: false, // Stack navigator handles headers
          tabBarIcon: ({ color, size }) => (
            <List 
              size={size} 
              color={color}
              strokeWidth={2}
            />
          ),
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            // Check if we're already on this tab
            const state = navigation.getState();
            const tabIndex = state.routes.findIndex(r => r.name === route.name);
            const isTabFocused = state.index === tabIndex;
            
            if (isTabFocused) {
              // If already on this tab, reset its stack
              e.preventDefault();
              navigation.navigate('ListsStack', {
                screen: 'Lists',
              });
            }
          },
        })}
      />
      
      <Tab.Screen
        name="CheckInStack"
        component={CheckInStackNavigator}
        options={{
          title: 'Check In',
          headerShown: false, // Stack navigator handles headers
          tabBarIcon: ({ color, size }) => (
            <MapPin 
              size={size} 
              color={color}
              strokeWidth={2}
            />
          ),
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            // Check if we're already on this tab
            const state = navigation.getState();
            const tabIndex = state.routes.findIndex(r => r.name === route.name);
            const isTabFocused = state.index === tabIndex;
            
            if (isTabFocused) {
              // If already on this tab, reset its stack
              e.preventDefault();
              navigation.navigate('CheckInStack', {
                screen: 'CheckIn',
              });
            }
          },
        })}
      />
      
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStackNavigator}
        options={{
          title: 'Profile',
          headerShown: false, // Stack navigator handles headers
          tabBarIcon: ({ color, size }) => (
            <User 
              size={size} 
              color={color}
              strokeWidth={2}
            />
          ),
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            // Check if we're already on this tab
            const state = navigation.getState();
            const tabIndex = state.routes.findIndex(r => r.name === route.name);
            const isTabFocused = state.index === tabIndex;
            
            if (isTabFocused) {
              // If already on this tab, reset its stack
              e.preventDefault();
              navigation.navigate('ProfileStack', {
                screen: 'Profile',
              });
            }
          },
        })}
      />
    </Tab.Navigator>
  );
} 