import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/services/auth-context';
import { Colors } from './src/constants/Colors';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import { LoginScreen } from './src/screens/auth';
import type { RootStackParamList } from './src/navigation/types';
import { analyticsService } from './src/services/analytics';
import { NAVIGATION_METHODS } from './src/constants/ScreenNames';
import { FullScreenLoading } from './src/components/common/LoadingState';
import './global.css';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { user, loading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const routeNameRef = useRef<string | undefined>(undefined);
  const previousStateRef = useRef<any>(undefined);

  // Initialize analytics and navigation tracking when user state changes
  useEffect(() => {
    const initializeServices = async () => {
      const amplitudeApiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY;
      
      if (amplitudeApiKey) {
        await analyticsService.initialize({
          apiKey: amplitudeApiKey,
          enableLogging: __DEV__,
          trackSessionEvents: true,
          trackAppLifecycleEvents: true,
        });

        // Initialize navigation tracking
        if (navigationRef.current) {
          analyticsService.initializeNavigation(navigationRef.current);
        }

        // Identify user if logged in
        if (user?.id) {
          await analyticsService.identify(user.id, {
            user_id: user.id,
            email: user.email,
            signup_date: user.created_at,
            last_active_date: new Date().toISOString(),
          });
        }
      } else if (__DEV__) {
        console.warn('Amplitude API key not found. Analytics will not be initialized.');
      }
    };

    initializeServices();
  }, [user]);

  // Navigation state change handler for automatic screen tracking
  const handleNavigationStateChange = async (state: any) => {
    if (!state) return;

    const { screenName, params } = analyticsService.parseNavigationState(state);
    if (!screenName) return;

    // Determine navigation method
    const navigationMethod = analyticsService.getNavigationMethod(
      previousStateRef.current,
      state
    );

    // Track the screen change
    await analyticsService.trackScreen(screenName, navigationMethod, params);

    // Save the current route name for next time
    routeNameRef.current = screenName;
    previousStateRef.current = state;
  };

  // Handle navigation ready
  const handleNavigationReady = () => {
    if (navigationRef.current) {
      const state = navigationRef.current.getRootState();
      if (state) {
        const { screenName } = analyticsService.parseNavigationState(state);
        if (screenName) {
          routeNameRef.current = screenName;
          previousStateRef.current = state;
          
          // Track initial screen
          analyticsService.trackScreen(screenName, NAVIGATION_METHODS.INITIAL_LOAD);
        }
      }
    }
  };

  if (loading) {
    return <FullScreenLoading message="Loading Placemarks..." />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={handleNavigationReady}
      onStateChange={handleNavigationStateChange}
    >
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
