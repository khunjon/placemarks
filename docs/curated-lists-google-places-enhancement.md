# Curated Lists Google Places Data Enhancement

## Problem Statement

Curated list places in the mobile app are not displaying complete information in the "Quick Info" section because they're missing essential Google Places data (phone, website, hours, ratings) in the database. This happens because the web admin project that manages curated lists doesn't properly enhance place data when adding places to curated lists.

## Root Cause

When places are added to curated lists through the web admin interface, they are stored in the database with minimal information:
- `phone`: `null`
- `website`: `null` 
- `hours_open`: `{}` (empty object)
- `google_rating`: `null`

The mobile app expects these fields to be populated to display the "Quick Info" section properly.

## Required Solution

The web admin project needs to implement a Google Places data enhancement process that:

1. **Fetches complete place details** from Google Places API when adding places to curated lists
2. **Stores enhanced data** in both the `places` table and `google_places_cache` table
3. **Ensures data consistency** between the cache and main tables
4. **Handles missing data gracefully** for places where Google doesn't have complete information

## Implementation Requirements

### 1. Google Places API Integration

The web admin needs to integrate with Google Places API to fetch detailed place information:

```javascript
// Required fields to fetch from Google Places API
const requiredFields = [
  'place_id',
  'name', 
  'formatted_address',
  'geometry',
  'rating',
  'user_ratings_total',
  'price_level',
  'types',
  'business_status',
  'formatted_phone_number',
  'website',
  'opening_hours',
  'photos'
];
```

### 2. Database Schema Requirements

Ensure the web admin can write to these tables:

**`places` table:**
- `google_place_id` (TEXT, unique)
- `name` (TEXT)
- `address` (TEXT)
- `coordinates` (GEOMETRY POINT)
- `phone` (TEXT, nullable)
- `website` (TEXT, nullable)
- `google_rating` (TEXT, nullable) 
- `price_level` (INTEGER, nullable)
- `hours_open` (JSONB, nullable)
- `photo_references` (JSONB, nullable)
- `google_types` (TEXT[], nullable)

**`google_places_cache` table:**
- `google_place_id` (TEXT, primary key)
- `name` (TEXT)
- `formatted_address` (TEXT)
- `geometry` (JSONB)
- `rating` (NUMERIC(3,2))
- `user_ratings_total` (INTEGER)
- `price_level` (INTEGER)
- `types` (TEXT[])
- `business_status` (TEXT)
- `formatted_phone_number` (TEXT)
- `website` (TEXT)
- `opening_hours` (JSONB)
- `photos` (TEXT[])

### 3. Place Enhancement Process

When adding a place to a curated list, implement this process:

#### Step 1: Check if place exists
```sql
SELECT id, google_place_id, phone, website, google_rating, hours_open 
FROM places 
WHERE google_place_id = $1;
```

#### Step 2: Determine if enhancement is needed
A place needs enhancement if ANY of these conditions are true:
- `phone` is null
- `website` is null  
- `google_rating` is null
- `hours_open` is null or empty object `{}`
- `photo_references` is null or empty array

#### Step 3: Fetch Google Places details
If enhancement is needed, fetch complete place details from Google Places API:

```javascript
const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=${requiredFields.join(',')}&key=${apiKey}`;
```

#### Step 4: Update places table
```sql
UPDATE places SET
  phone = COALESCE($2, phone),
  website = COALESCE($3, website), 
  google_rating = COALESCE($4, google_rating),
  price_level = COALESCE($5, price_level),
  hours_open = COALESCE($6, hours_open),
  photo_references = COALESCE($7, photo_references),
  google_types = COALESCE($8, google_types)
WHERE google_place_id = $1;
```

#### Step 5: Update/Insert google_places_cache
```sql
INSERT INTO google_places_cache (
  google_place_id, name, formatted_address, geometry, rating, 
  user_ratings_total, price_level, types, business_status,
  formatted_phone_number, website, opening_hours, photos
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
ON CONFLICT (google_place_id) 
DO UPDATE SET
  formatted_phone_number = COALESCE(EXCLUDED.formatted_phone_number, google_places_cache.formatted_phone_number),
  website = COALESCE(EXCLUDED.website, google_places_cache.website),
  opening_hours = COALESCE(EXCLUDED.opening_hours, google_places_cache.opening_hours),
  rating = COALESCE(EXCLUDED.rating, google_places_cache.rating),
  updated_at = NOW();
```

### 4. Error Handling

Handle these scenarios gracefully:

1. **Google Places API rate limits**: Implement exponential backoff
2. **Missing place data**: Some places legitimately don't have phone/website/hours
3. **API failures**: Store partial data and mark for retry
4. **Invalid place IDs**: Validate place IDs before attempting to fetch details

### 5. Data Validation

Before storing data, validate:

```javascript
// Phone number validation
const isValidPhone = (phone) => phone && phone.length > 5 && phone.match(/[\d\s\-\+\(\)]/);

// Website validation  
const isValidWebsite = (website) => website && (website.startsWith('http') || website.startsWith('www'));

// Hours validation
const isValidHours = (hours) => hours && typeof hours === 'object' && Object.keys(hours).length > 0;
```

### 6. Logging and Monitoring

Implement comprehensive logging:

```javascript
console.log('🔍 CURATED LIST: Enhancing place data', {
  googlePlaceId: place.google_place_id,
  placeName: place.name,
  listName: curatedList.name,
  enhancementNeeded: {
    phone: !place.phone,
    website: !place.website, 
    rating: !place.google_rating,
    hours: !place.hours_open || Object.keys(place.hours_open).length === 0
  }
});

console.log('✅ CURATED LIST: Place enhancement completed', {
  googlePlaceId: place.google_place_id,
  dataAdded: {
    phone: !!enhancedData.phone,
    website: !!enhancedData.website,
    rating: !!enhancedData.rating,
    hours: !!enhancedData.hours
  }
});
```

## Testing Requirements

### 1. Test Cases

Create tests for:
- Adding a new place with complete Google data
- Adding a place with partial Google data  
- Adding a place with no additional Google data
- Updating an existing place that needs enhancement
- Handling Google Places API failures
- Rate limiting scenarios

### 2. Verification Queries

Use these queries to verify the enhancement is working:

```sql
-- Check if curated list places have enhanced data
SELECT 
  l.name as list_name,
  p.name as place_name,
  p.phone IS NOT NULL as has_phone,
  p.website IS NOT NULL as has_website,
  p.google_rating IS NOT NULL as has_rating,
  (p.hours_open IS NOT NULL AND p.hours_open != '{}') as has_hours
FROM lists l
JOIN list_places lp ON l.id = lp.list_id  
JOIN places p ON lp.place_id = p.id
WHERE l.is_curated = true;

-- Check cache consistency
SELECT 
  p.google_place_id,
  p.name,
  p.phone as places_phone,
  gpc.formatted_phone_number as cache_phone,
  p.website as places_website,
  gpc.website as cache_website
FROM places p
LEFT JOIN google_places_cache gpc ON p.google_place_id = gpc.google_place_id
WHERE p.google_place_id IN (
  SELECT DISTINCT p2.google_place_id 
  FROM places p2
  JOIN list_places lp ON p2.id = lp.place_id
  JOIN lists l ON lp.list_id = l.id
  WHERE l.is_curated = true
);
```

## Success Criteria

The implementation is successful when:

1. ✅ **All curated list places** have enhanced data (phone, website, hours, rating) when available from Google
2. ✅ **Mobile app Quick Info section** displays complete information for curated list places
3. ✅ **Database consistency** between `places` and `google_places_cache` tables
4. ✅ **Graceful handling** of places where Google doesn't have complete data
5. ✅ **Performance** - enhancement doesn't significantly slow down curated list creation
6. ✅ **Error resilience** - system continues working even if Google Places API is temporarily unavailable

## Migration for Existing Data

For existing curated lists that lack enhanced data:

```sql
-- Find curated list places that need enhancement
SELECT DISTINCT p.google_place_id, p.name
FROM places p
JOIN list_places lp ON p.id = lp.place_id
JOIN lists l ON lp.list_id = l.id  
WHERE l.is_curated = true
AND (
  p.phone IS NULL 
  OR p.website IS NULL
  OR p.google_rating IS NULL
  OR p.hours_open IS NULL
  OR p.hours_open = '{}'
);
```

Run the enhancement process for these places to backfill the missing data.

## API Rate Limiting Strategy

Google Places API has usage limits, so implement:

1. **Batch processing** - Process places in small batches with delays
2. **Caching** - Don't re-fetch data for places recently enhanced  
3. **Prioritization** - Enhance places for active curated lists first
4. **Fallback** - If API is unavailable, store minimal data and mark for later enhancement

This comprehensive enhancement process will ensure that curated list places display complete information in the mobile app's Quick Info section, providing a consistent user experience across all list types. 