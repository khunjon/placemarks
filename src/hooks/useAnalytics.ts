import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { analyticsService, AnalyticsHelpers } from '../services/analytics';
import { AnalyticsEventName, UserProperties } from '../types/analytics';
import { navigationTrackingService } from '../services/navigationTracking';
import { NAVIGATION_METHODS, type ScreenName } from '../constants/ScreenNames';

/**
 * Hook for analytics integration with automatic screen tracking
 * 
 * @param screenName - Optional screen name for manual tracking (use only if automatic tracking doesn't work)
 * @param enableManualTracking - Set to true to enable manual screen tracking (bypasses automatic tracking)
 */
export function useAnalytics(screenName?: ScreenName, enableManualTracking = false) {
  const screenStartTime = useRef<number | null>(null);
  const hasTrackedScreen = useRef(false);

  // Manual screen tracking (only if enabled and automatic tracking is insufficient)
  useFocusEffect(
    useCallback(() => {
      if (enableManualTracking && screenName && !hasTrackedScreen.current) {
        screenStartTime.current = Date.now();
        
        // Use navigation tracking service for consistency
        navigationTrackingService.trackCurrentScreen(
          screenName,
          NAVIGATION_METHODS.PROGRAMMATIC
        );
        
        hasTrackedScreen.current = true;
      }

      return () => {
        // Reset tracking flag when screen loses focus
        hasTrackedScreen.current = false;
        screenStartTime.current = null;
      };
    }, [screenName, enableManualTracking])
  );

  return {
    // Core analytics methods
    track: analyticsService.track.bind(analyticsService),
    trackScreen: analyticsService.trackScreen.bind(analyticsService),
    identify: analyticsService.identify.bind(analyticsService),
    setUserProperties: analyticsService.setUserProperties.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    trackPerformance: analyticsService.trackPerformance.bind(analyticsService),
    
    // Navigation tracking methods
    trackCurrentScreen: navigationTrackingService.trackCurrentScreen.bind(navigationTrackingService),
    trackTabPress: navigationTrackingService.trackTabPress.bind(navigationTrackingService),
    trackBackNavigation: navigationTrackingService.trackBackNavigation.bind(navigationTrackingService),
    trackModalPresentation: navigationTrackingService.trackModalPresentation.bind(navigationTrackingService),
    
    // Helper methods for common events
    trackListCreated: AnalyticsHelpers.trackListCreated,
    trackPlaceAddedToList: AnalyticsHelpers.trackPlaceAddedToList,
    trackCheckInCreated: AnalyticsHelpers.trackCheckInCreated,
    
    // Navigation state methods
    getCurrentScreenName: navigationTrackingService.getCurrentScreenName.bind(navigationTrackingService),
    getScreenUsageStats: navigationTrackingService.getScreenUsageStats.bind(navigationTrackingService),
    
    // Utility methods
    isInitialized: analyticsService.isInitialized.bind(analyticsService),
    flush: analyticsService.flush.bind(analyticsService),
  };
}

/**
 * Hook for tracking performance of async operations
 */
export function usePerformanceTracking() {
  const trackAsyncOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      eventType: 'api_call' | 'cache_operation' | 'screen_load',
      details?: Record<string, any>
    ): Promise<T> => {
      const startTime = Date.now();
      let success = false;
      let result: T;

      try {
        result = await operation();
        success = true;
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        await analyticsService.trackPerformance(eventType, duration, success, details);
      }
    },
    []
  );

  const trackSyncOperation = useCallback(
    <T>(
      operation: () => T,
      eventType: 'cache_operation',
      details?: Record<string, any>
    ): T => {
      const startTime = Date.now();
      let success = false;
      let result: T;

      try {
        result = operation();
        success = true;
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        // Don't await this to keep sync operations sync
        analyticsService.trackPerformance(eventType, duration, success, details);
      }
    },
    []
  );

  return {
    trackAsyncOperation,
    trackSyncOperation,
  };
}

/**
 * Hook for error tracking with automatic context
 */
export function useErrorTracking(screenName?: string) {
  const trackError = useCallback(
    (
      error: Error | string,
      context?: {
        errorType?: 'network' | 'authentication' | 'permission' | 'validation' | 'unknown';
        actionAttempted?: string;
        errorCode?: string;
      }
    ) => {
      analyticsService.trackError(error, {
        ...context,
        screenName: screenName,
      });
    },
    [screenName]
  );

  return { trackError };
}

/**
 * Hook for search analytics
 */
export function useSearchAnalytics() {
  const trackSearch = useCallback(
    async (
      query: string,
      searchType: 'places' | 'lists' | 'users',
      resultsCount: number,
      source: 'main_search' | 'place_search' | 'list_search' = 'main_search',
      selectedResultIndex?: number
    ) => {
      await analyticsService.track(AnalyticsEventName.SEARCH_PERFORMED, {
        search_query: query,
        search_type: searchType,
        results_count: resultsCount,
        selected_result_index: selectedResultIndex,
        search_source: source,
        timestamp: Date.now(),
      } as any);
    },
    []
  );

  return { trackSearch };
}

/**
 * Hook for user journey analytics
 */
export function useUserJourneyAnalytics() {
  const trackListViewed = useCallback(
    async (
      listId: string,
      listName: string,
      listType: 'personal' | 'shared' | 'collaborative',
      placeCount: number,
      viewDuration?: number
    ) => {
      await analyticsService.track(AnalyticsEventName.LIST_VIEWED, {
        list_id: listId,
        list_name: listName,
        list_type: listType,
        place_count: placeCount,
        view_duration: viewDuration,
        timestamp: Date.now(),
      } as any);
    },
    []
  );

  const trackPlaceViewed = useCallback(
    async (
      placeId: string,
      placeName: string,
      source: 'list' | 'map' | 'search' | 'recommendation',
      placeType?: string,
      viewDuration?: number
    ) => {
      await analyticsService.track(AnalyticsEventName.PLACE_VIEWED, {
        place_id: placeId,
        place_name: placeName,
        place_type: placeType,
        source,
        view_duration: viewDuration,
        timestamp: Date.now(),
      } as any);
    },
    []
  );

  const trackCheckInViewed = useCallback(
    async (
      checkinId: string,
      placeId: string,
      isOwnCheckin: boolean,
      viewSource: 'feed' | 'profile' | 'place_detail' | 'notification'
    ) => {
      await analyticsService.track(AnalyticsEventName.CHECK_IN_VIEWED, {
        checkin_id: checkinId,
        place_id: placeId,
        is_own_checkin: isOwnCheckin,
        view_source: viewSource,
        timestamp: Date.now(),
      } as any);
    },
    []
  );

  return {
    trackListViewed,
    trackPlaceViewed,
    trackCheckInViewed,
  };
} 