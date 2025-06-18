import { init, track, identify, setUserId, Identify, flush, reset } from '@amplitude/analytics-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsEventName,
  UserProperties,
  IAnalyticsService,
  ScreenViewedEvent,
  BaseAnalyticsEvent
} from '../types/analytics';

class AnalyticsService implements IAnalyticsService {
  private initialized = false;
  private config: AnalyticsConfig | null = null;
  private currentScreen: string | null = null;
  private screenStartTime: number | null = null;
  private sessionId: string | null = null;
  private enableLogging = false;

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
      this.log('Analytics initialized successfully');

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
   * Track screen views with automatic timing
   */
  async trackScreen(
    screenName: string, 
    properties?: Partial<ScreenViewedEvent>
  ): Promise<void> {
    if (!this.isInitialized()) {
      this.logError('Analytics not initialized');
      return;
    }

    try {
      const now = Date.now();
      let timeOnPreviousScreen: number | undefined;

      // Calculate time on previous screen
      if (this.currentScreen && this.screenStartTime) {
        timeOnPreviousScreen = now - this.screenStartTime;
      }

      // Track the screen view
      await this.track(AnalyticsEventName.SCREEN_VIEWED, {
        screen_name: screenName,
        screen_class: screenName,
        previous_screen: this.currentScreen || undefined,
        time_on_previous_screen: timeOnPreviousScreen,
        timestamp: now,
        session_id: this.sessionId,
        ...properties,
      } as ScreenViewedEvent);

      // Update current screen tracking
      this.currentScreen = screenName;
      this.screenStartTime = now;

      // Don't log here since track() already logs the event

    } catch (error) {
      this.logError(`Failed to track screen: ${screenName}`, error);
    }
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
      this.currentScreen = null;
      this.screenStartTime = null;
      await this.initializeSession(); // Generate new session ID
      this.log('Analytics reset');
    } catch (error) {
      this.logError('Failed to reset analytics', error);
    }
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
      screen_name: context?.screenName ?? this.currentScreen,
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
        // Use chart emoji for event tracking and abbreviate
        const eventName = message.split('Event tracked: ')[1];
        // Show key info for screen views, just event name for others
        if (eventName === 'screen_viewed') {
          const screenName = data?.screen_name;
          if (screenName && typeof screenName === 'string') {
            console.log(`📊 ${eventName}: ${screenName}`);
          } else {
            // If screen_name is still an object, just show the event name
            console.log(`📊 ${eventName}`);
          }
        } else if (eventName === 'performance') {
          // Skip performance logs to reduce noise
          return;
        } else if (eventName === 'user_identified') {
          // Skip user_identified logs to reduce noise
          return;
        } else {
          console.log(`📊 ${eventName}`);
        }
      } else {
        console.log(`📈 ${message}`);
      }
    }
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
    } as any);
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
    } as any);
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
    } as any);
  },
};

export default analyticsService; 