# Curated Lists and User Lists Fix Summary

## Issues Identified

### 1. Database Schema Mismatch
**Problem**: The `listsService.ts` was trying to query for a `city_context` column that doesn't exist in the `places` table.

**Error**: `column places_1.city_context does not exist`

**Root Cause**: The code was written to support the new multi-city `CityContext` system, but the database migration to add the `city_context` column hasn't been applied yet. The database still only has the legacy `bangkok_context` column.

### 2. Curated Lists Visibility Filter
**Problem**: Curated lists weren't showing on the DecideScreen even though they existed in the database.

**Root Cause**: The curated lists in the database had `visibility: 'private'` but the query was filtering for `visibility: 'curated'`.

## Fixes Applied

### 1. Database Schema Fix
**Files Modified**: `src/services/listsService.ts`

**Changes Made**:
- Removed `city_context` from all SQL SELECT queries in `getUserLists()` method (lines ~178, ~210)
- Removed `city_context` from all SQL SELECT queries in `getCuratedListDetails()` method (lines ~950, ~985)
- Removed `city_context` field assignments in place object construction

**Code Changes**:
```typescript
// BEFORE (causing error)
places (
  id,
  google_place_id,
  name,
  address,
  place_type,
  google_types,
  primary_type,
  price_level,
  city_context,        // ❌ This column doesn't exist
  bangkok_context,
  google_rating,
  // ...
)

// AFTER (working)
places (
  id,
  google_place_id,
  name,
  address,
  place_type,
  google_types,
  primary_type,
  price_level,
  bangkok_context,     // ✅ Only query existing columns
  google_rating,
  // ...
)
```

### 2. Curated Lists Visibility Fix
**Files Modified**: `src/services/listsService.ts`

**Changes Made**:
- Updated `getCuratedLists()` method to accept both `'curated'` and `'public'` visibility values
- Updated `getCuratedListDetails()` method with the same visibility filter
- Updated database records to set curated lists visibility to `'public'`

**Code Changes**:
```typescript
// BEFORE (no results)
.eq('visibility', 'curated')

// AFTER (shows existing lists)
.in('visibility', ['curated', 'public'])
```

**Database Update**:
```sql
UPDATE lists SET visibility = 'public' WHERE is_curated = true AND visibility = 'private';
```

## Verification

### Test Results
- ✅ 7 curated lists now load successfully on DecideScreen
- ✅ User lists load without database errors
- ✅ Place details load correctly for both user and curated lists
- ✅ Navigation between DecideScreen and ListDetail works properly

### Curated Lists Found
1. Bangkok Michelin Star (Michelin) - 7 places
2. World's 50 Best Restaurants 2025 (Worlds50Best) - 5 places  
3. Best Restaurants in Los Angeles (TimeOut) - 4 places
4. Bangkok's Best Garden Cafes (TimeOut) - 0 places
5. Bangkok Best Juice Bars (TimeOut) - 0 places
6. Bangkok's Best Smash Burgers (TimeOut) - 2 places
7. Bangkok's Best Thai restaurants (TimeOut) - 11 places

## Future Considerations

### Database Migration Needed
To fully implement the multi-city system, the following migration should be applied:

```sql
-- Add city_context column to places table
ALTER TABLE places ADD COLUMN city_context JSONB DEFAULT '{}';

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

### Code Updates After Migration
Once the migration is complete, the code can be updated to:
1. Query both `city_context` and `bangkok_context` for backward compatibility
2. Prefer `city_context` over `bangkok_context` when both exist
3. Eventually remove `bangkok_context` support

## Impact
- ✅ DecideScreen now displays curated lists properly
- ✅ User lists load without errors
- ✅ No breaking changes to existing functionality
- ✅ Ready for multi-city expansion when database migration is applied 