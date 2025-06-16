// City Detection Service for Placemarks MVP
// Simple Bangkok boundary detection with distance utilities

export interface Location {
  latitude: number;
  longitude: number;
}

export interface CityContext {
  tier: 'bangkok' | 'standard';
  isInBangkok: boolean;
  detectedAt: Date;
  userLocation?: Location;
}

export interface BangkokBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Bangkok boundary coordinates (simple rectangle)
const BANGKOK_BOUNDS: BangkokBounds = {
  north: 13.956,  // Northern boundary
  south: 13.494,  // Southern boundary
  east: 100.928,  // Eastern boundary
  west: 100.321,  // Western boundary
};

/**
 * Detects if a location is within Bangkok boundaries
 * @param location - The location to check
 * @returns boolean indicating if location is in Bangkok
 */
export function isLocationInBangkok(location: Location): boolean {
  const { latitude, longitude } = location;
  
  return (
    latitude >= BANGKOK_BOUNDS.south &&
    latitude <= BANGKOK_BOUNDS.north &&
    longitude >= BANGKOK_BOUNDS.west &&
    longitude <= BANGKOK_BOUNDS.east
  );
}

/**
 * Creates a city context based on user location
 * @param userLocation - The user's current location
 * @returns CityContext object with tier and detection info
 */
export function createCityContext(userLocation: Location): CityContext {
  const isInBangkok = isLocationInBangkok(userLocation);
  
  return {
    tier: isInBangkok ? 'bangkok' : 'standard',
    isInBangkok,
    detectedAt: new Date(),
    userLocation,
  };
}

/**
 * Calculates the distance between two coordinates using Haversine formula
 * @param location1 - First location
 * @param location2 - Second location
 * @returns Distance in kilometers
 */
export function getDistanceBetweenCoordinates(
  location1: Location,
  location2: Location
): number {
  const R = 6371; // Earth's radius in kilometers
  
  const lat1Rad = (location1.latitude * Math.PI) / 180;
  const lat2Rad = (location2.latitude * Math.PI) / 180;
  const deltaLatRad = ((location2.latitude - location1.latitude) * Math.PI) / 180;
  const deltaLngRad = ((location2.longitude - location1.longitude) * Math.PI) / 180;
  
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Gets the distance from a location to Bangkok center
 * Bangkok center coordinates: 13.7563, 100.5018 (Grand Palace area)
 * @param location - The location to measure from
 * @returns Distance to Bangkok center in kilometers
 */
export function getDistanceToBangkok(location: Location): number {
  const bangkokCenter: Location = {
    latitude: 13.7563,
    longitude: 100.5018,
  };
  
  return getDistanceBetweenCoordinates(location, bangkokCenter);
}

/**
 * Utility function to check if coordinates are valid
 * @param location - Location to validate
 * @returns boolean indicating if coordinates are valid
 */
export function isValidLocation(location: Location): boolean {
  const { latitude, longitude } = location;
  
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
}

/**
 * Creates a city context with validation
 * @param userLocation - The user's location (may be invalid)
 * @returns CityContext or null if location is invalid
 */
export function createValidatedCityContext(
  userLocation: Location | null | undefined
): CityContext | null {
  if (!userLocation || !isValidLocation(userLocation)) {
    return null;
  }
  
  return createCityContext(userLocation);
}

// Export constants for external use
export const BANGKOK_CENTER: Location = {
  latitude: 13.7563,
  longitude: 100.5018,
};

export const BANGKOK_BOUNDS_EXPORT = BANGKOK_BOUNDS; 