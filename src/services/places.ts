import { Place, PlaceDetails, PlaceSuggestion, Location, PlaceSearchParams, BangkokContext } from '../types';
import { placesCacheService } from './placesCache';
import { googlePlacesCache } from './googlePlacesCache';
import { Database } from '../types/supabase';

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

// Type definitions based on Supabase schema
export type PlaceRow = Database['public']['Tables']['places']['Row'];
export type PlaceInsert = Database['public']['Tables']['places']['Insert'];
export type PlaceUpdate = Database['public']['Tables']['places']['Update'];

export interface PlaceWithDistance extends PlaceRow {
  distance?: string;
}

export interface NearbyPlace extends PlaceRow {
  distance: number; // in kilometers
}


export class PlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private autocompleteCache: Map<string, { suggestions: PlaceSuggestion[]; timestamp: number }> = new Map();
  private readonly AUTOCOMPLETE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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
        console.log('🗄️ CACHE HIT: Retrieved nearby places from local cache', {
          location: `${location.latitude},${location.longitude}`,
          radius: radius,
          type: type || 'all',
          resultCount: cachedPlaces.length,
          cost: '$0.000 - FREE!'
        });
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

      console.log('🟢 GOOGLE API CALL: Nearby Search from Google Places API', {
        url: `${url}?${params}`,
        location: `${location.latitude},${location.longitude}`,
        radius: radius,
        type: type || 'all'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      console.log('🟢 GOOGLE API RESPONSE: Nearby Search completed', {
        status: data.status,
        resultCount: data.results?.length || 0,
        cost: '$0.032 per 1000 calls - PAID'
      });

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

      console.log('🟢 GOOGLE API CALL: Autocomplete from Google Places API', {
        query: query,
        location: location ? `${location.latitude},${location.longitude}` : 'none',
        cost: '$0.00283 per 1000 calls - PAID'
      });

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
  async getPlaceDetails(placeId: string, forRecommendations = false): Promise<PlaceDetails> {
    try {
      // First check local places cache
      const cachedPlace = await placesCacheService.getCachedPlace(placeId);
      if (cachedPlace) {
        console.log('🗄️ CACHE HIT: Retrieved place from local places cache', {
          placeId: placeId.substring(0, 20) + '...',
          name: cachedPlace.name,
          cost: '$0.000 - FREE!'
        });
        
        // Enrich with Google Places data if available (use soft expiry for recommendations)
        const googleData = await googlePlacesCache.getPlaceDetails(placeId, false, forRecommendations);
        if (googleData) {
          return this.enrichPlaceDetailsWithGoogleData(
            this.convertPlaceToDetails(cachedPlace),
            googleData
          );
        }
        return this.convertPlaceToDetails(cachedPlace);
      }

      // Use Google Places cache (handles API calls intelligently, use soft expiry for recommendations)
      const googleData = await googlePlacesCache.getPlaceDetails(placeId, false, forRecommendations);
      if (!googleData) {
        throw new Error(`Place not found: ${placeId}`);
      }

      // Convert Google data to our Place format and cache locally
      const place = await this.convertGoogleCacheToPlace(googleData);
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
    const types = place.place_type?.split(',') || [];
    
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

  // Cache autocomplete results with intelligent key matching
  private async cacheAutocomplete(query: string, suggestions: PlaceSuggestion[]): Promise<void> {
    const cacheKey = query.toLowerCase().trim();
    this.autocompleteCache.set(cacheKey, {
      suggestions,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (this.autocompleteCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of this.autocompleteCache.entries()) {
        if (now - value.timestamp > this.AUTOCOMPLETE_CACHE_DURATION) {
          this.autocompleteCache.delete(key);
        }
      }
    }
  }

  // Get cached autocomplete results with smart matching
  private async getCachedAutocomplete(query: string): Promise<PlaceSuggestion[]> {
    const cacheKey = query.toLowerCase().trim();
    const cached = this.autocompleteCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.AUTOCOMPLETE_CACHE_DURATION) {
      console.log('🗄️ AUTOCOMPLETE CACHE HIT: Using cached suggestions', {
        query: query,
        resultCount: cached.suggestions.length,
        cost: '$0.000 - FREE!',
        cacheAge: `${Math.round((Date.now() - cached.timestamp) / 1000)}s ago`
      });
      return cached.suggestions;
    }

    // Try to find a shorter query that might have similar results
    for (const [cachedQuery, cachedData] of this.autocompleteCache.entries()) {
      if (query.toLowerCase().startsWith(cachedQuery) && 
          cachedQuery.length >= 3 && 
          query.length - cachedQuery.length <= 2 &&
          (Date.now() - cachedData.timestamp) < this.AUTOCOMPLETE_CACHE_DURATION) {
        
        console.log('🗄️ AUTOCOMPLETE SMART CACHE: Using similar cached query', {
          originalQuery: query,
          cachedQuery: cachedQuery,
          resultCount: cachedData.suggestions.length,
          cost: '$0.000 - FREE!',
          reason: 'Similar query likely has same results'
        });
        
        // Cache this query too for faster future access
        this.autocompleteCache.set(cacheKey, {
          suggestions: cachedData.suggestions,
          timestamp: Date.now()
        });
        
        return cachedData.suggestions;
      }
    }

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
      types: place.place_type ? place.place_type.split(',') : [],
      bangkok_context: place.bangkok_context,
      // Additional details would be populated from Google Places Details API
    };
  }

  // Enrich PlaceDetails with Google Places cache data
  private enrichPlaceDetailsWithGoogleData(placeDetails: PlaceDetails, googleData: any): PlaceDetails {
    return {
      ...placeDetails,
      // Enrich with Google Places data
      rating: googleData.rating || placeDetails.rating,
      address: googleData.formatted_address || placeDetails.address,
      phone_number: googleData.formatted_phone_number,
      website: googleData.website,
      opening_hours: googleData.opening_hours?.weekday_text || placeDetails.opening_hours,
      photos: googleData.photos?.map((photo: any) => photo.photo_reference) || placeDetails.photos,
      reviews: googleData.reviews || placeDetails.reviews,
      types: googleData.types || placeDetails.types,
    };
  }

  // Convert Google Places cache entry to our Place format
  private async convertGoogleCacheToPlace(googleData: any): Promise<Place> {
    const coordinates: [number, number] = googleData.geometry?.location ? 
      [googleData.geometry.location.lng, googleData.geometry.location.lat] : 
      [0, 0];

    const place: Place = {
      id: '', // Will be set by database
      google_place_id: googleData.google_place_id,
      name: googleData.name || 'Unknown Place',
      address: googleData.formatted_address || '',
      coordinates,
      place_type: googleData.types ? googleData.types.join(',') : '',
      price_level: googleData.price_level,
      bangkok_context: {} as BangkokContext,
    };

    // Add Bangkok-specific context
    place.bangkok_context = await this.categorizeBangkokPlace(place);

    return place;
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

 