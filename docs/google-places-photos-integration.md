# Google Places Photos Integration

## Overview

The PlaceInListDetailScreen now properly integrates with Google Places API to display real place photos instead of hardcoded placeholder images.

## How It Works

### 1. Database Schema
- Added `photo_references` JSONB column to `places` table
- Stores Google Places API photo references with metadata:
  ```json
  [
    {
      "photo_reference": "ATplDJa...",
      "height": 3024,
      "width": 4032,
      "html_attributions": []
    }
  ]
  ```

### 2. Photo URL Generation
- Photo references are converted to actual image URLs using Google Places Photo API
- Format: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=REFERENCE&key=API_KEY`
- Supports custom width/height parameters for responsive images

### 3. Automatic Photo Fetching
- When viewing a place for the first time, fresh photos are automatically fetched from Google Places API
- Photo references are cached in the database for future views
- Fallback to stored URLs if Google Photos are unavailable

### 4. Photo Display Priority
1. **Google Places Photos** (via photo references) - Primary source
2. **Stored URLs** (legacy/fallback) - Secondary source
3. **No photos** - Graceful handling when no images available

## Implementation Details

### Key Functions

#### `getGooglePhotoUrl(photoReference, maxWidth)`
Converts a Google Places photo reference to an actual image URL.

#### `fetchGooglePlacesPhotos(googlePlaceId)`
Fetches fresh photo references from Google Places API for a given place.

#### `getPhotoUrls()`
Returns array of photo URLs, prioritizing Google Photos over stored URLs.

### Database Integration
- Photo references are automatically updated when fresh photos are fetched
- Existing places with stored URLs continue to work during migration
- New places added through Google Places API will have proper photo references

## Benefits

1. **Real Photos**: Displays actual photos from Google Places instead of generic stock images
2. **High Quality**: Access to high-resolution photos from Google's database
3. **Always Fresh**: Photos are updated automatically when viewing places
4. **Responsive**: Photos can be resized for different screen sizes and bandwidth
5. **Fallback Support**: Graceful degradation to stored URLs when needed

## API Usage

The integration uses the Google Places Photo API (Legacy):
- **Endpoint**: `https://maps.googleapis.com/maps/api/place/photo`
- **Authentication**: API key via `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`
- **Rate Limits**: Subject to Google Places API quotas
- **Caching**: Photo references are cached in database to minimize API calls

## Future Enhancements

1. **Batch Photo Updates**: Periodically update photo references for all places
2. **Photo Attribution**: Display required attributions from `html_attributions`
3. **Multiple Sizes**: Store multiple photo reference sizes for different use cases
4. **Offline Support**: Cache actual image files for offline viewing
5. **Migration to New API**: Upgrade to Google Places Photo API (New) when ready 