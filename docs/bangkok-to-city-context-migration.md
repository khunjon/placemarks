# BangkokContext to CityContext Migration Guide

## Overview

This guide helps developers migrate from the legacy `BangkokContext` system to the new scalable `CityContext` system. The migration maintains backward compatibility while preparing the codebase for multi-city support.

## What Changed

### Before: BangkokContext
```typescript
interface BangkokContext {
  environment: 'indoor' | 'outdoor' | 'mixed';
  location_type: 'mall' | 'street' | 'building' | 'market' | 'rooftop' | 'riverside';
  bts_proximity: 'walking' | 'near' | 'far' | 'none';
  air_conditioning: boolean;
  noise_level: 'quiet' | 'moderate' | 'loud';
  price_tier: 'street' | 'casual' | 'mid' | 'upscale' | 'luxury';
  crowd_level?: 'empty' | 'few' | 'moderate' | 'busy' | 'packed';
  wifi_available?: boolean;
  parking_available?: boolean;
}
```

### After: CityContext
```typescript
interface CityContext {
  city_code: string; // 'BKK', 'TYO', 'NYC', etc.
  environment: 'indoor' | 'outdoor' | 'mixed';
  location_type: string; // City-specific types
  noise_level: 'quiet' | 'moderate' | 'loud';
  air_conditioning?: boolean;
  transport_proximity?: {
    system: string; // 'BTS', 'MRT', 'JR', etc.
    distance: 'walking' | 'near' | 'far' | 'none';
    stations?: string[];
  };
  price_context: {
    tier: string; // City-specific tier
    local_scale: string[]; // All tiers for this city
  };
  local_characteristics: Record<string, any>;
  crowd_level?: 'empty' | 'few' | 'moderate' | 'busy' | 'packed';
  wifi_available?: boolean;
  parking_available?: boolean;
}
```

## Migration Steps

### 1. Update Service Calls

#### Place Categorization
```typescript
// OLD: Bangkok-specific categorization
const context = await placesService.categorizeBangkokPlace(place);

// NEW: Multi-city categorization
const context = await placesService.categorizePlace(place, 'BKK');
// or let it default to Bangkok
const context = await placesService.categorizePlace(place);
```

### 2. Update Context Access Patterns

#### Reading Transport Information
```typescript
// OLD: Bangkok-specific BTS access
const transport = place.bangkok_context.bts_proximity;

// NEW: Generic transport access
const transport = place.city_context?.transport_proximity?.distance;

// SAFE: Handle both old and new
const transport = place.city_context?.transport_proximity?.distance || 
                  place.bangkok_context?.bts_proximity;
```

#### Reading Price Information
```typescript
// OLD: Direct price tier
const price = place.bangkok_context.price_tier;

// NEW: Structured price context
const price = place.city_context?.price_context.tier;

// SAFE: Handle both old and new
const price = place.city_context?.price_context.tier || 
              place.bangkok_context?.price_tier;
```

### 3. Update Component Logic

#### Safe Context Handling
```typescript
// Create a helper function for safe context access
function getPlaceContext(place: Place) {
  if (place.city_context) {
    return {
      environment: place.city_context.environment,
      transport: place.city_context.transport_proximity?.distance || 'N/A',
      price: place.city_context.price_context.tier,
      aircon: place.city_context.air_conditioning,
      noise: place.city_context.noise_level,
      city: place.city_context.city_code
    };
  } else if (place.bangkok_context) {
    return {
      environment: place.bangkok_context.environment,
      transport: place.bangkok_context.bts_proximity,
      price: place.bangkok_context.price_tier,
      aircon: place.bangkok_context.air_conditioning,
      noise: place.bangkok_context.noise_level,
      city: 'BKK'
    };
  }
  return null;
}

// Usage in components
const PlaceCard = ({ place }: { place: Place }) => {
  const context = getPlaceContext(place);
  
  return (
    <View>
      <Text>{place.name}</Text>
      {context && (
        <>
          <Text>City: {context.city}</Text>
          <Text>Environment: {context.environment}</Text>
          <Text>Transport: {context.transport}</Text>
          <Text>Price: {context.price}</Text>
        </>
      )}
    </View>
  );
};
```

### 4. Update Database Queries

#### Include Both Context Fields
```typescript
// Update Supabase queries to select both fields
const { data, error } = await supabase
  .from('places')
  .select(`
    *,
    city_context,
    bangkok_context
  `);
```

#### Handle Missing Context Data
```typescript
// Ensure places have context data
function ensurePlaceContext(place: Place): Place {
  if (!place.city_context && !place.bangkok_context) {
    // Generate context for places missing it
    return {
      ...place,
      city_context: {
        city_code: 'BKK',
        environment: 'indoor',
        location_type: 'building',
        noise_level: 'moderate',
        price_context: {
          tier: 'casual',
          local_scale: ['street', 'casual', 'mid', 'upscale', 'luxury']
        },
        local_characteristics: {}
      }
    };
  }
  return place;
}
```

## Backward Compatibility

### Current Support

The system maintains full backward compatibility:

1. **Place Entity**: Has both `city_context` and `bangkok_context` fields
2. **Legacy Methods**: `categorizeBangkokPlace()` still works
3. **Type Exports**: `BangkokContext` still exported (marked as deprecated)
4. **Database Schema**: `bangkok_context` field still exists

### Gradual Migration

You can migrate incrementally:

1. **Phase 1**: Start using new CityContext alongside BangkokContext
2. **Phase 2**: Update components to prefer CityContext but fallback to BangkokContext
3. **Phase 3**: Remove BangkokContext usage from new code
4. **Phase 4**: Eventually deprecate BangkokContext entirely

## Testing Migration

### Unit Tests

```typescript
describe('Place Context Migration', () => {
  it('handles places with only city_context', () => {
    const place: Place = {
      id: 'test',
      city_context: {
        city_code: 'BKK',
        environment: 'indoor',
        price_context: { tier: 'mid', local_scale: [] },
        // ...
      }
    };
    
    const context = getPlaceContext(place);
    expect(context.city).toBe('BKK');
    expect(context.price).toBe('mid');
  });
  
  it('handles places with only bangkok_context', () => {
    const place: Place = {
      id: 'test',
      bangkok_context: {
        environment: 'outdoor',
        price_tier: 'upscale',
        bts_proximity: 'walking',
        // ...
      }
    };
    
    const context = getPlaceContext(place);
    expect(context.city).toBe('BKK');
    expect(context.price).toBe('upscale');
    expect(context.transport).toBe('walking');
  });
  
  it('prefers city_context over bangkok_context', () => {
    const place: Place = {
      id: 'test',
      city_context: {
        city_code: 'BKK',
        price_context: { tier: 'luxury', local_scale: [] },
        // ...
      },
      bangkok_context: {
        price_tier: 'casual',
        // ...
      }
    };
    
    const context = getPlaceContext(place);
    expect(context.price).toBe('luxury'); // Should use city_context
  });
});
```

### Integration Tests

```typescript
describe('Places Service Migration', () => {
  it('generates both context types for new places', async () => {
    const googlePlace = { /* ... */ };
    const place = await placesService.convertGoogleResultToPlace(googlePlace);
    
    expect(place.city_context).toBeDefined();
    expect(place.city_context.city_code).toBe('BKK');
    expect(place.bangkok_context).toBeDefined(); // Legacy compatibility
  });
  
  it('categorizes places with city-specific logic', async () => {
    const place = { /* Bangkok place data */ };
    const context = await placesService.categorizePlace(place, 'BKK');
    
    expect(context.city_code).toBe('BKK');
    expect(context.transport_proximity.system).toBe('BTS Skytrain');
  });
});
```

## Common Pitfalls

### 1. Assuming Context Exists

```typescript
// BAD: Assumes context exists
const price = place.city_context.price_context.tier;

// GOOD: Handle missing context
const price = place.city_context?.price_context?.tier || 'Unknown';
```

### 2. Direct Property Access

```typescript
// BAD: Direct access to nested properties
const transport = place.city_context.transport_proximity.distance;

// GOOD: Use optional chaining
const transport = place.city_context?.transport_proximity?.distance;
```

### 3. Type Confusion

```typescript
// BAD: Mixing context types
function displayContext(context: BangkokContext | CityContext) {
  return context.price_tier; // Error: doesn't exist on CityContext
}

// GOOD: Use type guards
function displayContext(context: BangkokContext | CityContext) {
  if ('city_code' in context) {
    return context.price_context.tier; // CityContext
  } else {
    return context.price_tier; // BangkokContext
  }
}
```

## Database Migration Plan

### Phase 1: Add New Column (Current)
```sql
-- Already exists in development
-- bangkok_context JSONB DEFAULT '{}'
```

### Phase 2: Add CityContext Column (Future)
```sql
ALTER TABLE places ADD COLUMN city_context JSONB DEFAULT '{}';
```

### Phase 3: Data Migration (Future)
```sql
-- Migrate existing bangkok_context to city_context format
UPDATE places 
SET city_context = jsonb_build_object(
  'city_code', 'BKK',
  'environment', bangkok_context->>'environment',
  'location_type', bangkok_context->>'location_type',
  'noise_level', bangkok_context->>'noise_level',
  'air_conditioning', (bangkok_context->>'air_conditioning')::boolean,
  'transport_proximity', jsonb_build_object(
    'system', 'BTS Skytrain',
    'distance', bangkok_context->>'bts_proximity'
  ),
  'price_context', jsonb_build_object(
    'tier', bangkok_context->>'price_tier',
    'local_scale', '["street", "casual", "mid", "upscale", "luxury"]'::jsonb
  ),
  'local_characteristics', '{}'::jsonb,
  'crowd_level', bangkok_context->>'crowd_level',
  'wifi_available', (bangkok_context->>'wifi_available')::boolean,
  'parking_available', (bangkok_context->>'parking_available')::boolean
)
WHERE bangkok_context IS NOT NULL 
  AND bangkok_context != '{}'::jsonb;
```

### Phase 4: Deprecate Old Column (Future)
```sql
-- Eventually, after full migration
-- ALTER TABLE places DROP COLUMN bangkok_context;
```

## Benefits of Migration

### 1. Multi-City Support
- Ready for Bangkok, Tokyo, New York, London, etc.
- City-specific transport systems and price scales
- Flexible location types per city

### 2. Better Type Safety
- Structured price context instead of flat strings
- Explicit city identification
- Extensible local characteristics

### 3. Improved Maintainability
- Configuration-driven city support
- No code changes needed for new cities
- Clear separation of concerns

### 4. Future-Proof Architecture
- Scalable to any number of cities
- Supports different transport systems
- Accommodates varied cultural contexts

## Support and Resources

- **Documentation**: See `docs/city-context-system.md`
- **Type Definitions**: `src/types/entities/index.ts`
- **Configuration Examples**: `src/config/cities/bangkok.ts`
- **Service Implementation**: `src/services/cityCategorizer.ts`

## Questions and Troubleshooting

### Q: My existing code broke after the migration. What should I do?
A: The migration maintains backward compatibility. If something broke, you're likely using a newer pattern incorrectly. Use the safe access patterns shown above.

### Q: How do I add support for a new city?
A: See the "Adding New Cities" section in `docs/city-context-system.md`.

### Q: When will BangkokContext be removed?
A: BangkokContext will remain for backward compatibility until all code is migrated. It's marked as deprecated but will continue to work.

### Q: Do I need to update my database schema immediately?
A: No, the current schema supports both systems. The database migration is planned for a future phase.

### Q: How do I test my migration?
A: Use the test patterns shown above. Ensure your code handles both context types gracefully.