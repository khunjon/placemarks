// Analytics event types and interfaces
export interface BaseAnalyticsEvent {
  timestamp?: number;
  session_id?: string;
  user_id?: string;
}

// Screen tracking events
export interface ScreenViewedEvent extends BaseAnalyticsEvent {
  screen_name: string;
  screen_title?: string;
  screen_class?: string;
  previous_screen?: string;
  time_on_previous_screen?: number;
  navigation_method?: string;
}

// User events
export interface UserIdentifiedEvent extends BaseAnalyticsEvent {
  user_id: string;
  email?: string;
  signup_method?: 'email' | 'google' | 'facebook';
  user_type?: 'new' | 'returning';
}

// Place-related events
export interface PlaceAddedToListEvent extends BaseAnalyticsEvent {
  list_id: string;
  list_name: string;
  place_id: string;
  place_name?: string;
  place_type?: string;
  source: 'search' | 'map' | 'recommendation' | 'manual';
}

export interface PlaceViewedEvent extends BaseAnalyticsEvent {
  place_id: string;
  place_name?: string;
  place_type?: string;
  source: 'list' | 'map' | 'search' | 'recommendation';
  view_duration?: number;
}

// List-related events
export interface ListCreatedEvent extends BaseAnalyticsEvent {
  list_id: string;
  list_name: string;
  list_type: 'personal' | 'shared' | 'collaborative';
  initial_place_count?: number;
  creation_source: 'manual' | 'template' | 'import';
}

export interface ListViewedEvent extends BaseAnalyticsEvent {
  list_id: string;
  list_name: string;
  list_type: 'personal' | 'shared' | 'collaborative';
  place_count: number;
  view_duration?: number;
}

export interface ListSharedEvent extends BaseAnalyticsEvent {
  list_id: string;
  list_name: string;
  share_method: 'link' | 'social' | 'email';
  recipient_count?: number;
}

// Check-in events
export interface CheckInCreatedEvent extends BaseAnalyticsEvent {
  checkin_id: string;
  place_id: string;
  place_name?: string;
  rating?: number;
  has_photo: boolean;
  has_note: boolean;
  checkin_source: 'manual' | 'location_prompt' | 'qr_code';
  location_accuracy?: number;
}

export interface CheckInViewedEvent extends BaseAnalyticsEvent {
  checkin_id: string;
  place_id: string;
  is_own_checkin: boolean;
  view_source: 'feed' | 'profile' | 'place_detail' | 'notification';
}

// Search events
export interface SearchPerformedEvent extends BaseAnalyticsEvent {
  search_query: string;
  search_type: 'places' | 'lists' | 'users';
  results_count: number;
  selected_result_index?: number;
  search_source: 'main_search' | 'place_search' | 'list_search';
}

// Error events
export interface ErrorOccurredEvent extends BaseAnalyticsEvent {
  error_type: 'network' | 'authentication' | 'permission' | 'validation' | 'unknown';
  error_message: string;
  error_code?: string;
  screen_name?: string;
  action_attempted?: string;
  stack_trace?: string;
}

// Performance events
export interface PerformanceEvent extends BaseAnalyticsEvent {
  event_type: 'app_launch' | 'screen_load' | 'api_call' | 'cache_operation';
  duration_ms: number;
  success: boolean;
  details?: Record<string, any>;
}

// Union type for all possible events
export type AnalyticsEvent = 
  | ScreenViewedEvent
  | UserIdentifiedEvent
  | PlaceAddedToListEvent
  | PlaceViewedEvent
  | ListCreatedEvent
  | ListViewedEvent
  | ListSharedEvent
  | CheckInCreatedEvent
  | CheckInViewedEvent
  | SearchPerformedEvent
  | ErrorOccurredEvent
  | PerformanceEvent;

// Event names enum for type safety
export enum AnalyticsEventName {
  SCREEN_VIEWED = 'screen_viewed',
  USER_IDENTIFIED = 'user_identified',
  PLACE_ADDED_TO_LIST = 'place_added_to_list',
  PLACE_VIEWED = 'place_viewed',
  LIST_CREATED = 'list_created',
  LIST_VIEWED = 'list_viewed',
  LIST_SHARED = 'list_shared',
  CHECK_IN_CREATED = 'check_in_created',
  CHECK_IN_VIEWED = 'check_in_viewed',
  SEARCH_PERFORMED = 'search_performed',
  ERROR_OCCURRED = 'error_occurred',
  PERFORMANCE = 'performance'
}

// User properties interface
export interface UserProperties {
  user_id?: string;
  email?: string;
  signup_date?: string;
  signup_method?: 'email' | 'google' | 'facebook';
  total_places?: number;
  total_lists?: number;
  total_checkins?: number;
  last_active_date?: string;
  preferred_location?: string;
  notification_preferences?: {
    push_enabled: boolean;
    email_enabled: boolean;
    location_reminders: boolean;
  };
  app_version?: string;
  device_type?: 'ios' | 'android';
  is_premium?: boolean;
}

// Analytics configuration
export interface AnalyticsConfig {
  apiKey: string;
  enableLogging?: boolean;
  trackSessionEvents?: boolean;
  trackAppLifecycleEvents?: boolean;
  minIdLength?: number;
  serverUrl?: string;
  flushIntervalMillis?: number;
  flushQueueSize?: number;
}

// Analytics service interface
export interface IAnalyticsService {
  initialize(config: AnalyticsConfig): Promise<void>;
  identify(userId: string, userProperties?: UserProperties): Promise<void>;
  track<T extends AnalyticsEvent>(eventName: AnalyticsEventName, eventProperties: T): Promise<void>;
  trackScreen(screenName: string, navigationMethod?: string, params?: Record<string, any>): Promise<void>;
  setUserProperties(properties: Partial<UserProperties>): Promise<void>;
  flush(): Promise<void>;
  reset(): Promise<void>;
  isInitialized(): boolean;
} 