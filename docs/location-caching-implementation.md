# Location Caching Implementation

This document describes the location caching system implemented to reduce API calls and improve app performance.

## Overview

The location caching system provides:
- **5-minute cache validity** for fresh location data
- **Background location updates** every 10 minutes when app is active
- **Offline fallback** using last known location when network is unavailable
- **Bangkok fallback** when no location data is available
- **Multiple location sources**: GPS, network, cache, offline, and fallback

## Architecture

### Components

1. **LocationCache** (`src/services/locationCache.ts`)
   - Handles AsyncStorage operations for location data
   - Manages cache validation and expiration
   - Provides offline fallback capabilities

2. **Enhanced useLocation Hook** (`src/hooks/useLocation.ts`)
   - Integrates caching with location requests
   - Implements background updates
   - Provides backward compatibility

3. **Enhanced Location Utils** (`src/utils/location.ts`)
   - Network connectivity checking
   - Cached location retrieval
   - Offline fallback logic

## Features

### 1. Location Caching

```typescript
// Save location to cache
await LocationCache.saveLocation(location, 'gps');

// Get cached location (only if valid)
const cachedLocation = await LocationCache.getCachedLocation();

// Get last known location (regardless of age)
const lastKnown = await LocationCache.getLastKnownLocation();
```

**Cache Validity**: 5 minutes (300,000ms)
**Storage Key**: `@placemarks_location_cache`

### 2. Background Updates

When the app is active and location permission is granted:
- Updates location every 10 minutes
- Only runs when not already updating
- Respects cache validity to avoid unnecessary GPS calls

```typescript
const { startBackgroundUpdates, stopBackgroundUpdates } = useLocation({
  enableBackgroundUpdates: true
});
```

### 3. Offline Fallback

When network is unavailable:
1. Use last known cached location
2. If no cache exists, fall back to Bangkok center
3. Display appropriate error messages

```typescript
const result = await locationUtils.getLocationWithCache({
  enableOfflineFallback: true
});

// Result includes source: 'offline' | 'fallback'
```

### 4. Multiple Location Sources

The system tries location sources in this order:
1. **Cache** - Valid cached location (< 5 minutes old)
2. **GPS** - Fresh GPS location
3. **Network** - Lower accuracy network location
4. **Offline** - Last known location (any age)
5. **Fallback** - Bangkok center coordinates

## Usage

### Basic Usage

```typescript
import { useLocation } from '../hooks/useLocation';

function MyComponent() {
  const {
    location,
    loading,
    error,
    source,
    lastUpdated,
    refreshLocation,
    getCacheStatus
  } = useLocation({
    enableCaching: true,
    enableOfflineFallback: true,
    enableBackgroundUpdates: true,
    fallbackToBangkok: true,
  });

  // location: LocationCoords | null
  // source: 'cache' | 'gps' | 'network' | 'offline' | 'fallback' | null
  // lastUpdated: timestamp of last location update
}
```

### Advanced Usage

```typescript
import { locationUtils, LocationCache } from '../utils/location';

// Force refresh location
const result = await locationUtils.getLocationWithCache({
  forceRefresh: true,
  useCache: false,
  enableOfflineFallback: true,
});

// Check cache status
const status = await LocationCache.getCacheStatus();
console.log({
  hasCache: status.hasCache,
  isValid: status.isValid,
  ageMinutes: status.ageMinutes,
  source: status.source,
});

// Clear cache
await LocationCache.clearCache();
```

## Configuration Options

### useLocation Options

```typescript
interface UseLocationOptions {
  enableHighAccuracy?: boolean;        // Default: true
  fallbackToBangkok?: boolean;         // Default: true
  autoRequest?: boolean;               // Default: true
  enableBackgroundUpdates?: boolean;   // Default: true
  enableCaching?: boolean;             // Default: true
  enableOfflineFallback?: boolean;     // Default: true
}
```

### Location Cache Options

```typescript
// Cache validity duration
const CACHE_VALIDITY_DURATION = 5 * 60 * 1000; // 5 minutes

// Background update interval
const BACKGROUND_UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes
```

## Error Handling

The system provides comprehensive error handling:

```typescript
interface LocationError {
  type: LocationErrorType;
  message: string;
  userMessage: string;
  canRetry: boolean;
}

enum LocationErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  LOCATION_UNAVAILABLE = 'LOCATION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  SETTINGS_DISABLED = 'SETTINGS_DISABLED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}
```

## Performance Benefits

1. **Reduced API Calls**: 
   - Cache hits avoid GPS/network requests
   - Background updates prevent cold starts

2. **Faster Load Times**:
   - Immediate cache responses
   - Progressive enhancement with fresh data

3. **Better Offline Experience**:
   - Last known location available offline
   - Graceful degradation to Bangkok fallback

4. **Battery Optimization**:
   - Reduced GPS usage through caching
   - Intelligent background update scheduling

## Testing

Use the provided test utilities to verify functionality:

```typescript
import { runLocationTests, testCacheExpiration } from '../utils/locationTest';

// Run all tests
await runLocationTests();

// Test specific functionality
await testCacheExpiration();
```

## Migration Notes

### Backward Compatibility

The enhanced hook maintains backward compatibility:

```typescript
// Old usage still works
const { location, loading, error } = useLocation();

// New properties available
const { source, lastUpdated, refreshLocation } = useLocation();

// Computed properties for compatibility
const isLocationAvailable = !!location;
const isUsingFallback = source === 'fallback';
const retryLocation = refreshLocation;
```

### Breaking Changes

None - the implementation is fully backward compatible.

## Best Practices

1. **Enable Caching**: Always use `enableCaching: true` for better performance
2. **Handle Sources**: Check the `source` property to understand data freshness
3. **Offline Support**: Enable `enableOfflineFallback` for better UX
4. **Error Handling**: Always handle the `error` state appropriately
5. **Background Updates**: Use for screens that benefit from fresh location data

## Monitoring

Monitor cache effectiveness:

```typescript
// Check cache hit rate
const status = await LocationCache.getCacheStatus();
if (status.hasCache && status.isValid) {
  console.log('Cache hit - no API call needed');
} else {
  console.log('Cache miss - API call required');
}

// Monitor location sources
const { source } = useLocation();
console.log('Location source:', source);
// Track: cache, gps, network, offline, fallback
``` 