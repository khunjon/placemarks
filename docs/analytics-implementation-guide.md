n# Analytics Implementation Guide

## Overview

This guide covers the complete Amplitude analytics implementation for the Placemarks React Native app. The implementation follows best practices for type safety, error handling, and maintainability.

## 🚀 Quick Start

### 1. Installation

The Amplitude React Native SDK is already installed:

```bash
npm install @amplitude/analytics-react-native
```

### 2. Environment Setup

Add your Amplitude API key to your environment variables:

```bash
# In your .env file
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_api_key_here
```

### 3. Basic Usage

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

function MyScreen() {
  // Automatically tracks screen views
  const analytics = useAnalytics('MyScreen');
  
  const handleAction = async () => {
    // Track events
    await analytics.trackListCreated('list_123', 'My List');
  };
}
```

## 📁 File Structure

```
src/
├── services/
│   └── analytics.ts           # Core analytics service
├── types/
│   └── analytics.ts          # TypeScript interfaces
├── hooks/
│   └── useAnalytics.ts       # React hooks for analytics
└── examples/
    └── AnalyticsExample.tsx  # Comprehensive usage examples
```

## 🔧 Core Components

### 1. Analytics Service (`src/services/analytics.ts`)

The main service that handles all Amplitude interactions:

```typescript
import { analyticsService } from '../services/analytics';

// Initialize (done automatically in App.tsx)
await analyticsService.initialize({
  apiKey: 'your_api_key',
  enableLogging: __DEV__,
});

// Track events
await analyticsService.track(AnalyticsEventName.LIST_CREATED, {
  list_id: 'list_123',
  list_name: 'My Favorites',
  // ... other properties
});

// Identify users
await analyticsService.identify('user_123', {
  email: 'user@example.com',
  total_lists: 5,
});
```

### 2. TypeScript Types (`src/types/analytics.ts`)

Comprehensive type definitions for all analytics events:

```typescript
// Event interfaces
export interface ListCreatedEvent extends BaseAnalyticsEvent {
  list_id: string;
  list_name: string;
  list_type: 'personal' | 'shared' | 'collaborative';
  creation_source: 'manual' | 'template' | 'import';
  initial_place_count?: number;
}

// Event names enum
export enum AnalyticsEventName {
  LIST_CREATED = 'list_created',
  PLACE_ADDED_TO_LIST = 'place_added_to_list',
  CHECK_IN_CREATED = 'check_in_created',
  // ... more events
}
```

### 3. React Hooks (`src/hooks/useAnalytics.ts`)

Convenient hooks for different analytics needs:

```typescript
// Basic analytics with screen tracking
const analytics = useAnalytics('ScreenName');

// Performance tracking
const { trackAsyncOperation } = usePerformanceTracking();

// Error tracking
const { trackError } = useErrorTracking('ScreenName');

// Search analytics
const { trackSearch } = useSearchAnalytics();

// User journey tracking
const { trackListViewed } = useUserJourneyAnalytics();
```

## 📊 Event Types

### Core Events

1. **Screen Views** - Automatically tracked
2. **User Identification** - Track user properties
3. **List Operations** - Create, view, share lists
4. **Place Operations** - Add places, view details
5. **Check-ins** - Create and view check-ins
6. **Search** - Track search queries and results
7. **Errors** - Automatic error tracking
8. **Performance** - API calls and operations

### Event Properties

All events include common properties:
- `timestamp` - Event time
- `session_id` - User session identifier
- `user_id` - Current user ID
- `app_version` - App version
- `platform` - iOS/Android

## 🎯 Usage Patterns

### 1. Screen Tracking

Automatic screen tracking with the `useAnalytics` hook:

```typescript
function MyScreen() {
  // Automatically tracks when screen is focused
  const analytics = useAnalytics('MyScreen');
  
  return <View>...</View>;
}
```

### 2. User Actions

Track user interactions with helper functions:

```typescript
const analytics = useAnalytics();

// List creation
await analytics.trackListCreated(
  'list_123',
  'My Favorites',
  'personal',
  'manual',
  0
);

// Place addition
await analytics.trackPlaceAddedToList(
  'list_123',
  'My Favorites',
  'place_456',
  'Great Restaurant',
  'search'
);

// Check-in creation
await analytics.trackCheckInCreated(
  'checkin_789',
  'place_456',
  'Great Restaurant',
  {
    rating: 5,
    hasPhoto: true,
    hasNote: true,
    source: 'manual',
  }
);
```

### 3. Performance Tracking

Track API calls and operations:

```typescript
const { trackAsyncOperation } = usePerformanceTracking();

const loadData = async () => {
  const result = await trackAsyncOperation(
    async () => {
      const response = await fetch('/api/data');
      return response.json();
    },
    'api_call',
    { endpoint: '/api/data' }
  );
  
  return result;
};
```

### 4. Error Tracking

Automatic error tracking with context:

```typescript
const { trackError } = useErrorTracking('MyScreen');

try {
  await riskyOperation();
} catch (error) {
  trackError(error, {
    errorType: 'network',
    actionAttempted: 'load_data',
  });
}
```

### 5. Search Analytics

Track search behavior:

```typescript
const { trackSearch } = useSearchAnalytics();

const handleSearch = async (query: string) => {
  const results = await searchAPI(query);
  
  await trackSearch(
    query,
    'places',
    results.length,
    'main_search'
  );
};
```

### 6. User Journey

Track user navigation and engagement:

```typescript
const { trackListViewed } = useUserJourneyAnalytics();

const handleListPress = async (list) => {
  await trackListViewed(
    list.id,
    list.name,
    list.type,
    list.placeCount,
    viewDuration
  );
  
  navigation.navigate('ListDetail', { listId: list.id });
};
```

## 🔒 Privacy & Security

### Data Collection

The implementation follows privacy best practices:

- **No IP address tracking** - Disabled for user privacy
- **Minimal PII** - Only necessary user data is collected
- **Opt-out support** - Can be disabled via configuration
- **Secure transmission** - All data encrypted in transit

### User Properties

Collected user properties:
- User ID (required for analytics)
- Email (for user identification)
- App usage statistics (lists, places, check-ins)
- Preferences (notifications, location)
- App version and device type

## 🛠 Configuration

### Analytics Configuration

```typescript
interface AnalyticsConfig {
  apiKey: string;
  enableLogging?: boolean;          // Default: __DEV__
  trackSessionEvents?: boolean;     // Default: true
  trackAppLifecycleEvents?: boolean; // Default: true
  minIdLength?: number;            // Minimum user ID length
  serverUrl?: string;              // Custom server URL
  flushIntervalMillis?: number;    // Default: 30000
  flushQueueSize?: number;         // Default: 30
}
```

### Environment Variables

```bash
# Required
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_api_key

# Optional - for custom configuration
EXPO_PUBLIC_AMPLITUDE_SERVER_URL=custom_server_url
```

## 🚨 Error Handling

The implementation includes comprehensive error handling:

1. **Graceful Failures** - Analytics failures never crash the app
2. **Automatic Retry** - Failed events are retried automatically
3. **Error Logging** - All errors logged in development
4. **Fallback Behavior** - App continues to work without analytics

```typescript
// Error handling is built into all methods
try {
  await analytics.track(eventName, properties);
} catch (error) {
  // Error is logged but doesn't throw
  console.error('Analytics error:', error);
}
```

## 📈 Best Practices

### 1. Event Naming

- Use snake_case for event names
- Be descriptive and consistent
- Group related events with prefixes

### 2. Property Naming

- Use snake_case for property names
- Include context (screen_name, source, etc.)
- Keep property names consistent across events

### 3. Performance

- Use async/await for non-blocking analytics
- Batch events when possible
- Don't block UI for analytics calls

### 4. Testing

- Use the example component for testing
- Check Amplitude dashboard for event delivery
- Test error scenarios and edge cases

## 🔍 Debugging

### Development Mode

In development, analytics logging is enabled:

```typescript
// Check initialization status
console.log('Analytics initialized:', analytics.isInitialized());

// View event logs in console
[Analytics] Event tracked: list_created { list_id: '123', ... }
```

### Testing Events

Use the `AnalyticsExample` component to test all event types:

```typescript
import AnalyticsExample from '../examples/AnalyticsExample';

// Add to your navigation for testing
<Stack.Screen name="AnalyticsExample" component={AnalyticsExample} />
```

### Amplitude Dashboard

1. Check the "Live" view for real-time events
2. Use "User Lookup" to see user-specific events
3. Create charts and dashboards for key metrics

## 🚀 Advanced Usage

### Custom Events

For events not covered by the predefined types:

```typescript
await analytics.track(AnalyticsEventName.PERFORMANCE, {
  event_type: 'custom_operation',
  duration_ms: 1500,
  success: true,
  details: {
    custom_property: 'value',
  },
  timestamp: Date.now(),
} as any);
```

### Batch Operations

For multiple related events:

```typescript
// Track multiple events in sequence
await Promise.all([
  analytics.trackListCreated(listId, listName),
  analytics.setUserProperties({ total_lists: newCount }),
  analytics.trackPerformance('api_call', duration, true),
]);
```

### User Segmentation

Set user properties for segmentation:

```typescript
await analytics.setUserProperties({
  user_tier: 'premium',
  location: 'Bangkok',
  signup_date: user.createdAt,
  total_checkins: userStats.checkins,
});
```

## 📋 Checklist

Before going to production:

- [ ] Amplitude API key configured
- [ ] Analytics initialized in App.tsx
- [ ] Core events implemented in key screens
- [ ] Error tracking added to critical flows
- [ ] User identification working on login
- [ ] Performance tracking on API calls
- [ ] Search analytics implemented
- [ ] Privacy compliance reviewed
- [ ] Testing completed with example component
- [ ] Amplitude dashboard configured

## 🆘 Troubleshooting

### Common Issues

1. **Events not appearing in Amplitude**
   - Check API key configuration
   - Verify network connectivity
   - Check development vs production keys

2. **TypeScript errors**
   - Ensure all types are imported correctly
   - Use `as any` for complex event properties if needed

3. **Performance issues**
   - Don't await analytics calls in UI interactions
   - Use background tracking for non-critical events

4. **User identification not working**
   - Ensure user ID is set after login
   - Check user properties are being sent

### Getting Help

- Check the Amplitude documentation
- Review the example implementation
- Test with the provided example component
- Check console logs in development mode

## 📚 Resources

- [Amplitude React Native SDK Documentation](https://amplitude.com/docs/sdks/react-native)
- [Analytics Best Practices](https://amplitude.com/blog/analytics-best-practices)
- [Event Taxonomy Guide](https://amplitude.com/blog/event-taxonomy-guide)

---

This implementation provides a solid foundation for product analytics while maintaining type safety and following React Native best practices. 