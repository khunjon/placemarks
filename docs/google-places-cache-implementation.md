# Google Places Cache Implementation

## Overview

The Google Places Cache is a comprehensive caching system designed to reduce Google Places API calls by storing frequently accessed place data locally in Supabase. This implementation provides intelligent caching with automatic expiration, access tracking, and cost optimization.

## Architecture

### Database Schema

The `google_places_cache` table stores comprehensive Google Places data:

```sql
CREATE TABLE google_places_cache (
  -- Google Places identifiers
  google_place_id TEXT PRIMARY KEY,
  
  -- Basic place information
  name TEXT,
  formatted_address TEXT,
  geometry JSONB, -- Contains lat/lng and viewport
  types TEXT[], -- Array of place types
  
  -- Ratings and pricing
  rating DECIMAL(3,2), -- Google rating (0.00 to 5.00)
  user_ratings_total INTEGER,
  price_level INTEGER, -- 0-4 price level
  
  -- Contact information
  formatted_phone_number TEXT,
  international_phone_number TEXT,
  website TEXT,
  
  -- Hours and availability
  opening_hours JSONB,
  current_opening_hours JSONB,
  
  -- Photos and media
  photos JSONB,
  
  -- Reviews (limited to 5 most recent)
  reviews JSONB,
  
  -- Additional metadata
  business_status TEXT,
  place_id TEXT,
  plus_code JSONB,
  
  -- Cache management
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  
  -- Data completeness tracking
  has_basic_data BOOLEAN DEFAULT FALSE,
  has_contact_data BOOLEAN DEFAULT FALSE,
  has_hours_data BOOLEAN DEFAULT FALSE,
  has_photos_data BOOLEAN DEFAULT FALSE,
  has_reviews_data BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Service Architecture

The `GooglePlacesCacheService` provides:

1. **Intelligent Caching**: Checks cache first, fetches from API only when needed
2. **Batch Operations**: Efficiently handles multiple place requests
3. **Access Tracking**: Monitors usage patterns for optimization
4. **Cost Monitoring**: Logs API costs and cache hits
5. **Data Integrity**: Tracks data completeness and quality

## Key Features

### 1. Smart Cache Strategy

```typescript
// Check cache first, fetch from API if needed
const place = await googlePlacesCache.getPlaceDetails(googlePlaceId);

// Force refresh from API
const freshPlace = await googlePlacesCache.getPlaceDetails(googlePlaceId, true);
```

### 2. Batch Processing

```typescript
// Efficiently handle multiple places
const places = await googlePlacesCache.getMultiplePlaceDetails([
  'place_id_1',
  'place_id_2',
  'place_id_3'
]);
```

### 3. Cost Optimization

- **30-day cache expiration** reduces API calls
- **Access tracking** identifies popular places
- **Batch processing** with rate limiting
- **Detailed logging** for cost monitoring

### 4. Data Quality Tracking

The system tracks data completeness:
- `has_basic_data`: Name, address, geometry
- `has_contact_data`: Phone, website
- `has_hours_data`: Opening hours
- `has_photos_data`: Photos available
- `has_reviews_data`: Reviews available

## Usage Examples

### Basic Usage

```typescript
import { googlePlacesCache } from '../services/googlePlacesCache';

// Get place details (cached or fresh)
const place = await googlePlacesCache.getPlaceDetails('ChIJ...');

if (place) {
  console.log(`${place.name} - Rating: ${place.rating}`);
  console.log(`Address: ${place.formatted_address}`);
  console.log(`Photos: ${place.photos?.length || 0}`);
}
```

### Batch Processing

```typescript
// Get multiple places efficiently
const placeIds = ['ChIJ1...', 'ChIJ2...', 'ChIJ3...'];
const places = await googlePlacesCache.getMultiplePlaceDetails(placeIds);

places.forEach((place, placeId) => {
  console.log(`${placeId}: ${place.name}`);
});
```

### Cache Management

```typescript
// Get cache statistics
const stats = await googlePlacesCache.getCacheStats();
console.log(`Cache: ${stats.validEntries}/${stats.totalEntries} valid entries`);
console.log(`Top places:`, stats.topPlaces);

// Clear expired entries
const cleared = await googlePlacesCache.clearExpiredEntries();
console.log(`Cleared ${cleared} expired entries`);
```

## Performance Optimizations

### 1. Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_google_places_cache_expires_at ON google_places_cache(expires_at);
CREATE INDEX idx_google_places_cache_last_accessed ON google_places_cache(last_accessed);
CREATE INDEX idx_google_places_cache_access_count ON google_places_cache(access_count DESC);
CREATE INDEX idx_google_places_cache_rating ON google_places_cache(rating DESC) WHERE rating IS NOT NULL;
```

### 2. Rate Limiting

- 100ms delay between API calls in batch operations
- Prevents API quota exhaustion
- Maintains service stability

### 3. Intelligent Expiration

- **30-day default expiration** balances freshness and performance
- **Access tracking** identifies frequently used places
- **Automatic cleanup** of expired entries

## Cost Analysis

### Google Places API Costs

- **Place Details**: $0.017 per 1,000 requests
- **Cache Hit**: $0.000 (free!)
- **Typical Savings**: 70-90% reduction in API calls

### Cost Monitoring

The service logs detailed cost information:

```typescript
// Cache hit (no cost)
console.log('💾 GOOGLE PLACES API: Place Details (cached)', {
  googlePlaceId: 'ChIJ...',
  cost: '$0.000 - cached!',
  accessCount: 5
});

// API call (cost incurred)
console.log('🔍 GOOGLE PLACES API: Place Details (fetched & cached)', {
  googlePlaceId: 'ChIJ...',
  cost: '$0.017 per 1000 calls',
  hasPhotos: true,
  rating: 4.5
});
```

## Security

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE google_places_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and write
CREATE POLICY "Allow authenticated users to read Google Places cache"
  ON google_places_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to write Google Places cache"
  ON google_places_cache FOR ALL TO authenticated USING (true);
```

### Data Privacy

- No personal user data stored
- Only public Google Places information cached
- Automatic expiration ensures data freshness

## Integration Points

### 1. Places Service Integration

```typescript
// In src/services/places.ts
import { googlePlacesCache } from './googlePlacesCache';

export async function getPlaceDetails(googlePlaceId: string) {
  // Use cache for Google Places data
  const googleData = await googlePlacesCache.getPlaceDetails(googlePlaceId);
  
  // Combine with local place data
  const localPlace = await getLocalPlace(googlePlaceId);
  
  return {
    ...localPlace,
    ...googleData
  };
}
```

### 2. Check-in Service Integration

```typescript
// In src/services/checkInsService.ts
export async function enrichCheckInWithPlaceData(checkIn: CheckIn) {
  if (checkIn.place?.google_place_id) {
    const googleData = await googlePlacesCache.getPlaceDetails(
      checkIn.place.google_place_id
    );
    
    return {
      ...checkIn,
      place: {
        ...checkIn.place,
        ...googleData
      }
    };
  }
  
  return checkIn;
}
```

## Monitoring and Maintenance

### 1. Cache Health Monitoring

```typescript
// Regular cache health check
const stats = await googlePlacesCache.getCacheStats();

if (stats.expiredEntries > 1000) {
  console.warn('High number of expired entries:', stats.expiredEntries);
  await googlePlacesCache.clearExpiredEntries();
}
```

### 2. Performance Metrics

Track these metrics:
- **Cache hit ratio**: `cached_requests / total_requests`
- **Average access count**: Popular places indicator
- **API cost savings**: `(cache_hits * $0.017) / 1000`
- **Data completeness**: Percentage with full data

### 3. Maintenance Tasks

```typescript
// Weekly maintenance (can be automated)
async function weeklyMaintenance() {
  // Clear expired entries
  const cleared = await googlePlacesCache.clearExpiredEntries();
  
  // Get performance stats
  const stats = await googlePlacesCache.getCacheStats();
  
  console.log(`Maintenance completed:
    - Cleared ${cleared} expired entries
    - ${stats.validEntries} valid entries remaining
    - Top places: ${stats.topPlaces.slice(0, 3).map(p => p.name).join(', ')}`);
}
```

## Best Practices

### 1. Error Handling

```typescript
// Always handle cache failures gracefully
const place = await googlePlacesCache.getPlaceDetails(googlePlaceId);
if (!place) {
  console.warn('Failed to get place details, using fallback');
  return fallbackPlaceData;
}
```

### 2. Batch Operations

```typescript
// Use batch operations for multiple places
const placeIds = checkIns.map(c => c.place?.google_place_id).filter(Boolean);
const cachedPlaces = await googlePlacesCache.getMultiplePlaceDetails(placeIds);

// Apply cached data to check-ins
checkIns.forEach(checkIn => {
  if (checkIn.place?.google_place_id) {
    const cachedPlace = cachedPlaces.get(checkIn.place.google_place_id);
    if (cachedPlace) {
      checkIn.place = { ...checkIn.place, ...cachedPlace };
    }
  }
});
```

### 3. Cache Warming

```typescript
// Pre-populate cache for popular places
const popularPlaceIds = await getPopularPlaceIds();
await googlePlacesCache.getMultiplePlaceDetails(popularPlaceIds);
```

## Future Enhancements

1. **Adaptive Expiration**: Shorter expiration for frequently changing data
2. **Selective Refresh**: Update only specific fields when needed
3. **Background Sync**: Proactive cache updates for popular places
4. **Analytics Integration**: Detailed usage analytics and reporting
5. **Multi-region Support**: Regional cache optimization

## Troubleshooting

### Common Issues

1. **High API Costs**: Check cache hit ratio, ensure proper integration
2. **Stale Data**: Verify expiration settings, consider force refresh
3. **Performance Issues**: Check database indexes, optimize batch sizes
4. **Missing Data**: Verify API key configuration, check error logs

### Debug Logging

Enable detailed logging to troubleshoot issues:

```typescript
// Add to service for debugging
console.log('🔍 GOOGLE PLACES CACHE DEBUG:', {
  operation: 'getPlaceDetails',
  googlePlaceId,
  cacheHit: !!cached,
  expired: cached ? this.isExpired(cached) : null,
  accessCount: cached?.access_count || 0
});
```

This comprehensive caching system provides significant cost savings while maintaining data quality and performance for the Placemarks application. 