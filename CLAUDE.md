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

**Specialized Cache Services:**
- **cacheManager.ts**: Centralized cache orchestration
- **googlePlacesCache.ts**: Google Places API response caching (30-day TTL)
- **placeDetailsCache.ts**: Detailed place information caching
- **placesCache.ts**: Local place data caching
- **locationCache.ts**: User location caching with background refresh
- **checkInSearchCache.ts**: Check-in search optimization
- **listsCache.ts** & **listDetailsCache.ts**: List management caching

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

### Data Management
- **Supabase Backend**: PostgreSQL with PostGIS for geospatial queries
- **Multi-layer Caching**: Database → AsyncStorage → Memory with intelligent invalidation
- **Offline-first**: Graceful degradation when services are unavailable
- **City Context**: Places enriched with city-specific context (transport proximity, environment type)

## Key Configuration

### Environment Variables Required
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_api_key (optional)
```

### Database Schema
The app uses Supabase with these core tables:
- `users` - User profiles and authentication
- `places` - Location data with PostGIS geometry for coordinates
- `editorial_places` - Curated place content
- `check_ins` - User check-ins with ratings and context
- `lists` - User-created place collections
- `list_places` - Many-to-many relationship between lists and places
- `user_place_ratings` - User ratings for places
- `google_places_cache` - Cached Google Places API responses
- `recommendation_requests` - User recommendation history

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

## Current App State

### Fully Working Features ✅
- User authentication and profile management
- Lists management with full CRUD operations
- Check-in creation and history display
- Google Places search and caching
- Location services with city detection
- Comprehensive caching system
- Analytics tracking

### Mock/Incomplete Features ❌
- Decide screen recommendations (uses mock data)
- Smart lists generation
- Photo uploads and management
- Maps integration
- Real-time features

## Folder Structure

- `src/components/` - Reusable UI components organized by domain
- `src/screens/` - Screen components organized by navigation stack
- `src/navigation/` - Navigation configuration and types
- `src/services/` - Business logic and API integrations
- `src/types/` - TypeScript type definitions (centralized)
- `src/config/` - App configuration including city configs
- `src/constants/` - App constants (colors, spacing, screen names)
- `src/utils/` - Utility functions
- `src/hooks/` - Custom React hooks
- `docs/` - Technical documentation and implementation guides
- `supabase/` - Database migrations and configuration

## Cache Strategy

The app implements a sophisticated multi-layer caching system:

1. **Google Places Cache**: 30-day TTL for API responses
2. **Place Details Cache**: 24-hour TTL for detailed place information
3. **Location Cache**: Background refresh with fallback coordinates
4. **Search Cache**: 15-minute TTL for search results
5. **List Cache**: Real-time invalidation for user-generated content

All caches are coordinated through the `cacheManager` service.

## Cost Optimization

### Google Places API Management
- Nearby Search: $0.032 per 1000 requests
- Autocomplete: $0.00283 per 1000 requests
- Text Search: Variable pricing
- Extensive logging and monitoring of API usage
- Multi-layer caching to minimize redundant calls
- Strategic batching of requests

### Performance Optimizations
- Debounced search inputs
- Intelligent prefetching
- Background data refresh
- Graceful offline handling