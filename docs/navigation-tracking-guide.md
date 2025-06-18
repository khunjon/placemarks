# Navigation Tracking Implementation Guide

## Overview

This guide covers the automatic screen tracking implementation for the Placemarks React Native app using React Navigation and Amplitude analytics. The system provides comprehensive tracking of user navigation patterns, screen engagement, and user journey analytics.

## 🚀 Quick Start

### Automatic Tracking (Recommended)

Screen tracking is automatically enabled throughout the app. No additional setup is required in individual screens:

```typescript
// Navigation is automatically tracked - no code needed in screens!
function MyScreen() {
  return <View>...</View>;
}
```

### Manual Tracking (Special Cases)

For screens that need special handling:

```typescript
import { useAnalytics } from '../hooks/useAnalytics';
import { SCREEN_NAMES } from '../constants/ScreenNames';

function MyScreen() {
  // Only use manual tracking if automatic tracking doesn't work
  const analytics = useAnalytics(SCREEN_NAMES.MY_SCREEN, true);
  
  return <View>...</View>;
}
```

## 📁 Architecture

### Core Components

1. **Screen Name Constants** (`src/constants/ScreenNames.ts`)
   - Standardized screen names for consistent tracking
   - Navigation method definitions
   - Screen name mapping for nested navigation

2. **Navigation Tracking Service** (`src/services/navigationTracking.ts`)
   - Core service handling all navigation tracking
   - Screen session management
   - Time tracking and analytics integration

3. **Navigation Listeners** (in `App.tsx`)
   - React Navigation listeners for automatic tracking
   - State change detection and processing

4. **Enhanced Analytics Hook** (`src/hooks/useAnalytics.ts`)
   - Unified interface for analytics and navigation tracking
   - Manual tracking capabilities for special cases

## 🎯 Features

### Automatic Screen Tracking

- **Screen Views**: Every screen transition is tracked automatically
- **Time Spent**: Accurate time tracking for user engagement
- **Navigation Methods**: Detects how users navigate (tab press, back button, etc.)
- **Screen Parameters**: Captures relevant route parameters
- **Previous Screen**: Tracks user journey and flow

### Tracked Properties

Each screen view event includes:

```typescript
{
  screen_name: 'Lists_ListDetail',           // Standardized screen name
  screen_title: 'List Detail',              // User-friendly title
  previous_screen: 'Lists',                 // Previous screen in journey
  navigation_method: 'push',               // How user navigated
  time_spent: 15000,                       // Time on previous screen (ms)
  timestamp: 1703123456789,                // Event timestamp
  session_id: 'nav_session_1703123456789', // Navigation session ID
  
  // Screen-specific parameters
  listId: 'list_123',
  listName: 'My Favorites',
  listType: 'personal',
  // ... other route parameters
}
```

### Navigation Methods Detected

- `initial_load` - App startup
- `tab_press` - Bottom tab navigation
- `push` - Forward navigation
- `back_button` - Back navigation
- `header_back` - Header back button
- `swipe_back` - iOS swipe back gesture
- `modal` - Modal presentation
- `deep_link` - Deep link navigation
- `programmatic` - Code-triggered navigation

## 🔧 Implementation Details

### Screen Name Mapping

The system maps React Navigation route names to standardized analytics names:

```typescript
// Navigation route -> Analytics screen name
const STACK_SCREEN_MAPPING = {
  ListsStack: {
    Lists: 'Lists',
    ListDetail: 'Lists_ListDetail',
    CreateList: 'Lists_CreateList',
    // ...
  },
  // ...
};
```

### Automatic Tracking Flow

1. **Navigation State Change** - React Navigation listener triggers
2. **Screen Name Resolution** - Route name mapped to standard screen name
3. **Navigation Method Detection** - Analyzes state change to determine method
4. **Parameter Extraction** - Relevant route parameters extracted
5. **Time Calculation** - Time spent on previous screen calculated
6. **Event Tracking** - Screen view event sent to Amplitude
7. **Session Management** - Navigation session state updated

### Performance Considerations

- **Non-blocking**: Analytics calls don't block navigation
- **Debounced**: Rapid navigation changes are handled efficiently
- **Minimal overhead**: Lightweight tracking with minimal performance impact
- **Error handling**: Analytics failures don't affect app functionality

## 📊 Screen Names Reference

### Main Navigation Screens

| Route Name | Analytics Screen Name | Description |
|------------|----------------------|-------------|
| `Decide` | `Decide` | Main decide screen |
| `Lists` | `Lists` | Lists overview |
| `CheckIn` | `CheckIn` | Check-in screen |
| `Profile` | `Profile` | User profile |

### Nested Stack Screens

| Stack | Route | Analytics Name | Description |
|-------|-------|----------------|-------------|
| `ListsStack` | `ListDetail` | `Lists_ListDetail` | List detail view |
| `ListsStack` | `CreateList` | `Lists_CreateList` | Create new list |
| `ListsStack` | `EditList` | `Lists_EditList` | Edit existing list |
| `CheckInStack` | `CheckInForm` | `CheckIn_Form` | Check-in form |
| `ProfileStack` | `EditProfile` | `Profile_Edit` | Edit profile |

## 🎮 Usage Examples

### Basic Screen (Automatic Tracking)

```typescript
// No additional code needed - tracking is automatic!
function ListsScreen() {
  return (
    <View>
      <Text>My Lists</Text>
      {/* Screen view automatically tracked */}
    </View>
  );
}
```

### Screen with Manual Event Tracking

```typescript
function ListDetailScreen({ route }) {
  const analytics = useAnalytics();
  
  const handleShareList = async () => {
    // Track custom events while screen tracking remains automatic
    await analytics.track('list_shared', {
      list_id: route.params.listId,
      share_method: 'native_share',
    });
  };
  
  return <View>...</View>;
}
```

### Special Case Manual Tracking

```typescript
// Only needed if automatic tracking doesn't work properly
function CustomModalScreen() {
  const analytics = useAnalytics(SCREEN_NAMES.CUSTOM_MODAL, true);
  
  useEffect(() => {
    // Manual modal tracking
    analytics.trackModalPresentation(SCREEN_NAMES.CUSTOM_MODAL, {
      source: 'custom_trigger',
      context: 'special_flow',
    });
  }, []);
  
  return <View>...</View>;
}
```

### Navigation-Specific Tracking

```typescript
function MyScreen() {
  const analytics = useAnalytics();
  
  const handleTabPress = async () => {
    // Manual tab tracking (usually automatic)
    await analytics.trackTabPress(SCREEN_NAMES.PROFILE);
  };
  
  const handleBackPress = async () => {
    // Manual back tracking (usually automatic)
    await analytics.trackBackNavigation(SCREEN_NAMES.LISTS, 'back_button');
  };
  
  return <View>...</View>;
}
```

## 📈 Analytics Dashboard

### Key Metrics Available

1. **Screen Views** - Most visited screens
2. **User Journey** - Common navigation paths
3. **Engagement Time** - Time spent per screen
4. **Navigation Methods** - How users navigate
5. **Drop-off Points** - Where users exit flows
6. **Feature Usage** - Screen-specific interactions

### Amplitude Event Structure

Events appear in Amplitude as:
- **Event Name**: `screen_viewed`
- **Event Properties**: All screen and navigation context
- **User Properties**: User-specific data
- **Session Properties**: Navigation session data

## 🔍 Debugging

### Development Logging

In development mode, detailed logs are available:

```typescript
// Console output examples:
[NavigationTracking] Navigation tracking initialized
[NavigationTracking] Screen changed to: Lists_ListDetail {
  navigationMethod: 'push',
  previousScreen: 'Lists',
  timeSpent: 5420
}
```

### Testing Navigation Tracking

Use the provided example component:

```typescript
import NavigationTrackingExample from '../examples/NavigationTrackingExample';

// Add to your navigation for testing
<Stack.Screen 
  name="NavigationTrackingExample" 
  component={NavigationTrackingExample} 
/>
```

### Common Issues

1. **Screen not tracked**: Check screen name mapping
2. **Wrong navigation method**: Verify state change detection
3. **Missing parameters**: Ensure route params are properly passed
4. **Duplicate events**: Check for manual tracking conflicts

## 🛠 Configuration

### Environment Variables

```bash
# Required for analytics
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_api_key
```

### Customization Options

```typescript
// Disable automatic tracking for specific screens
const analytics = useAnalytics(); // No automatic tracking

// Enable manual tracking only
const analytics = useAnalytics(SCREEN_NAMES.MY_SCREEN, true);

// Reset tracking state (useful for testing)
navigationTrackingService.reset();
```

## 🚨 Best Practices

### Do's

- ✅ Rely on automatic tracking for most screens
- ✅ Use standardized screen names from constants
- ✅ Track custom events for user actions
- ✅ Test navigation flows thoroughly
- ✅ Monitor analytics dashboard regularly

### Don'ts

- ❌ Don't use manual tracking unless necessary
- ❌ Don't hardcode screen names in events
- ❌ Don't block navigation for analytics
- ❌ Don't track sensitive user data
- ❌ Don't ignore analytics errors in production

## 📋 Checklist

Before deploying navigation tracking:

- [ ] Amplitude API key configured
- [ ] Navigation listeners set up in App.tsx
- [ ] Screen name constants defined
- [ ] Navigation tracking service initialized
- [ ] Key navigation flows tested
- [ ] Analytics dashboard configured
- [ ] Error handling verified
- [ ] Performance impact assessed

## 🔗 Related Documentation

- [Analytics Implementation Guide](./analytics-implementation-guide.md)
- [React Navigation Documentation](https://reactnavigation.org/)
- [Amplitude React Native SDK](https://amplitude.com/docs/sdks/react-native)

---

This implementation provides comprehensive, automatic navigation tracking while maintaining excellent performance and user experience. The system is designed to be maintainable, scalable, and easy to debug. 