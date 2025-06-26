# Placemarks Database Schema Reference for Claude Code

## Overview

This document provides the complete, current database schema and TypeScript types for the Placemarks React Native app. This information was generated directly from the live Supabase database and represents the most accurate schema as of the document creation date.

## Project Context

**Placemarks** is a React Native Expo app that allows users to save, organize, and share their favorite places. The app uses Supabase as the backend with the following key features:

- User authentication and profiles
- Place discovery and management
- Check-ins with photos and notes
- Personal and curated lists
- Google Places API integration with caching
- PostGIS for geographic queries

## Critical Tables for Curated Lists Enhancement

### 1. `places` Table - Main Place Data

**Key Enhancement Fields:**
- `phone: string | null` - Phone number from Google Places API
- `website: string | null` - Website URL from Google Places API  
- `google_rating: number | null` - Google rating from Google Places API
- `hours_open: Json | null` - Opening hours from Google Places API
- `photo_references: Json | null` - Photo references from Google Places API

**Enhancement Logic:**
A place needs enhancement if ANY of these fields are `null` or empty:
- `phone` is null
- `website` is null  
- `google_rating` is null
- `hours_open` is null or empty object `{}`

### 2. `google_places_cache` Table - Google Places Data Cache

**Source Fields for Enhancement:**
- `formatted_phone_number: string | null` → maps to `places.phone`
- `website: string | null` → maps to `places.website`
- `rating: number | null` → maps to `places.google_rating`
- `opening_hours: Json | null` → maps to `places.hours_open`

### 3. `lists` Table - List Management

**Curated List Identification:**
- `is_curated: boolean | null` - `true` for admin-managed curated lists
- `user_id: string | null` - `null` for curated lists (admin-managed)
- `publisher_name: string | null` - Name of the list publisher/curator
- `location_scope: string | null` - Geographic scope (e.g., "Bangkok")

### 4. `list_places` Table - List-Place Relationships

**Junction Table:**
- `list_id: string` - References `lists.id`
- `place_id: string` - References `places.id`
- `added_at: string | null` - When place was added to list

## Key Database Functions

### `upsert_place_with_rich_data()`
Use this function to insert/update places with complete Google Places data:

```sql
SELECT upsert_place_with_rich_data(
  google_place_id_param := 'ChIJ...',
  name_param := 'Place Name',
  address_param := 'Full Address',
  phone_param := '+66 2 123 4567',
  website_param := 'https://example.com',
  google_rating_param := 4.5,
  hours_open_param := '{"monday": {"open": "09:00", "close": "22:00"}}',
  -- ... other parameters
);
```

### `get_curated_lists()`
Query curated lists with optional filtering:

```sql
SELECT * FROM get_curated_lists(
  p_location_scope := 'Bangkok',
  p_list_type := 'restaurants'
);
```

## Google Places API Integration Requirements

### Required Fields from Google Places API
```javascript
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
  'formatted_phone_number',  // → places.phone
  'website',                 // → places.website
  'opening_hours',           // → places.hours_open
  'photos'
];
```

### Data Mapping
```javascript
// Google Places API → Database Fields
{
  formatted_phone_number: string → places.phone
  website: string → places.website  
  rating: number → places.google_rating
  opening_hours: object → places.hours_open
  photos: array → places.photo_references
}
```

## Enhancement Process for Curated Lists

### 1. Check Enhancement Need
```sql
SELECT id, google_place_id, phone, website, google_rating, hours_open 
FROM places 
WHERE google_place_id = $1;
```

### 2. Determine Enhancement Required
Enhancement needed if ANY condition is true:
- `phone IS NULL`
- `website IS NULL`
- `google_rating IS NULL`  
- `hours_open IS NULL OR hours_open = '{}'`

### 3. Fetch from Google Places API
```javascript
const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
```

### 4. Update Database
Use `upsert_place_with_rich_data()` function or direct SQL:

```sql
UPDATE places SET
  phone = COALESCE($2, phone),
  website = COALESCE($3, website), 
  google_rating = COALESCE($4, google_rating),
  hours_open = COALESCE($5, hours_open)
WHERE google_place_id = $1;
```

### 5. Update Cache
```sql
INSERT INTO google_places_cache (...)
VALUES (...)
ON CONFLICT (google_place_id) 
DO UPDATE SET
  formatted_phone_number = COALESCE(EXCLUDED.formatted_phone_number, google_places_cache.formatted_phone_number),
  website = COALESCE(EXCLUDED.website, google_places_cache.website),
  opening_hours = COALESCE(EXCLUDED.opening_hours, google_places_cache.opening_hours),
  rating = COALESCE(EXCLUDED.rating, google_places_cache.rating);
```

## Verification Queries

### Check Curated List Places Enhancement Status
```sql
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
```

### Find Places Needing Enhancement
```sql
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

## Important Notes

1. **PostGIS Extension**: Database uses PostGIS for geographic queries
2. **Coordinates**: Stored as PostGIS GEOMETRY POINT type
3. **JSON Fields**: `hours_open`, `bangkok_context`, `photo_references` use JSONB
4. **UUIDs**: All primary keys use UUID format
5. **Timestamps**: All timestamps are `TIMESTAMP WITH TIME ZONE`

## Error Handling

- **Rate Limits**: Google Places API has usage limits
- **Missing Data**: Some places legitimately don't have phone/website/hours
- **Invalid Place IDs**: Validate Google Place IDs before API calls
- **API Failures**: Store partial data and mark for retry

This schema represents the current state of the Placemarks database and should be used as the authoritative reference for any database operations or integrations.
