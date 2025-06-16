import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/services/auth-context';
import { Colors } from './src/constants/Colors';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import type { RootStackParamList } from './src/navigation/types';
import './global.css';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You can add a loading screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.semantic.backgroundSecondary,
          },
          headerTintColor: Colors.accent.blue,
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '600',
            color: Colors.semantic.textPrimary,
          },
          headerShadowVisible: false,
        }}
      >
        {user ? (
          <Stack.Screen 
            name="MainTabs" 
            component={BottomTabNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="light" backgroundColor={Colors.semantic.backgroundPrimary} />
    </AuthProvider>
  );
}
