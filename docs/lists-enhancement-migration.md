# Lists Feature Enhancement Migration

## Overview
This migration enhances the database schema for the Lists feature with rich Google Places data, enabling better place management and user personalization.

## Applied Changes

### 1. Enhanced Places Table with Rich Google Places Data

**New Columns Added:**
- `hours` (JSONB) - Legacy hours field with default `{}`
- `phone` (TEXT) - Phone number from Google Places API
- `website` (TEXT) - Website URL from Google Places API  
- `google_rating` (DECIMAL(2,1)) - Google Places rating (0.0 to 5.0)
- `photos_urls` (TEXT[]) - Array of photo URLs from Google Places API
- `hours_open` (JSONB) - Structured opening hours data from Google Places API

**Constraints Added:**
- `google_rating` must be between 0.0 and 5.0 or NULL

### 2. Enhanced Lists Table

**New Columns Added:**
- `is_default` (BOOLEAN) - Indicates if this is the default Favorites list for the user

**Constraints Added:**
- Unique constraint ensuring only one default list per user (`idx_lists_user_default`)

### 3. Enhanced List Places Junction Table

**New Columns Added:**
- `personal_rating` (INTEGER) - User's personal rating (1-5) separate from Google rating
- `visit_count` (INTEGER) - Number of times user has checked in at this place (default: 0)
- `sort_order` (INTEGER) - Custom sort order within the list (default: 0)

**Constraints Added:**
- `personal_rating` must be between 1 and 5 or NULL

### 4. New Indexes for Performance

- `idx_list_places_list_sort` - Efficient querying by list_id and sort_order
- `idx_places_google_place_id_unique` - Conflict checking for Google Place IDs
- `idx_places_google_rating` - Filtering/sorting by Google rating
- `idx_list_places_personal_rating` - Filtering by personal ratings
- `idx_list_places_added_at` - Sorting by when places were added to lists
- `idx_places_name_search` - Full-text search on place names

### 5. Helper Functions Created

#### `upsert_place_with_rich_data()`
Handles place conflicts when same place is added multiple times. Updates existing places with new rich data from Google Places API.

**Parameters:**
- `p_google_place_id` (TEXT) - Required Google Place ID
- `p_name` (TEXT) - Required place name
- `p_address` (TEXT) - Optional address
- `p_coordinates` (GEOMETRY) - Optional coordinates
- `p_place_type` (TEXT) - Optional place type
- `p_price_level` (INTEGER) - Optional price level
- `p_hours_open` (JSONB) - Optional structured hours
- `p_phone` (TEXT) - Optional phone number
- `p_website` (TEXT) - Optional website
- `p_google_rating` (DECIMAL) - Optional Google rating
- `p_photos_urls` (TEXT[]) - Optional photo URLs
- `p_bangkok_context` (JSONB) - Optional Bangkok context

**Returns:** UUID of the place (existing or newly created)

#### `get_or_create_favorites_list()`
Gets or creates the default Favorites list for a user.

**Parameters:**
- `user_uuid` (UUID) - User ID

**Returns:** UUID of the favorites list

#### `update_list_places_visit_count()`
Trigger function that automatically updates visit_count in list_places when check_ins are added/updated.

### 6. Enriched List Places View

Created `enriched_list_places` view that joins list_places, places, and lists tables to provide complete information in a single query.

**Available Columns:**
- All list_places columns (list_id, place_id, added_at, notes, personal_rating, visit_count, sort_order)
- All places columns (google_place_id, name, address, coordinates, place_type, price_level, google_rating, phone, website, hours_open, photos_urls, bangkok_context)
- List metadata (list_name, is_default, privacy_level, user_id)

### 7. Automatic Triggers

- **Visit Count Trigger**: Automatically updates `visit_count` in `list_places` when users check in at places

## Usage Examples

### Adding a Place with Rich Data
```sql
SELECT upsert_place_with_rich_data(
  'ChIJN1t_tDeuEmsRUsoyG83frY4',
  'Google Sydney',
  '48 Pirrama Rd, Pyrmont NSW 2009, Australia',
  ST_GeomFromText('POINT(151.1957362 -33.8670522)', 4326),
  'establishment',
  2,
  '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}}'::jsonb,
  '+61 2 9374 4000',
  'https://www.google.com.au/about/careers/locations/sydney/',
  4.4,
  ARRAY['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
  '{"district": "Pyrmont", "transport": "Light Rail"}'::jsonb
);
```

### Getting User's Favorites List
```sql
SELECT get_or_create_favorites_list('user-uuid-here');
```

### Querying Enriched List Data
```sql
SELECT 
  list_name,
  name as place_name,
  personal_rating,
  google_rating,
  visit_count,
  phone,
  website,
  hours_open
FROM enriched_list_places 
WHERE user_id = 'user-uuid-here' 
  AND is_default = true
ORDER BY sort_order, added_at DESC;
```

## Migration SQL

The complete migration was applied as `enhance_lists_rich_place_data` and includes all the above enhancements with proper error handling and conflict resolution.

## Next Steps

1. Update your TypeScript types to include the new columns
2. Update your service layer to use the new `upsert_place_with_rich_data()` function
3. Implement UI components to display rich place data (ratings, photos, hours, etc.)
4. Add functionality for users to set personal ratings and custom sort orders
5. Use the `enriched_list_places` view in your queries for better performance 