# Enhanced Lists Service Guide

## Overview
The `EnhancedListsService` provides comprehensive list management functionality for the Placemarks app, including smart place management, Google Places integration, and advanced list features.

## Features Implemented

### 1. List Management
- **Default Favorites Creation**: Automatic creation of favorites list for new users
- **Smart List Sorting**: Favorites pinned at top, then custom lists by creation date
- **Privacy Levels**: Support for private/public lists
- **Rich Metadata**: Icons, colors, descriptions for lists

### 2. Place Management in Lists
- **Smart Conflict Resolution**: Automatic handling of duplicate places
- **Rich Place Data**: Integration with Google Places API for complete place information
- **Personal Ratings**: User-specific ratings separate from Google ratings
- **Custom Ordering**: Drag-and-drop reordering with sort_order field
- **Visit Tracking**: Automatic visit count updates from check-ins

### 3. Smart Lists
- **Most Visited**: Auto-generated based on check-in frequency with recency bias
- **Extensible Framework**: Easy to add new smart list types

### 4. Google Places Integration
- **Search for Lists**: Direct search integration for adding places to lists
- **Rich Data Storage**: Automatic storage of hours, photos, ratings, contact info
- **Conflict Resolution**: Smart handling when same place is added multiple times

## Usage Examples

### Basic List Operations

```typescript
import { enhancedListsService } from '../services/listsService';

// Create default favorites for new user
const favoritesList = await enhancedListsService.createDefaultFavoritesList(userId);

// Get all user lists (Favorites first, then custom lists)
const userLists = await enhancedListsService.getUserLists(userId);

// Create a new custom list
const newList = await enhancedListsService.createList({
  user_id: userId,
  name: "Weekend Brunch Spots",
  description: "My favorite places for weekend brunch",
  privacy_level: "private",
  icon: "coffee",
  color: "#F59E0B"
});

// Update list metadata
const updatedList = await enhancedListsService.updateList(listId, {
  name: "Updated List Name",
  description: "New description",
  privacy_level: "public"
});

// Delete a list (cannot delete favorites)
await enhancedListsService.deleteList(listId);
```

### Place Management

```typescript
// Add a place to a list with rich Google Places data
await enhancedListsService.addPlaceToList(
  listId,
  {
    google_place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    name: "Café Tartine",
    address: "496/1 Ploenchit Rd, Bangkok",
    coordinates: [100.5416, 13.7440],
    place_type: "cafe",
    price_level: 3,
    google_rating: 4.3,
    phone: "+66 2 252 3804",
    website: "https://cafetartine.com",
    hours_open: {
      monday: { open: "07:00", close: "22:00" },
      tuesday: { open: "07:00", close: "22:00" }
    },
    photos_urls: ["https://example.com/photo1.jpg"]
  },
  {
    notes: "Great coffee and pastries",
    personal_rating: 5,
    sort_order: 1
  }
);

// Remove a place from a list
await enhancedListsService.removePlaceFromList(listId, placeId);

// Reorder places in a list
await enhancedListsService.reorderPlacesInList(listId, [
  { place_id: "place1", sort_order: 0 },
  { place_id: "place2", sort_order: 1 },
  { place_id: "place3", sort_order: 2 }
]);

// Update place metadata in a list
await enhancedListsService.updatePlaceInList(listId, placeId, {
  notes: "Updated notes",
  personal_rating: 4,
  sort_order: 0
});
```

### Smart Lists

```typescript
// Generate "Most Visited" smart list
const mostVisitedPlaceIds = await enhancedListsService.generateMostVisitedList(userId);

// Create/update a smart list
const smartListConfig = {
  name: "Most Visited",
  description: "Places you visit most often",
  icon: "trending-up",
  color: "#10B981",
  generator: (userId: string) => enhancedListsService.generateMostVisitedList(userId)
};

const smartList = await enhancedListsService.createOrUpdateSmartList(userId, smartListConfig);
```

### Place Search for Lists

```typescript
// Search places for adding to lists
const searchResults = await enhancedListsService.searchPlacesForList(
  "coffee shops",
  { latitude: 13.7563, longitude: 100.5018 }, // Bangkok coordinates
  10
);

// Get detailed place information
const placeDetails = await enhancedListsService.getPlaceDetailsForList(googlePlaceId);
```

### Utility Functions

```typescript
// Get user's list statistics
const stats = await enhancedListsService.getListStats(userId);
console.log(`User has ${stats.totalLists} lists with ${stats.totalPlaces} places`);

// Check if a place is already in user's lists
const placeStatus = await enhancedListsService.isPlaceInUserLists(userId, googlePlaceId);
if (placeStatus.inLists) {
  console.log(`Place is already in: ${placeStatus.listNames.join(', ')}`);
}
```

## Data Types

### EnhancedPlace
```typescript
interface EnhancedPlace extends Place {
  hours?: Record<string, any>;
  phone?: string;
  website?: string;
  google_rating?: number;
  photos_urls?: string[];
  hours_open?: Record<string, any>;
}
```

### EnhancedList
```typescript
interface EnhancedList extends List {
  is_default?: boolean;
  description?: string;
  list_type?: string;
  icon?: string;
  color?: string;
  type?: 'user' | 'auto';
}
```

### ListWithPlaces
```typescript
interface ListWithPlaces extends EnhancedList {
  places: EnrichedListPlace[];
  place_count: number;
}
```

### EnrichedListPlace
```typescript
interface EnrichedListPlace extends ListPlace {
  place: EnhancedPlace;
}
```

## Error Handling

The service uses custom error classes:

```typescript
try {
  await enhancedListsService.addPlaceToList(listId, placeData);
} catch (error) {
  if (error instanceof PlaceError) {
    console.error('Place operation failed:', error.message, error.code);
  } else if (error instanceof ListError) {
    console.error('List operation failed:', error.message, error.code);
  }
}
```

## Integration with Database

The service leverages the enhanced database schema:
- Uses `upsert_place_with_rich_data()` function for smart place creation
- Uses `get_or_create_favorites_list()` for default list management
- Uses `enriched_list_places` view for efficient data retrieval
- Automatic visit count updates via database triggers

## Best Practices

1. **Always check for existing places** before adding to avoid duplicates
2. **Use the search functions** to get rich place data from Google Places API
3. **Handle errors gracefully** with proper user feedback
4. **Cache list data** where appropriate to reduce database calls
5. **Use smart lists** to provide value-added experiences

## Future Enhancements

The service is designed to be extensible:
- Add new smart list generators easily
- Extend place data with additional fields
- Add collaborative list features
- Implement list sharing and discovery 