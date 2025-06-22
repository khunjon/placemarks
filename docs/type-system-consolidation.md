# Type System Consolidation

## Overview

The Placemarks app type system has been consolidated to create a single source of truth for all entity types. This eliminates duplicate type definitions and ensures consistency across the entire codebase.

## Key Changes

### 1. New Consolidated Entity Types

Created `src/types/entities/index.ts` as the single source of truth for all core entity types:

- **BaseEntity**: Common interface that all entities extend with `id`, `created_at`, and `updated_at`
- **User**: User profiles and authentication data
- **Place**: Location data with coordinates and city context
- **CheckIn**: User check-ins at places with rich context
- **List**: User-created lists of places
- **ListPlace**: Junction table for list-place relationships
- **UserPlaceRating**: User ratings for places (thumbs up/down system)
- **RecommendationRequest**: AI recommendation tracking

### 2. Context Interfaces

Consolidated context interfaces:
- **CityContext**: Multi-city place context system (replaces BangkokContext)
- **BangkokContext**: Legacy Bangkok-specific context (deprecated)
- **CheckInContext**: Check-in specific context
- **WeatherContext**: Weather conditions during check-ins

### 3. Type Aliases

Centralized type aliases for better type safety:
- **ThumbsRating**: 'thumbs_down' | 'neutral' | 'thumbs_up'
- **AuthProvider**: Authentication provider types
- **CompanionType**: Who the user was with during check-in
- **MealType**: Type of meal/dining experience
- **TransportationMethod**: How the user got to the place
- **PrivacyLevel**: List privacy settings

### 4. Create/Update Types

Proper create and update types for each entity:
- **CheckInCreate/CheckInUpdate**
- **UserUpdate** (alias: ProfileUpdate for backwards compatibility)
- **ListCreate/ListUpdate**

## Migration Details

### Updated Import Statements

All imports have been updated from:
```typescript
// Old
import { User, Place } from '../types/database';
import { CheckIn } from '../types/checkins';
import { PlaceSuggestion } from '../types/places';

// New
import { User, Place, CheckIn, PlaceSuggestion } from '../types';
```

### Legacy Type Files

The old type files have been updated for backwards compatibility:

- **database.ts**: Now re-exports from entities and keeps legacy Bangkok-specific types
- **user.ts**: Simplified to only auth-specific types
- **checkins.ts**: Re-exports from entities, keeps Bangkok tags constants
- **places.ts**: Simplified to non-entity place types

### Main Types Index

Updated `src/types/index.ts` to export from the consolidated entities file as the primary source.

## Schema Alignment

All entity types now match the Supabase database schema exactly:

- **users** table → User interface
- **places** table → Place interface  
- **check_ins** table → CheckIn interface
- **lists** table → List interface
- **list_places** table → ListPlace interface
- **user_place_ratings** table → UserPlaceRating interface
- **recommendation_requests** table → RecommendationRequest interface

## Benefits

1. **Single Source of Truth**: All entity types defined in one place
2. **Type Safety**: Consistent types that match database schema exactly
3. **Maintainability**: Easier to update types when schema changes
4. **Backwards Compatibility**: Existing code continues to work during migration
5. **Better IDE Support**: Improved autocomplete and type checking

## Usage Guidelines

### For New Code
Always import from the main types index:
```typescript
import { User, Place, CheckIn, List } from '../types';
```

### For Entity Operations
Use the proper create/update types:
```typescript
import { CheckInCreate, UserUpdate } from '../types';

const newCheckIn: CheckInCreate = {
  place_id: 'uuid',
  context: { /* ... */ },
  // ...
};
```

### For Database Operations
The consolidated types work seamlessly with Supabase:
```typescript
const { data, error } = await supabase
  .from('places')
  .select('*')
  .returns<Place[]>();
```

## Next Steps

1. Continue monitoring for any remaining type inconsistencies
2. Update any remaining legacy imports as they're discovered
3. Consider adding more specific validation types for form inputs
4. Add JSDoc comments to entity interfaces for better documentation 