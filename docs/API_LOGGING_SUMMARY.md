# Google Places API Logging Summary

## Overview
Added comprehensive console logging for all Google Places API calls to help monitor usage and debug issues during development.

## Log Format
All API calls now log with this consistent format:

### Before API Call:
```
🔍 GOOGLE PLACES API CALL: [Type] ([Source])
{
  url: "full API URL with parameters",
  [relevant parameters],
  cost: "$X.XXX per 1000 calls"
}
```

### After API Response:
```
✅ GOOGLE PLACES API RESPONSE: [Type] ([Source])
{
  status: "OK" | "ERROR",
  [response details],
  cost: "$X.XXX per 1000 calls"
}
```

## Logged API Endpoints

### 1. Nearby Search API
**Cost**: $0.032 per 1000 calls
**Locations**:
- `CheckInSearchScreen.tsx` - When user opens check-in search
- `PlacesService.ts` - When using places service nearby search

**Example Log**:
```
🔍 GOOGLE PLACES API CALL: Nearby Search
{
  url: "https://maps.googleapis.com/maps/api/place/nearbysearch/json?...",
  location: "13.7367,100.5412",
  radius: 500
}

✅ GOOGLE PLACES API RESPONSE: Nearby Search
{
  status: "OK",
  resultCount: 15,
  cost: "$0.032 per 1000 calls"
}
```

### 2. Text Search API
**Cost**: $0.032 per 1000 calls
**Locations**:
- `CheckInSearchScreen.tsx` - When user manually searches for places

**Example Log**:
```
🔍 GOOGLE PLACES API CALL: Text Search
{
  url: "https://maps.googleapis.com/maps/api/place/textsearch/json?...",
  query: "starbucks",
  location: "13.7367,100.5412",
  radius: "1000m"
}

✅ GOOGLE PLACES API RESPONSE: Text Search
{
  status: "OK",
  resultCount: 8,
  query: "starbucks",
  cost: "$0.032 per 1000 calls"
}
```

### 3. Place Details API
**Cost**: $0.017 per 1000 calls
**Locations**:
- `PlaceInListDetailScreen.tsx` - When viewing place details
- `PlacesService.ts` - When getting detailed place information
- `CheckInsService.ts` - When creating check-ins for new places

**Example Log**:
```
🔍 GOOGLE PLACES API CALL: Place Details (PlaceInListDetailScreen)
{
  url: "https://maps.googleapis.com/maps/api/place/details/json?...",
  googlePlaceId: "ChIJXYZ123...",
  fields: "name,formatted_address,formatted_phone_number,website,rating,price_level,opening_hours,photos,types"
}

✅ GOOGLE PLACES API RESPONSE: Place Details (PlaceInListDetailScreen)
{
  status: "OK",
  hasResult: true,
  cost: "$0.017 per 1000 calls"
}
```

### 4. Autocomplete API
**Cost**: $0.00283 per 1000 calls
**Locations**:
- `PlacesService.ts` - When using autocomplete search

**Example Log**:
```
🔍 GOOGLE PLACES API CALL: Autocomplete
{
  url: "https://maps.googleapis.com/maps/api/place/autocomplete/json?...",
  query: "central world",
  location: "13.7367,100.5412"
}

✅ GOOGLE PLACES API RESPONSE: Autocomplete
{
  status: "OK",
  suggestionCount: 5,
  cost: "$0.00283 per 1000 calls"
}
```

### 5. Place Photos API
**Cost**: $0.007 per 1000 calls
**Locations**:
- `PlaceInListDetailScreen.tsx` - When loading place photos (both fetching photo references and generating photo URLs)

**Example Logs**:
```
🔍 GOOGLE PLACES API CALL: Place Photos
{
  url: "https://maps.googleapis.com/maps/api/place/details/json?...",
  googlePlaceId: "ChIJXYZ123...",
  fields: "photos"
}

✅ GOOGLE PLACES API RESPONSE: Place Photos
{
  status: "OK",
  photoCount: 3,
  cost: "$0.017 per 1000 calls"
}

🔍 GOOGLE PLACES API CALL: Photo URL Generated
{
  photoReference: "ATplDJa1b2c3d4e5f6g7...",
  maxWidth: 800,
  cost: "$0.007 per 1000 calls"
}
```

## How to Use for Debugging

### 1. Monitor Console During Development
Open your browser/React Native debugger console and look for:
- 🔍 emoji = API call being made
- ✅ emoji = API response received

### 2. Track Call Volume
Count the number of 🔍 logs to see how many API calls are being made per action.

### 3. Identify Expensive Operations
Look for patterns like:
- Multiple calls in quick succession
- High-cost endpoints (Text Search, Nearby Search)
- Unexpected calls during normal usage

### 4. Debug Caching Issues
If you see repeated identical API calls, it means caching isn't working properly.

### 5. Monitor Error Responses
Look for `status: "ERROR"` or other non-OK statuses in the response logs.

## Example Debug Session

When a user opens CheckInSearchScreen, you should see:
```
🔍 GOOGLE PLACES API CALL: Nearby Search
✅ GOOGLE PLACES API RESPONSE: Nearby Search (status: "OK", resultCount: 12)
```

When a user manually searches for "coffee":
```
🔍 GOOGLE PLACES API CALL: Text Search (query: "coffee")
✅ GOOGLE PLACES API RESPONSE: Text Search (status: "OK", resultCount: 8)
```

When a user views place details:
```
🔍 GOOGLE PLACES API CALL: Place Details (PlaceInListDetailScreen)
✅ GOOGLE PLACES API RESPONSE: Place Details (status: "OK", hasResult: true)
🔍 GOOGLE PLACES API CALL: Photo URL Generated (3 times for 3 photos)
```

## Cost Calculation
With the cost information in each log, you can estimate daily costs:
- Count API calls by type
- Multiply by cost per 1000 calls
- Example: 100 Nearby Search calls = 100 × $0.032/1000 = $0.0032

## Files Modified
- `src/screens/checkins/CheckInSearchScreen.tsx`
- `src/screens/places/PlaceInListDetailScreen.tsx`
- `src/services/places.ts`
- `src/services/checkInsService.ts`
- `API_LOGGING_SUMMARY.md` (this file) 