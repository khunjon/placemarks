# Admin Web UI Photo Reference Migration

## Overview
This document provides instructions for updating the admin web UI to store photo references instead of full photo URLs, eliminating API key conflicts between admin and mobile environments.

## Problem Statement
Currently, the admin web UI stores complete Google Places photo URLs with the admin API key, causing photos to break in the mobile app which uses a different API key for tracking purposes.

## Solution
Store only photo references in the database and generate URLs client-side with the appropriate API key for each environment.

## Required Changes

### 1. Update Place Creation/Editing Logic

Replace the current photo URL generation with photo reference storage:

```javascript
// BEFORE (Current - Problematic)
const processGooglePlacesData = async (placeData) => {
  const placeDetails = await fetchPlaceDetails(placeData.place_id, ADMIN_API_KEY);
  
  // This creates URLs with admin API key - breaks mobile app
  const photoUrls = placeDetails.photos?.map(photo => 
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${ADMIN_API_KEY}`
  ) || [];
  
  return {
    ...placeData,
    photos_urls: photoUrls, // ❌ Wrong - stores admin API key
    photo_references: placeDetails.photos || []
  };
};

// AFTER (New - Correct)
const processGooglePlacesData = async (placeData) => {
  const placeDetails = await fetchPlaceDetails(placeData.place_id, ADMIN_API_KEY);
  
  // Store only photo references - let clients generate URLs
  const photoReferences = placeDetails.photos?.map(photo => ({
    photo_reference: photo.photo_reference,
    height: photo.height,
    width: photo.width,
    html_attributions: photo.html_attributions || []
  })) || [];
  
  return {
    ...placeData,
    photo_references: photoReferences, // ✅ Correct - API key independent
    // Remove photos_urls entirely or set to null
    photos_urls: null
  };
};
```

### 2. Update Database Insertion

Ensure the database stores photo references instead of URLs:

```javascript
// Database insertion/update
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
      // Store photo references, not URLs
      photo_references: placeData.photo_references,
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

### 3. Update Admin UI Photo Display

For displaying photos in the admin UI, generate URLs with the admin API key:

```javascript
// Photo URL generator for admin UI
const generateAdminPhotoUrl = (photoReference, maxWidth = 400) => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${ADMIN_API_KEY}`;
};

// React component for displaying photos in admin
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

### 4. Update Google Places Cache Integration

If using the Google Places cache, ensure it stores photo references:

```javascript
// Update google_places_cache table structure
const updateGooglePlacesCache = async (googlePlaceId, placeDetails) => {
  const { data, error } = await supabase
    .from('google_places_cache')
    .upsert({
      google_place_id: googlePlaceId,
      name: placeDetails.name,
      formatted_address: placeDetails.formatted_address,
      rating: placeDetails.rating,
      // Store photo references instead of URLs
      photos: placeDetails.photos || [],
      // Remove photo_urls or set to null
      photo_urls: null,
      has_photos_data: (placeDetails.photos?.length || 0) > 0,
      // ... other fields
    });
    
  return { data, error };
};
```

## Migration Steps

### Step 1: Update Code
1. Modify place creation/editing functions to store photo references
2. Update database insertion logic
3. Create admin photo URL generator for UI display
4. Test with a few places to ensure photos display correctly in admin UI

### Step 2: Database Migration (Optional)
If you want to clean up existing data:

```sql
-- Remove photos_urls from existing places (optional)
UPDATE places SET photos_urls = NULL WHERE photos_urls IS NOT NULL;

-- Clean up google_places_cache (optional)
UPDATE google_places_cache SET photo_urls = NULL WHERE photo_urls IS NOT NULL;
```

### Step 3: Verify Mobile App
1. Ensure mobile app displays photos correctly using photo references
2. Check that no additional Google Places API calls are made
3. Verify photos load for both new and existing places

## Benefits After Migration

✅ **API Key Independence**: Admin and mobile can use different keys  
✅ **Reduced Storage**: Photo references are ~100 chars vs URLs at 500+ chars  
✅ **Flexibility**: Generate different image sizes dynamically  
✅ **Security**: No API keys stored in database  
✅ **Multi-Environment**: Works across web, mobile, and future platforms  

## Testing Checklist

- [ ] Photos display correctly in admin UI
- [ ] New places store photo references (not URLs)
- [ ] Mobile app displays photos without additional API calls
- [ ] Different image sizes can be generated as needed
- [ ] No API key conflicts between environments

## Troubleshooting

**Photos not displaying in admin UI:**
- Check that `generateAdminPhotoUrl` uses the correct admin API key
- Verify photo references are valid (not starting with 'ATplDJ')

**Mobile app still making API calls:**
- Ensure places have photo_references populated
- Check that PhotoUrlGenerator is being used in mobile app
- Verify photo references are not empty arrays

**Database errors:**
- Ensure photo_references column accepts JSONB arrays
- Check that photo reference objects have required fields (photo_reference, height, width)

## Environment Variables Required

```env
# Admin Web UI
ADMIN_GOOGLE_PLACES_API_KEY=your_admin_api_key_here

# Mobile App (already configured)
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_mobile_api_key_here
```

This migration will eliminate API key conflicts and provide a more robust, scalable photo system for your multi-platform application.