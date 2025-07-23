import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/services/auth-context';
import { Colors } from './src/constants/Colors';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import { LoginScreen, SignUpScreen } from './src/screens/auth';
import type { RootStackParamList } from './src/navigation/types';
import { analyticsService } from './src/services/analytics';
import { NAVIGATION_METHODS } from './src/constants/ScreenNames';
import { FullScreenLoading } from './src/components/common/LoadingState';
import { config } from './src/config/environment';
import { supabase } from './src/services/supabase';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { user, loading, refreshSession, session } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const routeNameRef = useRef<string | undefined>(undefined);
  const previousStateRef = useRef<any>(undefined);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimestampRef = useRef<number | null>(null);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const wasInBackground = appStateRef.current.match(/inactive|background/);
      const isComingToForeground = wasInBackground && nextAppState === 'active';
      const isGoingToBackground = nextAppState.match(/inactive|background/);
      
      // App has come to the foreground
      if (isComingToForeground) {
        const backgroundDuration = backgroundTimestampRef.current 
          ? Date.now() - backgroundTimestampRef.current 
          : 0;
        
        console.log('App has come to the foreground', {
          backgroundDurationSeconds: Math.floor(backgroundDuration / 1000),
          hasUser: !!user,
          hasSession: !!session
        });
        
        // Always start auto-refresh when coming to foreground
        supabase.auth.startAutoRefresh();
        
        // Always refresh session when coming from background if we have a user
        if (user || session) {
          // Immediate refresh for better UX
          console.log('Refreshing session after background period');
          refreshSession().catch(() => {
            // Silently handle refresh errors - the auth context will maintain state
            console.log('Background session refresh handled gracefully');
          });
        }
        
        // Clear background timestamp
        backgroundTimestampRef.current = null;
      } else if (isGoingToBackground) {
        // App has gone to the background
        console.log('App has gone to the background');
        
        // Record when we went to background
        backgroundTimestampRef.current = Date.now();
        
        // Keep auto-refresh running for 2 minutes in background
        // This helps with quick app switches and iOS app suspension
        setTimeout(() => {
          if (AppState.currentState.match(/inactive|background/)) {
            console.log('Stopping auto-refresh after extended background timeout');
            supabase.auth.stopAutoRefresh();
          }
        }, 2 * 60 * 1000); // 2 minutes
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Start auto-refresh on mount if app is active
    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }
    
    // Set up periodic session validation (every 5 minutes)
    const sessionCheckInterval = setInterval(() => {
      if (user && AppState.currentState === 'active') {
        // Silently validate/refresh session in background
        refreshSession().catch(() => {
          // Errors are handled in auth context, no action needed here
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      subscription.remove();
      clearInterval(sessionCheckInterval);
      // Stop auto-refresh on unmount
      supabase.auth.stopAutoRefresh();
    };
  }, [user, refreshSession, session]);

  // Initialize analytics on app mount
  useEffect(() => {
    const initializeAnalytics = async () => {
      const amplitudeApiKey = config.amplitudeApiKey;
      
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
      } else if (__DEV__) {
        console.warn('Amplitude API key not found. Analytics will not be initialized.');
      }
    };

    initializeAnalytics();
  }, []); // Empty dependency array - only run once on mount

  // Identify user when user state changes
  useEffect(() => {
    const identifyUser = async () => {
      if (user?.id && analyticsService.isInitialized()) {
        await analyticsService.identify(user.id, {
          user_id: user.id,
          email: user.email,
          signup_date: user.created_at,
          last_active_date: new Date().toISOString(),
        });
      }
    };

    identifyUser();
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

    // Track the screen change only if analytics is initialized
    if (analyticsService.isInitialized()) {
      await analyticsService.trackScreen(screenName, navigationMethod, params);
    }

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
          
          // Track initial screen only if analytics is initialized
          if (analyticsService.isInitialized()) {
            analyticsService.trackScreen(screenName, NAVIGATION_METHODS.INITIAL_LOAD);
          }
        }
      }
    }
  };

  // Show loading screen with a minimum duration to prevent flashing
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
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="light" backgroundColor={Colors.semantic.backgroundPrimary} />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
