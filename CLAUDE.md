# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Placemarks is a React Native Expo app for discovering, saving, and sharing favorite places. Originally focused on Bangkok, it now uses a flexible city-based architecture that can be extended to other cities. The app uses Supabase as the backend and Google Places API for location data, with sophisticated multi-layer caching and location-specific contextualization.

## Essential Development Commands

### Running the Application
- `npm start` - Start the Expo development server
- `npm run ios` - Run on iOS simulator/device
- `npm run android` - Run on Android emulator/device
- `npm run web` - Run web version

### Database & Testing
- `npm run setup-db` - Set up database schema and initial data
- `npm run test-db` - Test database connectivity and operations
- `npm run type-check` - Run TypeScript type checking

## Core Architecture

### Service Layer Pattern
The app uses a comprehensive service-oriented architecture with extensive caching:

**Core Services:**
- **places.ts**: Central place management with Google Places API integration and city-specific contextualization
- **supabase.ts**: Database operations with typed service functions for all entities
- **auth-context.tsx**: React context for authentication state management
- **locationService.ts**: Location management with intelligent fallback coordinates
- **analytics.ts**: Amplitude integration with comprehensive event tracking
- **recommendationService.ts**: Database-backed recommendation engine with preference filtering
- **userRatingsService.ts**: User ratings management for places (1-5 stars)
- **placeAvailability.ts**: Place availability checking for recommendations

**Specialized Cache Services:**
- **cacheManager.ts**: Centralized cache orchestration with unified invalidation
- **googlePlacesCache.ts**: Google Places API response caching (90-day TTL, configurable)
- **placeDetailsCache.ts**: Detailed place information caching (24-hour TTL)
- **locationCache.ts**: User location caching with background refresh (3-minute TTL)
- **checkInSearchCache.ts**: Check-in search optimization (15-minute TTL)
- **listsCache.ts** & **listDetailsCache.ts**: List management caching (60-minute TTL)

**Context Services:**
- **cityContext.ts**: City detection and boundary checking
- **cityCategorizer.ts**: Location categorization (urban, nature, mixed)

### City-Based Architecture
The app uses a configurable city system located in `src/config/cities/`:
- **bangkok.ts**: Bangkok-specific configuration (BTS stations, boundaries, context)
- **types.ts**: City configuration interfaces
- **index.ts**: City registry and management functions

This allows easy expansion to new cities while maintaining location-specific features.

### Navigation Architecture
- Bottom tab navigation with nested stack navigators
- Four main tabs: Decide (recommendations), Lists, Check In, Profile
- Navigation tracking integrated with analytics for user flow analysis
- Each tab has its own stack navigator for deep navigation
- Profile stack includes RecommendationSettings screen for configuring recommendation preferences

### Data Management
- **Supabase Backend**: PostgreSQL with PostGIS for geospatial queries
- **Multi-layer Caching**: Database → AsyncStorage → Memory with intelligent invalidation
- **Offline-first**: Graceful degradation when services are unavailable
- **City Context**: Places enriched with city-specific context (transport proximity, environment type)

## Key Configuration

### Environment Variables

#### Local Development (.env file)
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_api_key (optional)
EXPO_PUBLIC_GOOGLE_PLACES_CACHE_DAYS=90 (optional, defaults to 90)
```

#### EAS Build Environment Variables
For production builds with EAS, you need to set these environment variables:
```bash
# Required for Google Places API to work in production
eas env:create --environment preview --name GOOGLE_PLACES_API_KEY --value "your-api-key"

# Other required variables (use exact same values as local)
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"
eas env:create --environment preview --name EXPO_PUBLIC_AMPLITUDE_API_KEY --value "your-key"
eas env:create --environment preview --name EXPO_PUBLIC_GOOGLE_PLACES_CACHE_DAYS --value "90"
```

**Important**: The `GOOGLE_PLACES_API_KEY` (without EXPO_PUBLIC_ prefix) is required for EAS builds due to how environment variables are processed during the build phase.

### Environment Configuration Architecture

The app uses a centralized environment configuration service (`src/config/environment.ts`) that handles both development and production environments:

1. **Build Time**: `app.config.js` (not app.json) embeds environment variables into the app during EAS builds
2. **Runtime**: The config service accesses these values through `expo-constants` in production or `process.env` in development
3. **Fallback Chain**: Production (expo-constants) → Development (process.env) → Default values

This approach ensures environment variables work correctly in:
- Expo Go (uses .env file via process.env)
- Development builds (uses .env file)
- Production builds (uses EAS environment variables via expo-constants)

### Database Schema
The app uses Supabase with these core tables:
- `users` - User profiles and authentication
- `places` - Location data with PostGIS geometry for coordinates (legacy, migrating to Google Place IDs)
- `editorial_places` - Curated place content with custom descriptions and tags
- `check_ins` - User check-ins with ratings and context
- `lists` - User-created place collections (sorted by last_place_added timestamp)
- `list_places` - Many-to-many relationship between lists and places
- `user_place_ratings` - User ratings for places (1-5 stars, one rating per user per place)
- `google_places_cache` - Cached Google Places API responses (primary place data source)
- `recommendation_requests` - User recommendation history and context
- `recommendation_instances` - Individual place recommendations for tracking
- `recommendation_feedback` - User feedback on recommendations (liked/disliked/viewed)

**Supabase MCP Integration**: Use the available Supabase MCP tools for direct database operations, migrations, and administration.

### Web Admin UI
There is a separate web admin UI project that connects to the same Supabase backend for content management and analytics.

## Development Guidelines

### Type Safety
- All new code must use TypeScript with strict mode enabled
- Centralized type system in `src/types/` with single source of truth
- `src/types/index.ts` serves as the main type export hub
- Database types are defined in `src/services/supabase.ts`

### Service Usage Patterns
- Use existing service singletons rather than creating new instances
- Always check cache layers before making API calls to minimize costs
- Handle errors gracefully - services should never crash the app
- Extensive logging for API operations and cost monitoring
- Use the specialized cache services for optimal performance

### Location & Places
- Always use `locationService` for user location, not direct Expo Location calls
- Places data combines Google Places API with city-specific context
- Use `placesService.searchNearbyPlaces()` for location-based searches
- Aggressive caching implemented to reduce API costs
- City context automatically applied based on user location

### Database Operations
- Use the typed service functions in `supabase.ts` rather than direct Supabase calls
- PostGIS is used for geospatial queries - coordinates are stored as POINT geometry
- All database operations should handle errors and provide user feedback
- Use Supabase MCP tools for database administration and migrations

### Screen Analytics Integration
- **All new screens MUST be added to the analytics screen mapping** in `src/constants/ScreenNames.ts`
- When creating a new screen, add it to three locations in ScreenNames.ts:
  1. Add a constant in the `SCREEN_NAMES` object using the pattern `STACK_SCREENNAME: 'Stack_ScreenName'`
  2. Add the route mapping in the appropriate stack within `STACK_SCREEN_MAPPING`
  3. Add a user-friendly title in the `getScreenTitle()` function
- Follow the existing naming convention: `Stack_ScreenName` (e.g., `Profile_RecommendationSettings`)
- This ensures proper analytics tracking and prevents console warnings about missing screen mappings

### Icon Usage
- **Always use Lucide icons from the centralized icon system** (`src/components/icons/index.tsx`)
- Import icons like: `import { MapPin, Star, Heart } from '../components/icons';`
- Never use MaterialIcons, @expo/vector-icons, or react-native-vector-icons directly
- The centralized system provides consistent sizing, styling, and type safety
- All icons support props: `size`, `color`, `strokeWidth`, `style`
- For new icons not in the system, add them to the centralized file first

## Current App State

### Fully Working Features ✅
- User authentication and profile management
- Lists management with full CRUD operations (sorted by last edited date)
- Check-in creation and history display
- Google Places search with optimized caching (90-day TTL)
- Location services with city detection and 3-minute cache refresh
- Comprehensive multi-layer caching system with centralized configuration
- Analytics tracking with Amplitude integration
- Check-in search optimization with location-based caching
- Background cache refresh with soft expiry patterns
- **Decide screen recommendations** - Fully functional database-backed recommendations with:
  - Personalized recommendations based on saved places
  - User preference filtering (Food, Coffee, Work)
  - Thumbs up/down feedback system
  - Opening hours integration
  - Distance-based sorting
  - Recommendation settings in Profile
- User ratings system for places (1-5 stars)
- User feedback tracking for recommendation improvement

### Mock/Incomplete Features ❌
- Smart lists generation
- Photo uploads and management
- Maps integration

## Folder Structure

- `src/components/` - Reusable UI components organized by domain
- `src/screens/` - Screen components organized by navigation stack
- `src/navigation/` - Navigation configuration and types
- `src/services/` - Business logic and API integrations
- `src/types/` - TypeScript type definitions (centralized)
- `src/config/` - App configuration including city configs and cache settings
- `src/constants/` - App constants (colors, spacing, screen names)
- `src/utils/` - Utility functions
- `src/hooks/` - Custom React hooks
- `docs/` - Technical documentation and implementation guides
- `supabase/` - Database migrations and configuration

## Cache Strategy

The app implements a sophisticated multi-layer caching system with centralized configuration:

1. **Google Places Cache**: 90-day TTL (configurable via EXPO_PUBLIC_GOOGLE_PLACES_CACHE_DAYS)
2. **Place Details Cache**: 24-hour TTL with 12-hour soft expiry for background refresh
3. **Location Cache**: 3-minute TTL with background refresh every 2 minutes
4. **Check-In Search Cache**: 15-minute TTL with 5-minute in-memory cache
5. **Lists Cache**: 60-minute TTL with 30-minute soft expiry for background refresh

All caches are coordinated through the `cacheManager` service and configured via `src/config/cacheConfig.ts`.

## Cost Optimization

### Google Places API Management
- Nearby Search: $0.032 per 1000 requests
- Autocomplete: $0.00283 per 1000 requests
- Text Search: Variable pricing
- Extensive logging and monitoring of API usage
- Multi-layer caching to minimize redundant calls
- Strategic batching of requests

### Performance Optimizations
- Debounced search inputs (300ms autocomplete, 800ms search)
- Intelligent prefetching with soft expiry patterns
- Background data refresh with centralized cache coordination
- Graceful offline handling with fallback data
- Centralized cache configuration in `src/config/cacheConfig.ts`
- Unified cache invalidation through `cacheManager`

### Animation & Gesture Performance Guidelines

When implementing swipeable components or animations in React Native, follow these best practices for optimal performance:

1. **Always use react-native-gesture-handler over PanResponder**
   - Gestures run on the UI thread (60fps) instead of JS thread
   - Requires wrapping app with `GestureHandlerRootView` at root level
   - Example: SwipeablePlaceCard uses `PanGestureHandler` for smooth swipes

2. **Use Native Driver for all animations**
   - Always set `useNativeDriver: true` in Animated configurations
   - Animations run on native thread without JS bridge overhead
   - Use `Animated.event` to bind gestures directly to animated values

3. **Pre-calculate animation interpolations**
   - Use `Animated.interpolate` to derive values from a single animated value
   - Avoids per-frame calculations during animations
   - Example: Opacity and scale derived from translateX in swipe gestures

4. **Avoid state updates during gestures**
   - Never call `setState` during active gestures (causes re-renders)
   - Use Animated values or refs instead of React state
   - State updates should only happen on gesture completion

5. **Optimize animation physics**
   - Spring animations: tension=40, friction=7 for snappy response
   - Use `Animated.sequence` for multi-step animations
   - Consider velocity in gesture endings for natural feel

6. **Proper gesture configuration**
   - Set `activeOffsetX` to prevent accidental activation
   - Use `failOffsetY` to cancel on vertical movement
   - Enable `shouldCancelWhenOutside` for better scroll integration

7. **Component memoization**
   - Use `React.memo` with custom comparison functions
   - Only re-render when essential props change
   - Avoid passing new function instances as props

## Common Issues & Troubleshooting

### Environment Variables Not Working in Production

**Problem**: API keys work in Expo Go but not in TestFlight/production builds.

**Solution**: This is usually because environment variables aren't properly configured for EAS builds:

1. Ensure you have `GOOGLE_PLACES_API_KEY` (without EXPO_PUBLIC_ prefix) set in EAS
2. Check that `app.config.js` uses the fallback pattern:
   ```javascript
   googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
   ```
3. Verify environment variables are set: `eas env:list --environment preview`

### Build Number Issues

**Problem**: "You've already submitted this build" error when submitting to TestFlight.

**Solution**: Remove any hardcoded `buildNumber` from `app.config.js` and let EAS auto-increment handle it:
```javascript
// Remove this line from ios config:
// buildNumber: "1",
```

### Debugging Production Issues

To debug environment variables in production builds, temporarily add debug output to a visible screen:
```javascript
import Constants from 'expo-constants';
console.log('Config available:', Constants.expoConfig?.extra);
```