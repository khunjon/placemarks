import { init, track, identify, setUserId, Identify, flush, reset } from '@amplitude/analytics-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainerRef } from '@react-navigation/native';
import {
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsEventName,
  UserProperties,
  IAnalyticsService,
  ScreenViewedEvent,
  BaseAnalyticsEvent
} from '../types/analytics';
import { 
  ScreenName, 
  NavigationMethod, 
  NAVIGATION_METHODS,
  getScreenNameFromRoute,
  getScreenTitle 
} from '../constants/ScreenNames';

interface ScreenSession {
  screenName: ScreenName;
  startTime: number;
  previousScreen?: ScreenName;
  navigationMethod: NavigationMethod;
  params?: Record<string, any>;
}

class AnalyticsService implements IAnalyticsService {
  private initialized = false;
  private config: AnalyticsConfig | null = null;
  private currentSession: ScreenSession | null = null;
  private sessionId: string | null = null;
  private enableLogging = false;
  private navigationRef: NavigationContainerRef<any> | null = null;

  /**
   * Initialize the Analytics service
   */
  async initialize(config: AnalyticsConfig): Promise<void> {
    // Prevent double initialization
    if (this.initialized) {
      return;
    }

    try {
      this.config = config;
      this.enableLogging = config.enableLogging ?? __DEV__;
      
      // Generate or retrieve session ID
      await this.initializeSession();

      // Initialize Amplitude
      await init(config.apiKey, undefined, {
        trackingOptions: {
          deviceManufacturer: true,
          deviceModel: true,
          osName: true,
          osVersion: true,
          platform: true,
          language: true,
          ipAddress: false, // Privacy consideration
        },
        minIdLength: config.minIdLength,
        serverUrl: config.serverUrl,
        flushIntervalMillis: config.flushIntervalMillis ?? 30000,
        flushQueueSize: config.flushQueueSize ?? 30,
        trackingSessionEvents: config.trackSessionEvents ?? true,
      });

      this.initialized = true;

      // Track app launch
      await this.trackAppLaunch();

    } catch (error) {
      this.logError('Failed to initialize analytics', error);
      // Don't throw - analytics failures shouldn't crash the app
    }
  }

  /**
   * Identify a user
   */
  async identify(userId: string, userProperties?: UserProperties): Promise<void> {
    if (!this.isInitialized()) {
      this.logError('Analytics not initialized');
      return;
    }

    try {
      // Set user ID
      setUserId(userId);

      // Set user properties if provided
      if (userProperties) {
        const identifyEvent = new Identify();
        
        Object.entries(userProperties).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            identifyEvent.set(key, value);
          }
        });

        await identify(identifyEvent);
      }

      // Track user identification event
      await this.track(AnalyticsEventName.USER_IDENTIFIED, {
        user_id: userId,
        ...userProperties,
        timestamp: Date.now(),
        session_id: this.sessionId,
      } as any);

      // Don't log here since track() already logs the event

    } catch (error) {
      this.logError('Failed to identify user', error);
    }
  }

  /**
   * Track a custom event
   */
  async track<T extends AnalyticsEvent>(
    eventName: AnalyticsEventName, 
    eventProperties: T
  ): Promise<void> {
    if (!this.isInitialized()) {
      this.logError('Analytics not initialized');
      return;
    }

    try {
      // Add common properties
      const enrichedProperties = {
        ...eventProperties,
        timestamp: eventProperties.timestamp ?? Date.now(),
        session_id: eventProperties.session_id ?? this.sessionId,
        app_version: Constants.expoConfig?.version,
        platform: Platform.OS,
      };

      await track(eventName, enrichedProperties);
      this.log(`Event tracked: ${eventName}`, enrichedProperties);

    } catch (error) {
      this.logError(`Failed to track event: ${eventName}`, error);
    }
  }

  /**
   * Initialize navigation tracking
   */
  initializeNavigation(navigationRef: NavigationContainerRef<any>): void {
    this.navigationRef = navigationRef;
  }

  /**
   * Track screen changes with simplified logic
   */
  async trackScreen(
    screenName: ScreenName, 
    navigationMethod: NavigationMethod = NAVIGATION_METHODS.PROGRAMMATIC,
    params?: Record<string, any>
  ): Promise<void> {
    if (!this.isInitialized()) {
      this.logError('Analytics not initialized');
      return;
    }

    try {
      const now = Date.now();
      let timeOnPreviousScreen: number | undefined;

      // Calculate time on previous screen if exists
      if (this.currentSession) {
        timeOnPreviousScreen = now - this.currentSession.startTime;
      }

      // Create new session
      const newSession: ScreenSession = {
        screenName,
        startTime: now,
        previousScreen: this.currentSession?.screenName,
        navigationMethod,
        params,
      };

      // Track the screen view event
      const eventProperties: ScreenViewedEvent = {
        screen_name: screenName,
        screen_title: getScreenTitle(screenName),
        screen_class: screenName,
        previous_screen: this.currentSession?.screenName,
        time_on_previous_screen: timeOnPreviousScreen,
        navigation_method: navigationMethod,
        timestamp: now,
        session_id: this.sessionId || '',
        ...this.extractRelevantParams(params),
      };

      await this.track(AnalyticsEventName.SCREEN_VIEWED, eventProperties);

      // Update current session
      this.currentSession = newSession;

    } catch (error) {
      this.logError(`Failed to track screen: ${screenName}`, error);
    }
  }

  /**
   * Extract relevant parameters for analytics (avoiding sensitive data)
   */
  private extractRelevantParams(params?: Record<string, any>): Record<string, any> {
    if (!params) return {};

    const relevantKeys = [
      'listId', 'listName', 'listType',
      'placeId', 'placeName', 'placeType', 
      'checkInId', 'source', 'achievementId'
    ];

    const extracted: Record<string, any> = {};
    relevantKeys.forEach(key => {
      if (params[key] !== undefined) {
        extracted[key] = params[key];
      }
    });

    return extracted;
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: Partial<UserProperties>): Promise<void> {
    if (!this.isInitialized()) {
      this.logError('Analytics not initialized');
      return;
    }

    try {
      const identifyEvent = new Identify();
      
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          identifyEvent.set(key, value);
        }
      });

      await identify(identifyEvent);
      this.log('User properties updated', properties);

    } catch (error) {
      this.logError('Failed to set user properties', error);
    }
  }

  /**
   * Flush pending events
   */
  async flush(): Promise<void> {
    if (!this.isInitialized()) {
      return;
    }

    try {
      await flush();
      this.log('Analytics events flushed');
    } catch (error) {
      this.logError('Failed to flush analytics events', error);
    }
  }

  /**
   * Reset analytics (clear user data)
   */
  async reset(): Promise<void> {
    if (!this.isInitialized()) {
      return;
    }

    try {
      reset();
      this.currentSession = null;
      await this.initializeSession(); // Generate new session ID
      this.log('Analytics reset');
    } catch (error) {
      this.logError('Failed to reset analytics', error);
    }
  }

  /**
   * Get current screen name
   */
  getCurrentScreenName(): ScreenName | null {
    return this.currentSession?.screenName || null;
  }

  /**
   * Get current session ID for helper functions
   */
  get currentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Parse navigation state to extract screen name and params
   */
  parseNavigationState(state: any): { screenName: ScreenName | null; params?: Record<string, any> } {
    if (!state) return { screenName: null };

    // Get the current route
    const route = state.routes[state.index];
    if (!route) return { screenName: null };

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
            return { 
              screenName, 
              params: { ...route.params, ...nestedRoute.params, ...deepNestedRoute.params }
            };
          }
        }
        
        // Single level nesting
        const screenName = getScreenNameFromRoute(nestedRoute.name, route.name);
        return { 
          screenName, 
          params: { ...route.params, ...nestedRoute.params }
        };
      }
    }

    // Root level routes
    const screenName = getScreenNameFromRoute(route.name);
    return { screenName, params: route.params };
  }

  /**
   * Determine navigation method from state change
   */
  getNavigationMethod(previousState: any, currentState: any): NavigationMethod {
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

    return NAVIGATION_METHODS.PROGRAMMATIC;
  }

  /**
   * Check if analytics is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Track performance events
   */
  async trackPerformance(
    eventType: 'app_launch' | 'screen_load' | 'api_call' | 'cache_operation',
    durationMs: number,
    success: boolean,
    details?: Record<string, any>
  ): Promise<void> {
    await this.track(AnalyticsEventName.PERFORMANCE, {
      event_type: eventType,
      duration_ms: durationMs,
      success,
      details,
      timestamp: Date.now(),
      session_id: this.sessionId,
    } as any);
  }

  /**
   * Track errors with context
   */
  async trackError(
    error: Error | string,
    context?: {
      errorType?: 'network' | 'authentication' | 'permission' | 'validation' | 'unknown';
      screenName?: string;
      actionAttempted?: string;
      errorCode?: string;
    }
  ): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stackTrace = typeof error === 'object' ? error.stack : undefined;

    await this.track(AnalyticsEventName.ERROR_OCCURRED, {
      error_type: context?.errorType ?? 'unknown',
      error_message: errorMessage,
      error_code: context?.errorCode,
      screen_name: context?.screenName ?? this.getCurrentScreenName(),
      action_attempted: context?.actionAttempted,
      stack_trace: stackTrace,
      timestamp: Date.now(),
      session_id: this.sessionId,
    } as any);
  }

  // Private helper methods

  private async initializeSession(): Promise<void> {
    try {
      // Generate a new session ID
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store session info
      await AsyncStorage.setItem('@analytics_session_id', this.sessionId);
      await AsyncStorage.setItem('@analytics_session_start', Date.now().toString());
      
    } catch (error) {
      this.logError('Failed to initialize session', error);
      // Fallback to in-memory session ID
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  private async trackAppLaunch(): Promise<void> {
    // Skip app launch performance tracking to reduce console noise
    // The analytics are still being collected, just not logged
  }

  private log(message: string, data?: any): void {
    if (this.enableLogging) {
      if (message.includes('Event tracked:')) {
        const eventName = message.split('Event tracked: ')[1];
        
        if (eventName === 'screen_viewed') {
          const screenName = data?.screen_name;
          const navigationMethod = data?.navigation_method;
          const timeSpent = data?.time_on_previous_screen;
          
          let logMessage = `🧭 Screen View: ${screenName}`;
          if (navigationMethod && navigationMethod !== 'programmatic') {
            logMessage += ` (${navigationMethod})`;
          }
          if (timeSpent && timeSpent > 1000) {
            logMessage += ` | Prev: ${Math.round(timeSpent / 1000)}s`;
          }
          
          console.log(logMessage);
        } else if (eventName === 'performance' || eventName === 'user_identified') {
          // Skip these to reduce noise but keep them tracked
          return;
        } else {
          // Show other events with context
          const eventContext = this.getEventContext(data);
          console.log(`📊 ${eventName}${eventContext}`);
        }
      } else {
        console.log(`📈 ${message}`);
      }
    }
  }

  private getEventContext(data?: any): string {
    if (!data) return '';
    
    const contextParts: string[] = [];
    
    if (data.list_name) contextParts.push(`list: ${data.list_name}`);
    if (data.place_name) contextParts.push(`place: ${data.place_name}`);
    if (data.screen_name) contextParts.push(`screen: ${data.screen_name}`);
    
    return contextParts.length > 0 ? ` | ${contextParts.join(', ')}` : '';
  }

  private logError(message: string, error?: any): void {
    if (this.enableLogging) {
      console.error(`📊❌ ${message}`);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export helper functions for common events
export const AnalyticsHelpers = {
  /**
   * Track list creation with common properties
   */
  async trackListCreated(
    listId: string,
    listName: string,
    listType: 'personal' | 'shared' | 'collaborative' = 'personal',
    creationSource: 'manual' | 'template' | 'import' = 'manual',
    initialPlaceCount = 0
  ) {
    await analyticsService.track(AnalyticsEventName.LIST_CREATED, {
      list_id: listId,
      list_name: listName,
      list_type: listType,
      creation_source: creationSource,
      initial_place_count: initialPlaceCount,
      timestamp: Date.now(),
      session_id: analyticsService.currentSessionId || undefined,
    });
  },

  /**
   * Track place addition to list
   */
  async trackPlaceAddedToList(
    listId: string,
    listName: string,
    placeId: string,
    placeName: string,
    source: 'search' | 'map' | 'recommendation' | 'manual' = 'manual'
  ) {
    await analyticsService.track(AnalyticsEventName.PLACE_ADDED_TO_LIST, {
      list_id: listId,
      list_name: listName,
      place_id: placeId,
      place_name: placeName,
      source,
      timestamp: Date.now(),
      session_id: analyticsService.currentSessionId || undefined,
    });
  },

  /**
   * Track check-in creation
   */
  async trackCheckInCreated(
    checkinId: string,
    placeId: string,
    placeName: string,
    options: {
      rating?: number;
      hasPhoto?: boolean;
      hasNote?: boolean;
      source?: 'manual' | 'location_prompt' | 'qr_code';
      locationAccuracy?: number;
    } = {}
  ) {
    await analyticsService.track(AnalyticsEventName.CHECK_IN_CREATED, {
      checkin_id: checkinId,
      place_id: placeId,
      place_name: placeName,
      rating: options.rating,
      has_photo: options.hasPhoto ?? false,
      has_note: options.hasNote ?? false,
      checkin_source: options.source ?? 'manual',
      location_accuracy: options.locationAccuracy,
      timestamp: Date.now(),
      session_id: analyticsService.currentSessionId || undefined,
    });
  },
};

export default analyticsService; 