# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Placemarks is a React Native Expo app for discovering, saving, and sharing favorite places in Bangkok. It uses Supabase as the backend and Google Places API for location data, with sophisticated caching and Bangkok-specific contextualization.

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
The app uses a singleton service architecture with heavy caching:

- **places.ts**: Central place management with Google Places API integration and Bangkok-specific contextualization. Uses multi-layer caching (local + Google Places + autocomplete) to minimize API costs.
- **locationService.ts**: Location management with intelligent fallback to Bangkok coordinates and subscription-based updates
- **analytics.ts**: Amplitude integration with comprehensive event tracking and session management
- **supabase.ts**: Database operations with typed service functions for auth, places, check-ins, and lists
- **auth-context.tsx**: React context for authentication state management

### Navigation Architecture
- Bottom tab navigation with nested stack navigators for each major section
- Four main tabs: Decide (recommendations), Lists, Check In, Profile
- Navigation tracking integrated with analytics for user flow analysis

### Data Management
- **Supabase Backend**: PostgreSQL with PostGIS for geospatial queries
- **Multi-layer Caching**: Local SQLite + AsyncStorage + in-memory caching
- **Offline-first**: Graceful degradation when services are unavailable
- **Bangkok Context**: Places are enriched with local context (BTS proximity, environment type, noise level)

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
- `check_ins` - User check-ins with ratings and context
- `lists` - User-created place collections
- `list_places` - Many-to-many relationship between lists and places

## Development Guidelines

### Type Safety
- All new code must use TypeScript with strict mode enabled
- Core types are exported from `src/types/index.ts`
- Database types are defined in `src/services/supabase.ts`

### Service Usage Patterns
- Use existing service singletons rather than creating new instances
- Check cache before making API calls to minimize costs
- Handle errors gracefully - services should never crash the app
- Log API operations for cost monitoring (Google Places API charges per request)

### Location & Places
- Always use `locationService` for user location, not direct Expo Location calls
- Places data combines Google Places API with local Bangkok context
- Use `placesService.searchNearbyPlaces()` for location-based searches
- Cache place data aggressively to reduce API costs

### Database Operations
- Use the typed service functions in `supabase.ts` rather than direct Supabase calls
- PostGIS is used for geospatial queries - coordinates are stored as POINT geometry
- All database operations should handle errors and provide user feedback

## Folder Structure

- `src/components/` - Reusable UI components organized by domain
- `src/screens/` - Screen components organized by navigation stack
- `src/navigation/` - Navigation configuration and types
- `src/services/` - Business logic and API integrations
- `src/types/` - TypeScript type definitions
- `src/constants/` - App constants (colors, spacing, screen names)
- `src/utils/` - Utility functions
- `docs/` - Technical documentation and guides

## Important Implementation Notes

### Google Places API Cost Management
The app includes extensive logging of Google Places API costs:
- Nearby Search: $0.032 per 1000 requests
- Autocomplete: $0.00283 per 1000 requests
- Aggressive caching is implemented to minimize API calls

### Bangkok-Specific Features
- BTS station proximity calculations
- Environment categorization (urban, nature, mixed)
- Local context enrichment for all places
- Fallback location defaults to Bangkok center coordinates

### Cache Strategy
- Three-layer caching: Database → AsyncStorage → Memory
- Place details cached for 24 hours
- Google Places data cached separately from local place data
- Location cache with automatic background refresh