/**
 * Unified place type mapping utility
 * Provides consistent categorization across the app with simplified categories
 */

// Standard place types used throughout the app
export type PlaceType = 'restaurant' | 'cafe' | 'shopping' | 'temple' | 'park' | 'hotel' | 'attraction';

// Display names for each place type
export const PLACE_TYPE_DISPLAY_NAMES: Record<PlaceType, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe', 
  shopping: 'Shopping',
  temple: 'Temple',
  park: 'Park',
  hotel: 'Hotel',
  attraction: 'Attraction'
};

/**
 * Maps Google Places API types to simplified app categories
 * Priority order: food-related types take precedence over general types like 'store'
 */
const GOOGLE_TYPE_TO_APP_TYPE: Record<string, PlaceType> = {
  // Food & Dining (consolidated as requested)
  restaurant: 'restaurant',
  food: 'restaurant',
  bakery: 'restaurant', // User requested: bakery → Restaurant
  meal_takeaway: 'restaurant',
  meal_delivery: 'restaurant',
  
  // Beverages
  cafe: 'cafe',
  bar: 'restaurant', // Bars serve food and drinks, categorize as restaurant
  
  // Shopping
  shopping_mall: 'shopping',
  store: 'shopping',
  clothing_store: 'shopping',
  supermarket: 'shopping',
  convenience_store: 'shopping',
  
  // Religious & Cultural
  hindu_temple: 'temple',
  buddhist_temple: 'temple',
  place_of_worship: 'temple',
  church: 'temple',
  mosque: 'temple',
  
  // Nature & Recreation
  park: 'park',
  
  // Accommodation
  lodging: 'hotel',
  
  // Attractions & Points of Interest
  tourist_attraction: 'attraction',
  museum: 'attraction',
  amusement_park: 'attraction',
  zoo: 'attraction',
  aquarium: 'attraction'
};

/**
 * Infer app place type from Google Places API types array
 * Returns the most specific type based on priority order
 */
export function inferPlaceTypeFromGoogleTypes(types: string[]): PlaceType {
  if (!types || !Array.isArray(types) || types.length === 0) {
    return 'restaurant'; // Default fallback
  }
  
  // Define priority order - food-related types take precedence
  const priorityOrder: PlaceType[] = [
    'restaurant', // Highest priority for food establishments
    'cafe',
    'temple',
    'park', 
    'hotel',
    'attraction',
    'shopping' // Lowest priority - many places have 'store' as secondary type
  ];
  
  // First, collect all matching app types
  const matchedTypes = new Set<PlaceType>();
  for (const googleType of types) {
    const appType = GOOGLE_TYPE_TO_APP_TYPE[googleType];
    if (appType) {
      matchedTypes.add(appType);
    }
  }
  
  // Return the highest priority type found
  for (const priorityType of priorityOrder) {
    if (matchedTypes.has(priorityType)) {
      return priorityType;
    }
  }
  
  return 'attraction'; // Final fallback
}

/**
 * Get the primary display type for a place
 */
export function getPrimaryDisplayType(types: string[]): string {
  const appType = inferPlaceTypeFromGoogleTypes(types);
  return PLACE_TYPE_DISPLAY_NAMES[appType];
}