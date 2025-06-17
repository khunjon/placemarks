# Real Google Places API Integration

## Overview
The PlaceInListDetailScreen now fetches **real, live data** from Google Places API instead of using fake/mock data. This provides users with accurate, up-to-date information about places including phone numbers, websites, hours, ratings, and photos.

## How It Works

### 1. Data Fetching Process
When a user views a place in `PlaceInListDetailScreen`, the app:

1. **Loads basic place data** from our Supabase database
2. **Checks for Google Place ID** - if the place has a `google_place_id`
3. **Fetches fresh data** from Google Places API using the Place ID
4. **Updates the UI** immediately with fresh data
5. **Caches the data** back to our database for future use

### 2. Real Data Retrieved
The integration fetches these real data points from Google Places API:

- ✅ **Phone Number** - Real, formatted phone number
- ✅ **Website** - Official website URL
- ✅ **Google Rating** - Current Google rating (1-5 stars)
- ✅ **Price Level** - Cost indicator ($, $$, $$$, $$$$)
- ✅ **Opening Hours** - Detailed daily hours in our format
- ✅ **Photos** - Fresh photo references from Google
- ✅ **Place Types** - Categories/tags for the place

### 3. Smart Data Merging
The app intelligently merges Google data with existing database data:
- **Prioritizes Google data** when available
- **Falls back to database data** if Google API fails
- **Preserves user data** (personal notes, ratings, etc.)

## Implementation Details

### Core Function: `fetchGooglePlaceDetails()`
```typescript
const fetchGooglePlaceDetails = async (googlePlaceId: string) => {
  const fields = [
    'name', 'formatted_address', 'formatted_phone_number',
    'website', 'rating', 'price_level', 'opening_hours',
    'photos', 'types'
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=${fields}&key=${apiKey}`;
  // ... fetch and parse logic
}
```

### Hours Format Conversion
Google Places API returns hours in a specific format that we convert to our app's format:
```typescript
// Google format: periods with day indices and time strings
// Our format: { monday: { open: "10:00", close: "22:00" }, ... }
```

### Database Updates
Fresh Google data is automatically cached in our database:
```typescript
const updateData = {
  phone: googleData.phone,
  website: googleData.website,
  google_rating: googleData.google_rating.toString(),
  price_level: googleData.price_level,
  hours_open: googleData.hours_open,
  photo_references: googleData.photo_references,
  google_types: googleData.place_types
};
```

## Example: Real Data vs Previous Fake Data

### THE COMMONS @Thonglor
**Before (Fake Data):**
- Phone: +66 2 712 5678
- Website: https://thecommons.co.th
- Rating: 4.5

**After (Real Google Data):**
- Phone: 089 152 2677
- Website: https://www.thecommonsbkk.com/
- Rating: 4.4
- Hours: Real daily hours from Google
- Photos: Fresh photos from Google Places

## Benefits

### For Users
- ✅ **Accurate Information** - Always current phone numbers, websites, hours
- ✅ **Real Reviews** - Actual Google ratings and review counts
- ✅ **Fresh Photos** - Latest photos from Google Places
- ✅ **Reliable Hours** - Current opening hours, holiday schedules

### For Developers
- ✅ **No Manual Data Entry** - Places automatically populate with real data
- ✅ **Always Up-to-Date** - Data refreshes every time a place is viewed
- ✅ **Fallback Support** - Graceful degradation if API fails
- ✅ **Caching Strategy** - Reduces API calls through database caching

## Testing

### API Test Script
Run the test script to verify Google Places API integration:
```bash
node scripts/test-google-places.js
```

### Example Output
```
✅ Google Places API working!
📍 Place: THE COMMONS @Thonglor
📞 Phone: 089 152 2677
🌐 Website: https://www.thecommonsbkk.com/
⭐ Rating: 4.4
💰 Price Level: Not available
🕒 Hours: Available
📸 Photos: 10 photos
```

## Error Handling

The integration includes comprehensive error handling:
- **API Failures** - Falls back to database data
- **Rate Limiting** - Graceful degradation
- **Invalid Place IDs** - Logs warnings, continues with existing data
- **Network Issues** - Retries and fallbacks

## Performance Considerations

- **Parallel Loading** - Google API calls don't block other data loading
- **Caching** - Results stored in database to reduce API calls
- **Smart Updates** - Only updates fields that have changed
- **Background Processing** - UI updates immediately, database updates in background

## Future Enhancements

- **Batch Updates** - Update multiple places at once
- **Scheduled Refresh** - Periodic background updates
- **User Preferences** - Allow users to control data freshness
- **Offline Support** - Enhanced fallback for offline scenarios

## Configuration

Ensure your `.env` file has the Google Places API key:
```
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_api_key_here
```

The API key needs these permissions:
- Places API
- Places Details API
- Places Photos API 