# Google Places Integration with MCP Caching

## Overview

This implementation provides a comprehensive Google Places API integration with intelligent database caching using Supabase MCP (Model Context Protocol). The system is specifically optimized for Bangkok-based location services with context-aware place categorization.

## Features

### 🔍 **Core Functionality**
- **Nearby Places Search**: Find places within a specified radius
- **Place Autocomplete**: Real-time search suggestions with debouncing
- **Place Details**: Detailed information about specific places
- **Bangkok Context Analysis**: Automatic categorization for Bangkok-specific attributes

### 💾 **Intelligent Caching**
- **Database Caching**: Store places in Supabase with 24-hour expiry
- **Spatial Queries**: PostGIS-powered radius searches
- **Cache Statistics**: Monitor cache performance and usage
- **Automatic Cleanup**: Remove expired cache entries

### 🏙️ **Bangkok-Specific Features**
- **BTS Proximity**: Categorize places by distance to BTS stations
- **Environment Type**: Indoor/outdoor/mixed classification
- **Price Tier**: Thai Baht-based pricing levels
- **Amenities**: Air conditioning, noise level, location type

## Architecture

### Services Layer

#### `PlacesService` (`src/services/places.ts`)
Main service handling Google Places API interactions:

```typescript
// Search nearby places with caching
await placesService.searchNearbyPlaces(location, radius, type);

// Get autocomplete suggestions
await placesService.getPlaceAutocomplete(query, location);

// Get detailed place information
await placesService.getPlaceDetails(placeId);

// Bangkok-specific categorization
await placesService.categorizeBangkokPlace(place);
```

#### `PlacesCacheService` (`src/services/placesCache.ts`)
Dedicated caching service with database operations:

```typescript
// Cache management
await placesCacheService.cachePlace(place);
await placesCacheService.getCachedPlace(googlePlaceId);
await placesCacheService.getCachedNearbyPlaces(location, radius);

// Cache monitoring
await placesCacheService.getCacheStats();
await placesCacheService.clearExpiredCache();
```

### Database Schema

#### Places Table
```sql
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  coordinates GEOMETRY(POINT, 4326),
  place_type TEXT,
  price_level INTEGER,
  bangkok_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Spatial Functions
```sql
-- Find places within radius using PostGIS
CREATE FUNCTION places_within_radius(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters INTEGER
) RETURNS TABLE (...);
```

### UI Components

#### `PlaceCard` (`src/components/places/PlaceCard.tsx`)
Displays place information with Bangkok context indicators:
- BTS proximity color coding
- Price tier symbols (฿ to ฿฿฿฿฿)
- Environment icons and amenities
- Distance calculation

#### `PlaceAutocomplete` (`src/components/places/PlaceAutocomplete.tsx`)
Real-time search with debouncing:
- 300ms debounce for API efficiency
- Thailand-specific filtering
- Keyboard-friendly interaction
- Loading states and error handling

#### `PlacesSearchScreen` (`src/screens/places/PlacesSearchScreen.tsx`)
Demo screen showcasing all features:
- Nearby places discovery
- Search functionality
- Cache statistics and management

## Configuration

### Environment Variables
```bash
# Required
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Supabase (already configured)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Google Places API Setup
1. Enable Google Places API in Google Cloud Console
2. Create API key with Places API restrictions
3. Add key to environment variables
4. Configure billing (required for Places API)

## Bangkok Context System

### Environment Classification
- **Indoor**: Restaurants, cafes, shopping malls
- **Outdoor**: Parks, tourist attractions, markets
- **Mixed**: Mixed-use spaces

### BTS Proximity Levels
- **Walking** (< 1km): Green indicator
- **Near** (1-3km): Orange indicator  
- **Far** (3-10km): Red indicator
- **None** (> 10km): Gray indicator

### Price Tiers
- **Street** (฿): Street food, local vendors
- **Casual** (฿฿): Casual dining, local restaurants
- **Mid** (฿฿฿): Mid-range restaurants
- **Upscale** (฿฿฿฿): Fine dining
- **Luxury** (฿฿฿฿฿): High-end establishments

### Additional Context
- **Air Conditioning**: Boolean based on environment type
- **Noise Level**: Quiet/Moderate/Loud based on location
- **Location Type**: Mall/Street/Building/Market

## Caching Strategy

### Cache Expiry
- **Default**: 24 hours for place data
- **Configurable**: Adjustable via `cacheExpiryHours`
- **Automatic**: Expired entries filtered from queries

### Cache Efficiency
- **Spatial Indexing**: PostGIS GIST index on coordinates
- **Upsert Strategy**: Prevent duplicate entries
- **Selective Caching**: Only cache successful API responses

### Cache Monitoring
```typescript
const stats = await placesCacheService.getCacheStats();
// Returns: totalPlaces, recentPlaces, oldestPlace, newestPlace
```

## Performance Optimizations

### API Efficiency
- **Debounced Autocomplete**: 300ms delay reduces API calls
- **Cache-First Strategy**: Check database before API calls
- **Spatial Queries**: Efficient radius-based searches
- **Field Selection**: Request only needed data from Google

### Database Performance
- **Spatial Indexing**: GIST index for coordinate queries
- **Selective Queries**: Filter by cache expiry and type
- **Connection Pooling**: Supabase handles connection management

### UI Performance
- **Lazy Loading**: Components load data on demand
- **Optimistic Updates**: Show local data while fetching
- **Error Boundaries**: Graceful error handling
- **Loading States**: Clear user feedback

## Usage Examples

### Basic Place Search
```typescript
import { placesService } from '../services/places';

// Get user location
const location = await getCurrentLocation();

// Search nearby restaurants
const restaurants = await placesService.searchNearbyPlaces(
  location,
  1000, // 1km radius
  'restaurant'
);
```

### Autocomplete Integration
```typescript
import PlaceAutocomplete from '../components/places/PlaceAutocomplete';

<PlaceAutocomplete
  onPlaceSelect={async (suggestion) => {
    const details = await placesService.getPlaceDetails(suggestion.place_id);
    // Handle place selection
  }}
  location={currentLocation}
  placeholder="Search places in Bangkok..."
/>
```

### Cache Management
```typescript
import { placesCacheService } from '../services/placesCache';

// Monitor cache performance
const stats = await placesCacheService.getCacheStats();
console.log(`Cached ${stats.totalPlaces} places`);

// Clean up expired entries
const cleared = await placesCacheService.clearExpiredCache();
console.log(`Cleared ${cleared} expired places`);
```

## Error Handling

### API Errors
- **Rate Limiting**: Graceful degradation with cached data
- **Network Issues**: Offline-first approach with cache fallback
- **Invalid Responses**: Validation and error logging

### Database Errors
- **Connection Issues**: Retry logic with exponential backoff
- **Query Failures**: Fallback to API-only mode
- **Data Validation**: Type checking and sanitization

### User Experience
- **Loading States**: Clear progress indicators
- **Error Messages**: User-friendly error descriptions
- **Retry Options**: Allow users to retry failed operations

## Testing

### Unit Tests
```bash
# Test places service
npm test src/services/places.test.ts

# Test cache service  
npm test src/services/placesCache.test.ts
```

### Integration Tests
```bash
# Test full workflow
npm test src/integration/places.test.ts
```

### Manual Testing
1. Use `PlacesSearchScreen` for comprehensive testing
2. Test with/without internet connection
3. Verify cache behavior with database inspection
4. Test Bangkok context accuracy

## Monitoring & Analytics

### Cache Performance
- Monitor cache hit rates
- Track API usage reduction
- Analyze spatial query performance

### User Behavior
- Track search patterns
- Monitor place selection rates
- Analyze Bangkok context accuracy

### Error Tracking
- Log API failures and retries
- Monitor database performance
- Track user experience issues

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live data
- **Machine Learning**: Improve Bangkok context prediction
- **Offline Maps**: Download areas for offline use
- **Social Features**: User reviews and ratings

### Performance Improvements
- **Redis Caching**: Add Redis layer for faster autocomplete
- **CDN Integration**: Cache static place data globally
- **Background Sync**: Update cache in background
- **Predictive Caching**: Pre-cache likely searches

## Troubleshooting

### Common Issues

#### "Google Places API key not configured"
- Verify `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is set
- Check API key has Places API enabled
- Ensure billing is configured

#### "No nearby places found"
- Check location permissions
- Verify GPS accuracy
- Try different search radius
- Check internet connection

#### "Cache not working"
- Verify Supabase connection
- Check database permissions
- Ensure PostGIS extension enabled
- Review spatial function creation

### Debug Mode
```typescript
// Enable detailed logging
process.env.DEBUG_PLACES = 'true';
```

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Test with demo screen
4. Contact development team

---

**Last Updated**: June 2025  
**Version**: 1.0.0  
**Compatibility**: React Native 0.72+, Expo SDK 49+ 