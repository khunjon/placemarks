# CityContext System Documentation

## Overview

The CityContext system is a scalable, multi-city place categorization framework that replaces the Bangkok-specific context system. It enables the app to support multiple cities with their unique characteristics while maintaining consistent data structures and APIs.

## Architecture

### Core Components

1. **CityContext Interface** - Dynamic context structure for any city
2. **City Configuration System** - Declarative city-specific rules and metadata
3. **CityCategorizer Service** - City-agnostic place categorization logic
4. **Legacy Compatibility Layer** - Backward compatibility with BangkokContext

## CityContext Interface

The `CityContext` interface provides a flexible structure for storing city-specific place metadata:

```typescript
interface CityContext {
  city_code: string; // 'BKK', 'TYO', 'NYC', 'LON', etc.
  environment: 'indoor' | 'outdoor' | 'mixed';
  location_type: string; // City-specific location types
  noise_level: 'quiet' | 'moderate' | 'loud';
  air_conditioning?: boolean;
  transport_proximity?: {
    system: string; // 'BTS', 'MRT', 'JR', 'Subway', etc.
    distance: 'walking' | 'near' | 'far' | 'none';
    stations?: string[];
  };
  price_context: {
    tier: string; // City-specific price tier
    local_scale: string[]; // Ordered array of price descriptors
  };
  local_characteristics: Record<string, any>; // Flexible metadata
  crowd_level?: 'empty' | 'few' | 'moderate' | 'busy' | 'packed';
  wifi_available?: boolean;
  parking_available?: boolean;
}
```

### Key Benefits

- **Flexible**: Adapts to any city's unique characteristics
- **Extensible**: Local characteristics can store city-specific data
- **Type-Safe**: Full TypeScript support with proper validation
- **Consistent**: Common fields across all cities for core functionality

## City Configuration System

Cities are configured declaratively using the `CityConfig` interface. Each city defines its own rules, types, and categorization logic.

### Directory Structure

```
src/config/cities/
├── types.ts          # Configuration interfaces
├── bangkok.ts        # Bangkok city configuration
├── index.ts          # City registry and utilities
└── [future cities]   # tokyo.ts, newyork.ts, etc.
```

### Configuration Format

```typescript
interface CityConfig {
  code: string;                    // Unique city identifier
  name: string;                    // Display name
  country: string;                 // Country name
  timezone: string;                // IANA timezone
  coordinates: [number, number];   // City center [lng, lat]
  
  transport_systems: {             // Local transport networks
    [key: string]: {
      name: string;
      type: 'rail' | 'subway' | 'bus' | 'tram';
      stations?: string[];
    };
  };
  
  location_types: string[];        // City-specific location types
  price_scale: string[];           // Ordered price tiers
  
  categorization_rules: {          // Place analysis rules
    environment: {
      outdoor_types: string[];
      indoor_types: string[];
      mixed_types: string[];
    };
    location_type_mapping: {
      [googleType: string]: string;
    };
    price_tier_mapping: {
      [googlePriceLevel: number]: string;
    };
    noise_level_rules: {
      [locationType: string]: 'quiet' | 'moderate' | 'loud';
    };
  };
  
  characteristic_defaults: Record<string, any>;
}
```

### Bangkok Configuration Example

```typescript
export const bangkokConfig: CityConfig = {
  code: 'BKK',
  name: 'Bangkok',
  country: 'Thailand',
  timezone: 'Asia/Bangkok',
  coordinates: [100.5018, 13.7563],
  
  transport_systems: {
    BTS: {
      name: 'BTS Skytrain',
      type: 'rail',
      stations: ['Siam', 'Asok', 'Thong Lo', /* ... */]
    },
    MRT: {
      name: 'MRT Subway',
      type: 'subway',
      stations: ['Silom', 'Sukhumvit', /* ... */]
    }
  },
  
  location_types: [
    'mall', 'street', 'building', 'market', 'rooftop', 'riverside'
  ],
  
  price_scale: ['street', 'casual', 'mid', 'upscale', 'luxury'],
  
  categorization_rules: {
    environment: {
      outdoor_types: ['park', 'tourist_attraction'],
      indoor_types: ['restaurant', 'cafe', 'shopping_mall'],
      mixed_types: ['hotel', 'university']
    },
    location_type_mapping: {
      'shopping_mall': 'mall',
      'night_market': 'market',
      'rooftop_bar': 'rooftop'
    },
    price_tier_mapping: {
      1: 'street',
      2: 'casual',
      3: 'mid',
      4: 'upscale'
    },
    noise_level_rules: {
      'mall': 'moderate',
      'market': 'loud',
      'rooftop': 'quiet'
    }
  }
};
```

## CityCategorizer Service

The `CityCategorizer` provides city-agnostic place categorization logic:

### Key Methods

```typescript
class CityCategorizer {
  // Main categorization method
  async categorizePlace(place: any, cityCode?: string): Promise<CityContext>
  
  // Legacy compatibility method
  async categorizeBangkokPlace(place: any): Promise<BangkokContext>
}
```

### Usage Example

```typescript
import { cityCategorizer } from '../services/cityCategorizer';

// Categorize a place for Bangkok
const context = await cityCategorizer.categorizePlace(place, 'BKK');

// Auto-detect city (defaults to Bangkok)
const context = await cityCategorizer.categorizePlace(place);
```

## Adding New Cities

To add support for a new city:

### 1. Create City Configuration

Create a new file `src/config/cities/tokyo.ts`:

```typescript
import { CityConfig } from './types';

export const tokyoConfig: CityConfig = {
  code: 'TYO',
  name: 'Tokyo',
  country: 'Japan',
  timezone: 'Asia/Tokyo',
  coordinates: [139.6917, 35.6895],
  
  transport_systems: {
    JR: {
      name: 'JR East',
      type: 'rail',
      stations: ['Shinjuku', 'Shibuya', 'Tokyo', /* ... */]
    }
  },
  
  location_types: [
    'department_store', 'alley', 'tower', 'basement', 'shrine'
  ],
  
  price_scale: ['street', 'casual', 'mid', 'high_end', 'luxury'],
  
  categorization_rules: {
    // Tokyo-specific rules
  }
};
```

### 2. Register the City

Update `src/config/cities/index.ts`:

```typescript
import { tokyoConfig } from './tokyo';

export const cityConfigs: Record<string, CityConfig> = {
  BKK: bangkokConfig,
  TYO: tokyoConfig, // Add new city
};
```

### 3. Use the New City

```typescript
// Categorize places for Tokyo
const context = await cityCategorizer.categorizePlace(place, 'TYO');
```

## Migration from BangkokContext

### Legacy Support

The system maintains backward compatibility with existing `BangkokContext` usage:

- `Place` entities have both `city_context` and `bangkok_context` fields
- Legacy `categorizeBangkokPlace()` method still works
- Existing components gracefully handle both context types

### Migration Steps

1. **Update place categorization calls:**
   ```typescript
   // Old
   const context = await placesService.categorizeBangkokPlace(place);
   
   // New
   const context = await placesService.categorizePlace(place, 'BKK');
   ```

2. **Update context usage:**
   ```typescript
   // Old
   const priceInfo = place.bangkok_context.price_tier;
   const transport = place.bangkok_context.bts_proximity;
   
   // New
   const priceInfo = place.city_context.price_context.tier;
   const transport = place.city_context.transport_proximity?.distance;
   ```

3. **Handle both context types:**
   ```typescript
   const context = place.city_context || place.bangkok_context;
   const price = place.city_context?.price_context?.tier || 
                 place.bangkok_context?.price_tier;
   ```

## Database Schema

### Current Schema

Places are stored with a `bangkok_context` JSONB field in the database:

```sql
CREATE TABLE places (
  -- ... other fields
  bangkok_context JSONB DEFAULT '{}'
);
```

### Future Migration

To fully migrate to the new system:

1. Add `city_context` field:
   ```sql
   ALTER TABLE places ADD COLUMN city_context JSONB DEFAULT '{}';
   ```

2. Migrate existing data:
   ```sql
   UPDATE places SET city_context = jsonb_build_object(
     'city_code', 'BKK',
     'environment', bangkok_context->>'environment',
     'location_type', bangkok_context->>'location_type',
     -- ... other field mappings
   ) WHERE bangkok_context IS NOT NULL;
   ```

3. Eventually remove `bangkok_context` field after full migration

## Best Practices

### 1. City Detection

Implement city detection logic based on:
- User location
- Place coordinates
- User preferences
- Manual selection

### 2. Caching

Cache city configurations and categorization results:
- City configs are static and can be cached indefinitely
- Place contexts can be cached with reasonable TTL
- Use city code as cache key prefix

### 3. Validation

Validate city codes and configurations:
```typescript
if (!isCitySupported(cityCode)) {
  throw new Error(`Unsupported city: ${cityCode}`);
}
```

### 4. Error Handling

Gracefully handle missing or invalid city data:
```typescript
const cityConfig = getCityConfig(cityCode) || getDefaultCity();
```

### 5. Testing

Test with multiple cities:
```typescript
describe('CityCategorizer', () => {
  it('categorizes Bangkok places correctly', async () => {
    const context = await categorizer.categorizePlace(bangkokPlace, 'BKK');
    expect(context.city_code).toBe('BKK');
  });
  
  it('categorizes Tokyo places correctly', async () => {
    const context = await categorizer.categorizePlace(tokyoPlace, 'TYO');
    expect(context.city_code).toBe('TYO');
  });
});
```

## API Reference

### City Registry Functions

```typescript
// Get city configuration
getCityConfig(cityCode: string): CityConfig | null

// Check if city is supported
isCitySupported(cityCode: string): boolean

// Get all supported cities
getSupportedCities(): string[]

// Get default city (Bangkok)
getDefaultCity(): CityConfig
```

### CityCategorizer Methods

```typescript
// Categorize place for any city
categorizePlace(place: any, cityCode?: string): Promise<CityContext>

// Legacy Bangkok categorization
categorizeBangkokPlace(place: any): Promise<BangkokContext>
```

### Type Guards

```typescript
// Check if context is CityContext
function isCityContext(context: any): context is CityContext {
  return context && typeof context.city_code === 'string';
}

// Check if context is BangkokContext
function isBangkokContext(context: any): context is BangkokContext {
  return context && typeof context.bts_proximity === 'string';
}
```

## Performance Considerations

### 1. Lazy Loading

Load city configurations on demand:
```typescript
const cityConfig = await import(`./cities/${cityCode}`);
```

### 2. Memoization

Cache categorization results:
```typescript
const memoizedCategorize = memoize(categorizePlace, {
  keyGenerator: (place, cityCode) => `${place.id}-${cityCode}`
});
```

### 3. Batch Processing

Process multiple places efficiently:
```typescript
async categorizePlaces(places: Place[], cityCode: string): Promise<CityContext[]> {
  const cityConfig = getCityConfig(cityCode);
  return Promise.all(places.map(place => 
    this.categorizePlace(place, cityCode)
  ));
}
```

This system provides a solid foundation for multi-city expansion while maintaining performance and developer experience.