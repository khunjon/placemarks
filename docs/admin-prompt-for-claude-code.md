# Claude Code Prompt for Admin Web UI Photo Reference Migration

## Context
I need to update my admin web UI to fix photo compatibility issues with my React Native mobile app. Currently, the admin UI stores complete Google Places photo URLs with an admin API key, but the mobile app uses a different API key for tracking purposes. This causes photos to break in the mobile app.

## Objective
Migrate from storing full photo URLs to storing only photo references, allowing each platform (admin web UI, mobile app) to generate URLs with their own API keys.

## Current Problem
```javascript
// Current approach (problematic)
const processGooglePlacesData = async (placeData) => {
  const placeDetails = await fetchPlaceDetails(placeData.place_id, ADMIN_API_KEY);
  
  // This creates URLs with admin API key - breaks mobile app
  const photoUrls = placeDetails.photos?.map(photo => 
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${ADMIN_API_KEY}`
  ) || [];
  
  return {
    ...placeData,
    photos_urls: photoUrls, // ❌ Wrong - mobile app can't use these
    photo_references: placeDetails.photos || []
  };
};
```

## Required Solution
```javascript
// New approach (correct)
const processGooglePlacesData = async (placeData) => {
  const placeDetails = await fetchPlaceDetails(placeData.place_id, ADMIN_API_KEY);
  
  // Store only photo references - let each platform generate URLs
  const photoReferences = placeDetails.photos?.map(photo => ({
    photo_reference: photo.photo_reference,
    height: photo.height,
    width: photo.width,
    html_attributions: photo.html_attributions || []
  })) || [];
  
  return {
    ...placeData,
    photo_references: photoReferences, // ✅ Correct - API key independent
    photos_urls: null // Remove this field
  };
};
```

## Implementation Requirements

### 1. Update Place Creation/Editing Functions
Find where Google Places data is processed and update to store photo references instead of URLs.

### 2. Create Admin Photo URL Generator
For displaying photos in the admin UI:
```javascript
const generateAdminPhotoUrl = (photoReference, maxWidth = 400) => {
  const ADMIN_API_KEY = process.env.ADMIN_GOOGLE_PLACES_API_KEY;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${ADMIN_API_KEY}`;
};
```

### 3. Update Photo Display Components
Replace any components that display photos to use the new generator:
```javascript
const PlacePhotoGallery = ({ photoReferences }) => {
  if (!photoReferences || photoReferences.length === 0) {
    return <div>No photos available</div>;
  }

  return (
    <div className="photo-gallery">
      {photoReferences.slice(0, 5).map((photo, index) => (
        <img
          key={index}
          src={generateAdminPhotoUrl(photo.photo_reference, 300)}
          alt={`Place photo ${index + 1}`}
          className="place-photo"
          loading="lazy"
        />
      ))}
    </div>
  );
};
```

### 4. Update Database Operations
Ensure all database insertions/updates store photo_references instead of photos_urls:
```javascript
const insertPlace = async (placeData) => {
  const { data, error } = await supabase
    .from('places')
    .insert({
      name: placeData.name,
      address: placeData.formatted_address,
      google_place_id: placeData.place_id,
      coordinates: {
        latitude: placeData.geometry.location.lat,
        longitude: placeData.geometry.location.lng
      },
      photo_references: placeData.photo_references, // Store references
      // Don't store photos_urls anymore
      phone: placeData.formatted_phone_number,
      website: placeData.website,
      google_rating: placeData.rating,
      price_level: placeData.price_level,
      place_types: placeData.types,
      hours_open: placeData.opening_hours
    });
    
  return { data, error };
};
```

## Database Schema Context
The database already has these columns in the `places` table:
- `photo_references` (JSONB array) - should be populated with photo reference objects
- `photos_urls` (text array) - should be set to null or removed

## Expected Photo Reference Format
```json
[
  {
    "photo_reference": "ATKogpdN7NqqSXxH74V86_YrIzFBtHwARYurvF0L49XZ...",
    "height": 1080,
    "width": 1920,
    "html_attributions": ["<a href=\"...\">Place Name</a>"]
  }
]
```

## Testing Requirements
After implementation:
1. Create a new place in the admin UI
2. Verify it stores photo_references (not photos_urls) in the database
3. Confirm photos display correctly in the admin UI
4. Check that the mobile app can display photos for admin-created places

## Files to Examine/Modify
Please search for and update:
- Functions that process Google Places API responses
- Components that display place photos
- Database insertion/update operations for places
- Any references to `photos_urls` or photo URL generation

## Environment Variables
Ensure you have:
```env
ADMIN_GOOGLE_PLACES_API_KEY=your_admin_api_key_here
```

## Success Criteria
- [ ] New places store photo_references instead of photos_urls
- [ ] Photos display correctly in admin UI using admin API key
- [ ] No photo URLs with API keys are stored in database
- [ ] Mobile app compatibility maintained (photos work cross-platform)

Please implement these changes and let me know if you need clarification on any part of the migration. 