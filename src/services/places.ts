import { Place, PlaceDetails, PlaceSuggestion, Location, PlaceSearchParams } from '../types/places';
import { BangkokContext } from '../types/database';
import { placesCacheService } from './placesCache';

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  price_level?: number;
  rating?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  formatted_phone_number?: string;
  website?: string;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
}

interface GoogleAutocompleteResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export class PlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Places API key not configured');
    }
  }

  // Search nearby places with caching
  async searchNearbyPlaces(location: Location, radius: number, type?: string): Promise<Place[]> {
    try {
      // First check cache for recent searches in this area
      const cachedPlaces = await placesCacheService.getCachedNearbyPlaces(location, radius, type);
      if (cachedPlaces.length > 0) {
        return cachedPlaces;
      }

      // Make Google Places API request
      const url = `${this.baseUrl}/nearbysearch/json`;
      const params = new URLSearchParams({
        location: `${location.latitude},${location.longitude}`,
        radius: radius.toString(),
        key: this.apiKey,
      });

      if (type) {
        params.append('type', type);
      }

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      // Convert Google results to our Place format and cache them
      const places: Place[] = [];
      for (const result of data.results) {
        const place = await this.convertGoogleResultToPlace(result);
        places.push(place);
        await placesCacheService.cachePlace(place);
      }

      return places;
    } catch (error) {
      console.error('Error searching nearby places:', error);
      throw error;
    }
  }

  // Autocomplete with cached suggestions
  async getPlaceAutocomplete(query: string, location?: Location): Promise<PlaceSuggestion[]> {
    try {
      if (query.length < 2) {
        return [];
      }

      // Check cache for recent autocomplete results
      const cachedSuggestions = await this.getCachedAutocomplete(query);
      if (cachedSuggestions.length > 0) {
        return cachedSuggestions;
      }

      const url = `${this.baseUrl}/autocomplete/json`;
      const params = new URLSearchParams({
        input: query,
        key: this.apiKey,
        components: 'country:th', // Restrict to Thailand
      });

      if (location) {
        params.append('location', `${location.latitude},${location.longitude}`);
        params.append('radius', '50000'); // 50km radius
      }

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Places Autocomplete API error: ${data.status}`);
      }

      const suggestions: PlaceSuggestion[] = data.predictions.map((prediction: GoogleAutocompleteResult) => ({
        place_id: prediction.place_id,
        description: prediction.description,
        main_text: prediction.structured_formatting.main_text,
        secondary_text: prediction.structured_formatting.secondary_text,
      }));

      // Cache the autocomplete results
      await this.cacheAutocomplete(query, suggestions);

      return suggestions;
    } catch (error) {
      console.error('Error getting place autocomplete:', error);
      throw error;
    }
  }

  // Get detailed place information
  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    try {
      // Check cache first
      const cachedPlace = await placesCacheService.getCachedPlace(placeId);
      if (cachedPlace) {
        return this.convertPlaceToDetails(cachedPlace);
      }

      const url = `${this.baseUrl}/details/json`;
      const params = new URLSearchParams({
        place_id: placeId,
        key: this.apiKey,
        fields: 'place_id,name,formatted_address,geometry,types,price_level,rating,photos,opening_hours,formatted_phone_number,website,reviews',
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Places Details API error: ${data.status}`);
      }

      const place = await this.convertGoogleResultToPlace(data.result);
      await placesCacheService.cachePlace(place);

      return this.convertPlaceToDetails(place);
    } catch (error) {
      console.error('Error getting place details:', error);
      throw error;
    }
  }

  // Bangkok-specific categorization
  async categorizeBangkokPlace(place: Place): Promise<BangkokContext> {
    const context: BangkokContext = {
      environment: 'indoor',
      location_type: 'building',
      bts_proximity: 'none',
      air_conditioning: true,
      noise_level: 'moderate',
      price_tier: 'casual',
    };

    // Analyze place type and location for Bangkok context
    const types = place.place_type.split(',');
    
    // Determine environment
    if (types.some(type => ['park', 'tourist_attraction', 'amusement_park'].includes(type))) {
      context.environment = 'outdoor';
    } else if (types.some(type => ['restaurant', 'cafe', 'shopping_mall'].includes(type))) {
      context.environment = 'indoor';
    } else {
      context.environment = 'mixed';
    }

    // Determine location type
    if (types.includes('shopping_mall')) {
      context.location_type = 'mall';
    } else if (types.some(type => ['market', 'food'].includes(type))) {
      context.location_type = 'market';
    } else if (types.some(type => ['restaurant', 'cafe', 'store'].includes(type))) {
      context.location_type = 'street';
    }

    // Determine BTS proximity (simplified - in real app would use BTS station data)
    const bangkokCenter = { lat: 13.7563, lng: 100.5018 };
    const distance = this.calculateDistance(
      place.coordinates[1], place.coordinates[0],
      bangkokCenter.lat, bangkokCenter.lng
    );

    if (distance < 1) {
      context.bts_proximity = 'walking';
    } else if (distance < 3) {
      context.bts_proximity = 'near';
    } else if (distance < 10) {
      context.bts_proximity = 'far';
    }

    // Determine price tier based on Google's price_level
    if (place.price_level) {
      switch (place.price_level) {
        case 1:
          context.price_tier = 'street';
          break;
        case 2:
          context.price_tier = 'casual';
          break;
        case 3:
          context.price_tier = 'mid';
          break;
        case 4:
          context.price_tier = 'upscale';
          break;
        default:
          context.price_tier = 'casual';
      }
    }

    // Determine noise level based on location type
    if (context.location_type === 'mall') {
      context.noise_level = 'moderate';
    } else if (context.location_type === 'market') {
      context.noise_level = 'loud';
    } else if (context.environment === 'outdoor') {
      context.noise_level = 'quiet';
    }

    // Air conditioning assumption
    context.air_conditioning = context.environment === 'indoor' || context.location_type === 'mall';

    return context;
  }

  // Get cache statistics (delegated to cache service)
  async getCacheStats() {
    return placesCacheService.getCacheStats();
  }

  // Clear expired cache entries (delegated to cache service)
  async clearExpiredCache() {
    return placesCacheService.clearExpiredCache();
  }

  // Cache autocomplete results (simplified - in production might use Redis)
  private async cacheAutocomplete(query: string, suggestions: PlaceSuggestion[]): Promise<void> {
    // For now, we'll skip caching autocomplete results
    // In production, you might want to cache these in a separate table or Redis
  }

  // Get cached autocomplete results
  private async getCachedAutocomplete(query: string): Promise<PlaceSuggestion[]> {
    // For now, return empty array - no autocomplete caching
    return [];
  }

  // Convert Google Places result to our Place format
  private async convertGoogleResultToPlace(result: GooglePlaceResult): Promise<Place> {
    const place: Place = {
      id: '', // Will be set by database
      google_place_id: result.place_id,
      name: result.name,
      address: result.formatted_address,
      coordinates: [result.geometry.location.lng, result.geometry.location.lat],
      place_type: result.types.join(','),
      price_level: result.price_level,
      bangkok_context: {} as BangkokContext,
    };

    // Add Bangkok-specific context
    place.bangkok_context = await this.categorizeBangkokPlace(place);

    return place;
  }

  // Convert Place to PlaceDetails
  private convertPlaceToDetails(place: Place): PlaceDetails {
    return {
      id: place.id,
      google_place_id: place.google_place_id,
      name: place.name,
      address: place.address,
      coordinates: place.coordinates,
      price_level: place.price_level,
      bangkok_context: place.bangkok_context,
      // Additional details would be populated from Google Places Details API
    };
  }



  // Calculate distance between two points (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// Export singleton instance
export const placesService = new PlacesService(); 