import { NavigationState, NavigationContainerRef } from '@react-navigation/native';
import { analyticsService } from './analytics';
import { AnalyticsEventName } from '../types/analytics';
import { 
  getScreenNameFromRoute, 
  getScreenTitle, 
  NAVIGATION_METHODS,
  type ScreenName,
  type NavigationMethod 
} from '../constants/ScreenNames';

interface ScreenSession {
  screenName: ScreenName;
  startTime: number;
  previousScreen?: ScreenName;
  navigationMethod: NavigationMethod;
  params?: Record<string, any>;
}

interface NavigationTrackingState {
  currentScreen: ScreenSession | null;
  previousScreen: ScreenSession | null;
  sessionHistory: ScreenSession[];
  isInitialized: boolean;
}

class NavigationTrackingService {
  private state: NavigationTrackingState = {
    currentScreen: null,
    previousScreen: null,
    sessionHistory: [],
    isInitialized: false,
  };

  private navigationRef: NavigationContainerRef<any> | null = null;
  private enableLogging = __DEV__;

  /**
   * Initialize navigation tracking with navigation reference
   */
  initialize(navigationRef: NavigationContainerRef<any>) {
    this.navigationRef = navigationRef;
    this.state.isInitialized = true;
    this.log('Navigation tracking initialized');
  }

  /**
   * Track screen change - called by navigation listeners
   */
  async trackScreenChange(
    screenName: ScreenName,
    navigationMethod: NavigationMethod = NAVIGATION_METHODS.PROGRAMMATIC,
    params?: Record<string, any>
  ): Promise<void> {
    try {
      const now = Date.now();
      
      // Calculate time spent on previous screen
      let timeSpent: number | undefined;
      if (this.state.currentScreen) {
        timeSpent = now - this.state.currentScreen.startTime;
        
        // Track the previous screen's time spent
        await this.trackScreenExit(this.state.currentScreen, timeSpent);
      }

      // Create new screen session
      const newSession: ScreenSession = {
        screenName,
        startTime: now,
        previousScreen: this.state.currentScreen?.screenName,
        navigationMethod,
        params,
      };

      // Update state
      this.state.previousScreen = this.state.currentScreen;
      this.state.currentScreen = newSession;
      
      // Add to history (keep last 10 screens)
      this.state.sessionHistory.push(newSession);
      if (this.state.sessionHistory.length > 10) {
        this.state.sessionHistory.shift();
      }

      // Track screen view event
      await this.trackScreenView(newSession);

      // Don't log here since analytics service will log the event

    } catch (error) {
      this.logError('Failed to track screen change', error);
    }
  }

  /**
   * Track screen view event
   */
  private async trackScreenView(session: ScreenSession): Promise<void> {
    try {
             const screenParameters = this.extractScreenParameters(session);
       const eventProperties = {
         screen_name: session.screenName,
         screen_title: getScreenTitle(session.screenName),
         previous_screen: session.previousScreen,
         navigation_method: session.navigationMethod,
         timestamp: session.startTime,
         session_id: this.getSessionId(),
         // Add screen-specific parameters
         ...screenParameters,
       };

      await analyticsService.track(AnalyticsEventName.SCREEN_VIEWED, eventProperties as any);

    } catch (error) {
      this.logError('Failed to track screen view', error);
    }
  }

  /**
   * Track screen exit (when leaving a screen)
   */
  private async trackScreenExit(session: ScreenSession, timeSpent: number): Promise<void> {
    try {
      // Only track if user spent meaningful time on screen (> 1 second)
      if (timeSpent < 1000) return;

      const eventProperties = {
        screen_name: session.screenName,
        screen_title: getScreenTitle(session.screenName),
        time_spent: timeSpent,
        timestamp: Date.now(),
        session_id: this.getSessionId(),
        exit_method: this.state.currentScreen?.navigationMethod || 'unknown',
      };

                   // Skip performance tracking to reduce console noise
      // The screen engagement data is still captured in the screen_viewed events

    } catch (error) {
      this.logError('Failed to track screen exit', error);
    }
  }

  /**
   * Extract relevant parameters from screen session for analytics
   */
  private extractScreenParameters(session: ScreenSession): Record<string, any> {
    const params: Record<string, any> = {};

    if (!session.params) return params;

    // Extract common parameters that are useful for analytics
    const relevantParams = [
      'listId', 'listName', 'listType',
      'placeId', 'placeName', 'placeType',
      'checkInId', 'userId', 'source',
      'isEditable', 'section', 'achievementId'
    ];

    relevantParams.forEach(key => {
      if (session.params![key] !== undefined) {
        params[key] = session.params![key];
      }
    });

    return params;
  }

  /**
   * Get current navigation state for debugging
   */
  getCurrentState(): NavigationTrackingState {
    return { ...this.state };
  }

  /**
   * Get current screen name
   */
  getCurrentScreenName(): ScreenName | null {
    return this.state.currentScreen?.screenName || null;
  }

  /**
   * Get session ID for analytics
   */
  private getSessionId(): string {
    return `nav_session_${Date.now()}`;
  }

  /**
   * Force track current screen (for manual tracking)
   */
  async trackCurrentScreen(
    screenName: ScreenName,
    navigationMethod: NavigationMethod = NAVIGATION_METHODS.PROGRAMMATIC,
    params?: Record<string, any>
  ): Promise<void> {
    await this.trackScreenChange(screenName, navigationMethod, params);
  }

  /**
   * Track tab press specifically
   */
  async trackTabPress(tabName: ScreenName): Promise<void> {
    await this.trackScreenChange(tabName, NAVIGATION_METHODS.TAB_PRESS);
  }

  /**
   * Track back navigation
   */
  async trackBackNavigation(screenName: ScreenName, method: 'back_button' | 'header_back' | 'swipe_back' = 'back_button'): Promise<void> {
    const navigationMethod = method === 'back_button' ? NAVIGATION_METHODS.BACK_BUTTON :
                             method === 'header_back' ? NAVIGATION_METHODS.HEADER_BACK :
                             NAVIGATION_METHODS.SWIPE_BACK;
    
    await this.trackScreenChange(screenName, navigationMethod);
  }

  /**
   * Track modal presentation
   */
  async trackModalPresentation(screenName: ScreenName, params?: Record<string, any>): Promise<void> {
    await this.trackScreenChange(screenName, NAVIGATION_METHODS.MODAL, params);
  }

  /**
   * Track deep link navigation
   */
  async trackDeepLinkNavigation(screenName: ScreenName, params?: Record<string, any>): Promise<void> {
    await this.trackScreenChange(screenName, NAVIGATION_METHODS.DEEP_LINK, params);
  }

  /**
   * Get screen usage analytics
   */
  getScreenUsageStats(): Record<ScreenName, { visits: number; totalTime: number; avgTime: number }> {
    const stats: Record<string, { visits: number; totalTime: number; avgTime: number }> = {};

    this.state.sessionHistory.forEach(session => {
      if (!stats[session.screenName]) {
        stats[session.screenName] = { visits: 0, totalTime: 0, avgTime: 0 };
      }
      
      stats[session.screenName].visits++;
      
      // Calculate time spent if we have the data
      const timeSpent = this.calculateTimeSpent(session);
      if (timeSpent > 0) {
        stats[session.screenName].totalTime += timeSpent;
        stats[session.screenName].avgTime = stats[session.screenName].totalTime / stats[session.screenName].visits;
      }
    });

    return stats as Record<ScreenName, { visits: number; totalTime: number; avgTime: number }>;
  }

  /**
   * Calculate time spent on a screen session
   */
  private calculateTimeSpent(session: ScreenSession): number {
    // Find the next session to calculate time spent
    const sessionIndex = this.state.sessionHistory.findIndex(s => s === session);
    if (sessionIndex === -1 || sessionIndex === this.state.sessionHistory.length - 1) {
      return 0;
    }
    
    const nextSession = this.state.sessionHistory[sessionIndex + 1];
    return nextSession.startTime - session.startTime;
  }

  /**
   * Reset tracking state (useful for testing or user logout)
   */
  reset(): void {
    this.state = {
      currentScreen: null,
      previousScreen: null,
      sessionHistory: [],
      isInitialized: this.state.isInitialized,
    };
    this.log('Navigation tracking state reset');
  }

  private log(message: string, data?: any): void {
    if (this.enableLogging) {
      console.log(`🧭 ${message}`);
    }
  }

  private logError(message: string, error?: any): void {
    if (this.enableLogging) {
      console.error(`🧭❌ ${message}`);
    }
  }
}

// Export singleton instance
export const navigationTrackingService = new NavigationTrackingService();

// Export utility functions for React Navigation integration
export const NavigationTrackingUtils = {
     /**
    * Extract screen name from navigation state
    */
   getScreenNameFromState(state: NavigationState | any): ScreenName | null {
     if (!state) return null;

     // Get the current route
     const route = state.routes[state.index];
     if (!route) return null;



     // Handle nested navigation
     if (route.state) {
       // This is a nested navigator, get the active screen from it
       const nestedRoute = route.state.routes[route.state.index];
       if (nestedRoute) {
         // Check if the nested route also has nested state (like stack inside tab)
         if (nestedRoute.state) {
           const deepNestedRoute = nestedRoute.state.routes[nestedRoute.state.index];
           if (deepNestedRoute) {
             // We have a deep nested structure: MainTabs -> ListsStack -> ListDetail
             const screenName = getScreenNameFromRoute(deepNestedRoute.name, nestedRoute.name);
             return screenName;
           }
         }
         
         // Fallback to single level nesting
         const screenName = getScreenNameFromRoute(nestedRoute.name, route.name);
         if (__DEV__) {
           console.log('🧭 Nested Navigation Result:', {
             nestedRouteName: nestedRoute.name,
             stackName: route.name,
             resolvedScreenName: screenName
           });
         }
         return screenName;
       }
     }

     // Get screen name using our mapping (for root level routes)
     const screenName = getScreenNameFromRoute(route.name);
     if (__DEV__) {
       console.log('🧭 Direct Navigation Result:', {
         routeName: route.name,
         resolvedScreenName: screenName
       });
     }
     return screenName;
   },

   /**
    * Get route parameters from navigation state
    */
   getRouteParamsFromState(state: NavigationState | any): Record<string, any> | undefined {
     if (!state) return undefined;

     const route = state.routes[state.index];
     if (!route) return undefined;

     // Handle nested navigation
     if (route.state) {
       const nestedParams = NavigationTrackingUtils.getRouteParamsFromState(route.state);
       if (nestedParams) {
         return { ...route.params, ...nestedParams };
       }
     }

     return route.params as Record<string, any> | undefined;
   },

  /**
   * Determine navigation method from state change
   */
  getNavigationMethodFromStateChange(
    previousState: NavigationState | undefined,
    currentState: NavigationState
  ): NavigationMethod {
    if (!previousState) {
      return NAVIGATION_METHODS.INITIAL_LOAD;
    }

    // Check if it's a tab change
    if (previousState.index !== currentState.index && 
        previousState.routes.length === currentState.routes.length) {
      return NAVIGATION_METHODS.TAB_PRESS;
    }

    // Check if it's a back navigation
    if (currentState.routes.length < previousState.routes.length) {
      return NAVIGATION_METHODS.BACK_BUTTON;
    }

    // Check if it's a forward navigation
    if (currentState.routes.length > previousState.routes.length) {
      return NAVIGATION_METHODS.PUSH;
    }

    // Default to programmatic
    return NAVIGATION_METHODS.PROGRAMMATIC;
  },
};

export default navigationTrackingService; 