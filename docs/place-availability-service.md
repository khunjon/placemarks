# Place Availability Service

## Overview
Efficient service for checking if there are enough places in a geographic area to show recommendations. Uses PostGIS for fast spatial queries with configurable radius and minimum place requirements.

## Key Features
- ✅ **Fast PostGIS queries** using existing GIST spatial index
- ✅ **Configurable radius** (default: 15km, max: 100km)
- ✅ **Configurable minimum places** (default: 5 places)
- ✅ **Multiple query optimization levels** for different use cases
- ✅ **Comprehensive validation** and error handling
- ✅ **Batch processing** for multiple locations
- ✅ **Utility functions** for display and recommendations

## Database Functions

### 1. `count_places_within_radius(lat, lng, radius_meters)`
**Purpose**: Get exact count of places within radius
**Returns**: Integer count
**Use case**: When you need the exact number for statistics/display

```sql
SELECT count_places_within_radius(13.7563, 100.5018, 15000);
-- Returns: 67
```

### 2. `has_sufficient_places_for_recommendations(lat, lng, radius_meters, minimum_places)`
**Purpose**: Check if there are enough places (with exact count)
**Returns**: Boolean
**Use case**: When you need both the boolean result and exact count

```sql
SELECT has_sufficient_places_for_recommendations(13.7563, 100.5018, 15000, 5);
-- Returns: true
```

### 3. `has_minimum_places_within_radius(lat, lng, radius_meters, minimum_places)` ⚡
**Purpose**: Optimized check that stops counting once minimum is reached
**Returns**: Boolean  
**Use case**: When you only need to know if there are "enough" places (most efficient)

```sql
SELECT has_minimum_places_within_radius(13.7563, 100.5018, 15000, 5);
-- Returns: true (stops counting at 5, doesn't count all 67)
```

## TypeScript Service API

### Core Methods

#### `checkPlaceAvailability(latitude, longitude, config?)`
Main method for checking place availability with detailed results.

```typescript
const result = await placeAvailabilityService.checkPlaceAvailability(
  13.7563, 100.5018, 
  { radiusMeters: 20000, minimumPlaces: 10 }
);

console.log(result);
// {
//   hasEnoughPlaces: true,
//   placeCount: 72,
//   radiusMeters: 20000,
//   minimumPlaces: 10,
//   location: { latitude: 13.7563, longitude: 100.5018 }
// }
```

#### `getPlaceCount(latitude, longitude, radiusMeters?)`
Get exact count of places within radius.

```typescript
const result = await placeAvailabilityService.getPlaceCount(13.7563, 100.5018, 15000);
console.log(result.count); // 67
```

#### `checkMultipleLocations(locations, config?)`
Efficiently check multiple locations at once.

```typescript
const locations = [
  { latitude: 13.7563, longitude: 100.5018 }, // Bangkok
  { latitude: 18.7883, longitude: 98.9853 }   // Chiang Mai
];

const results = await placeAvailabilityService.checkMultipleLocations(locations);
// Returns array of PlaceAvailabilityResult objects
```

#### `getPlaceAvailabilityStats(latitude, longitude, radii?)`
Get statistics for different radii around a location.

```typescript
const stats = await placeAvailabilityService.getPlaceAvailabilityStats(
  13.7563, 100.5018,
  [5000, 10000, 15000, 20000, 25000]
);

console.log(stats);
// [
//   { radiusMeters: 5000, radiusKm: 5, placeCount: 9 },
//   { radiusMeters: 10000, radiusKm: 10, placeCount: 23 },
//   { radiusMeters: 15000, radiusKm: 15, placeCount: 67 },
//   ...
// ]
```

### Configuration

#### Default Configuration
```typescript
const config = placeAvailabilityService.getDefaultConfig();
// { radiusMeters: 15000, minimumPlaces: 5 }
```

#### Custom Configuration
```typescript
const customConfig = {
  radiusMeters: 25000,  // 25km radius
  minimumPlaces: 8      // Need at least 8 places
};
```

## Utility Functions

### Display Formatting
```typescript
import { placeAvailabilityUtils } from './placeAvailability';

const message = placeAvailabilityUtils.formatAvailabilityMessage(result);
// "Found 67 places within 15km - recommendations available!"

const suggestion = placeAvailabilityUtils.getRadiusRecommendation(result);
// "Try expanding search radius to 25km" (if not enough places)
```

### Area Support Check
```typescript
const isSupported = placeAvailabilityUtils.isInSupportedArea(13.7563, 100.5018);
// true (within Thailand bounds)
```

### Unit Conversion
```typescript
const km = PlaceAvailabilityService.metersToKm(15000); // 15
const meters = PlaceAvailabilityService.kmToMeters(15); // 15000
```

## Performance Characteristics

### Database Performance
- **Query time**: ~10ms for 100+ places with spatial index
- **Index usage**: Leverages existing GIST index on `coordinates` column
- **Optimization**: Early termination for boolean checks

### Service Performance
- **Single location**: ~15-25ms including network overhead
- **Multiple locations**: Parallel processing with Promise.all
- **Caching**: No caching implemented (queries are fast enough)

### Scalability
- **Places table size**: Optimized for 1000s of places
- **Concurrent requests**: Database handles multiple simultaneous queries
- **Memory usage**: Minimal - stateless service

## Usage Examples

### Basic Recommendation Check
```typescript
// Check if Bangkok has enough places for recommendations
const result = await placeAvailabilityService.checkPlaceAvailability(13.7563, 100.5018);

if (result.hasEnoughPlaces) {
  // Show recommendations
  console.log(`Found ${result.placeCount} places - showing recommendations!`);
} else {
  // Show "coming soon" message
  console.log(`Only ${result.placeCount} places found - coming soon!`);
}
```

### Custom Requirements
```typescript
// Check for fine dining (need more places)
const fineDiningCheck = await placeAvailabilityService.checkPlaceAvailability(
  13.7563, 100.5018,
  { radiusMeters: 10000, minimumPlaces: 15 }
);
```

### Area Analysis
```typescript
// Analyze place density around a location
const stats = await placeAvailabilityService.getPlaceAvailabilityStats(13.7563, 100.5018);

stats.forEach(stat => {
  console.log(`${stat.radiusKm}km: ${stat.placeCount} places`);
});
// 5km: 9 places
// 10km: 23 places  
// 15km: 67 places
// 20km: 72 places
// 25km: 75 places
```

### Multi-City Check
```typescript
const cities = [
  { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018 },
  { name: 'Chiang Mai', latitude: 18.7883, longitude: 98.9853 },
  { name: 'Phuket', latitude: 7.8804, longitude: 98.3923 }
];

const results = await placeAvailabilityService.checkMultipleLocations(
  cities.map(city => ({ latitude: city.latitude, longitude: city.longitude }))
);

cities.forEach((city, index) => {
  const result = results[index];
  console.log(`${city.name}: ${result.hasEnoughPlaces ? '✅' : '❌'} ${result.placeCount} places`);
});
// Bangkok: ✅ 67 places
// Chiang Mai: ❌ 4 places  
// Phuket: ❌ 2 places
```

## Error Handling

### Input Validation
```typescript
try {
  await placeAvailabilityService.checkPlaceAvailability(200, 200); // Invalid coords
} catch (error) {
  console.log(error.message); // "Latitude must be between -90 and 90 degrees"
}
```

### Common Errors
- **Invalid coordinates**: Lat/lng out of valid ranges
- **Invalid radius**: Negative or > 100km
- **Invalid minimum places**: Less than 1
- **Database errors**: Connection issues, function not found

### Error Recovery
```typescript
async function safeCheckAvailability(lat: number, lng: number) {
  try {
    return await placeAvailabilityService.checkPlaceAvailability(lat, lng);
  } catch (error) {
    console.warn('Place availability check failed:', error);
    // Fallback: assume no places available
    return {
      hasEnoughPlaces: false,
      placeCount: 0,
      radiusMeters: 15000,
      minimumPlaces: 5,
      location: { latitude: lat, longitude: lng }
    };
  }
}
```

## Testing

### Test Script
Run the comprehensive test suite:
```bash
node scripts/test-place-availability.js
```

### Manual Testing
```sql
-- Test in database directly
SELECT count_places_within_radius(13.7563, 100.5018, 15000);
SELECT has_minimum_places_within_radius(13.7563, 100.5018, 15000, 5);
```

### Performance Testing
```typescript
// Measure query performance
const start = Date.now();
const result = await placeAvailabilityService.checkPlaceAvailability(13.7563, 100.5018);
const duration = Date.now() - start;
console.log(`Query took ${duration}ms`);
```

## Integration

### With Recommendations Service
```typescript
import { placeAvailabilityService } from '../services/placeAvailability';

async function getRecommendations(userLocation: Location) {
  // Check if area has enough places
  const availability = await placeAvailabilityService.checkPlaceAvailability(
    userLocation.latitude,
    userLocation.longitude
  );
  
  if (!availability.hasEnoughPlaces) {
    return {
      type: 'coming_soon',
      message: placeAvailabilityUtils.formatAvailabilityMessage(availability),
      suggestion: placeAvailabilityUtils.getRadiusRecommendation(availability)
    };
  }
  
  // Proceed with recommendations
  return await getPlaceRecommendations(userLocation);
}
```

### With UI Components
```typescript
// In a React component
const [availability, setAvailability] = useState<PlaceAvailabilityResult | null>(null);

useEffect(() => {
  if (userLocation) {
    placeAvailabilityService
      .checkPlaceAvailability(userLocation.latitude, userLocation.longitude)
      .then(setAvailability)
      .catch(console.error);
  }
}, [userLocation]);

if (!availability?.hasEnoughPlaces) {
  return (
    <ComingSoonMessage 
      message={placeAvailabilityUtils.formatAvailabilityMessage(availability)}
      suggestion={placeAvailabilityUtils.getRadiusRecommendation(availability)}
    />
  );
}
```

## Future Enhancements

### Potential Improvements
1. **Caching**: Add Redis/memory cache for frequently checked locations
2. **Place quality filtering**: Consider ratings/reviews in availability check
3. **Category-specific checks**: Different minimums for different place types
4. **Predictive availability**: ML-based predictions for new areas
5. **Real-time updates**: WebSocket notifications when new places are added

### Monitoring
1. **Query performance tracking**: Log slow queries
2. **Usage analytics**: Track most checked locations
3. **Availability trends**: Monitor how availability changes over time

## Conclusion

The Place Availability Service provides a fast, efficient way to determine if a geographic area has sufficient places for recommendations. Key benefits:

- ⚡ **Fast queries** (~10ms) using PostGIS spatial indexing
- 🎯 **Configurable parameters** for different use cases  
- 📊 **Comprehensive statistics** and analysis capabilities
- 🛡️ **Robust error handling** and validation
- 🔧 **Easy integration** with existing services
- 📈 **Scalable architecture** for growing place databases

Perfect for determining whether to show recommendations or "coming soon" messages based on place density in any geographic area. 