import { Place, EnrichedPlace, PlaceDetails, PlaceSuggestion, Location, PlaceSearchParams } from '../types';
import { supabase } from './supabase';

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  types: string[];
  price_level?: number;
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  current_opening_hours?: any;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  business_status?: string;
  plus_code?: any;
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
  private autocompleteCache: Map<string, { suggestions: PlaceSuggestion[]; timestamp: number }> = new Map();
  private readonly AUTOCOMPLETE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Places API key not configured');
    }
  }

  /**
   * Search nearby places and cache results in google_places_cache
   */
  async searchNearbyPlaces(location: Location, radius: number, type?: string): Promise<EnrichedPlace[]> {
    try {
      // First check for cached places in the area
      const cachedPlaces = await this.getCachedNearbyPlaces(location, radius, type);
      if (cachedPlaces.length > 0) {
        console.log('🗄️ CACHE HIT: Retrieved nearby places from cache', {
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
        type: type || 'all',
        cost: '$0.032 per 1000 calls - PAID'
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

      // Cache all results and return enriched places
      const enrichedPlaces: EnrichedPlace[] = [];
      for (const result of data.results) {
        await this.cacheGooglePlace(result);
        const enrichedPlace = await this.getEnrichedPlace(result.place_id);
        if (enrichedPlace) {
          enrichedPlaces.push(enrichedPlace);
        }
      }

      return enrichedPlaces;
    } catch (error) {
      console.error('Error searching nearby places:', error);
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions with caching
   */
  async getPlaceAutocomplete(query: string, location?: Location): Promise<PlaceSuggestion[]> {
    try {
      if (!query || typeof query !== 'string') {
        console.error('❌ INVALID QUERY: Invalid autocomplete query', { query, type: typeof query });
        throw new Error('Invalid query provided to autocomplete');
      }

      const sanitizedQuery = query.trim();
      if (sanitizedQuery.length < 2) {
        console.log('🔍 SHORT QUERY: Query too short for autocomplete', { query: sanitizedQuery });
        return [];
      }

      // Check cache
      const cachedSuggestions = this.getCachedAutocomplete(sanitizedQuery);
      if (cachedSuggestions.length > 0) {
        console.log('🗄️ CACHE HIT: Autocomplete suggestions from cache');
        return cachedSuggestions;
      }

      const url = `${this.baseUrl}/autocomplete/json`;
      const params = new URLSearchParams({
        input: sanitizedQuery,
        key: this.apiKey,
        components: 'country:th', // Thailand only
      });

      if (location) {
        params.append('location', `${location.latitude},${location.longitude}`);
        params.append('radius', '50000'); // 50km radius
      }

      console.log('🟢 GOOGLE API CALL: Autocomplete from Google Places API', {
        query: sanitizedQuery,
        cost: '$0.00283 per 1000 calls - PAID'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('❌ GOOGLE API ERROR:', { status: data.status, query: sanitizedQuery });
        throw new Error(`Google Places Autocomplete API error: ${data.status}`);
      }

      const suggestions: PlaceSuggestion[] = data.predictions.map((prediction: GoogleAutocompleteResult) => ({
        place_id: prediction.place_id,
        description: prediction.description,
        main_text: prediction.structured_formatting.main_text,
        secondary_text: prediction.structured_formatting.secondary_text,
      }));

      // Cache suggestions
      this.cacheAutocomplete(sanitizedQuery, suggestions);

      console.log('🟢 AUTOCOMPLETE SUCCESS:', { query: sanitizedQuery, resultCount: suggestions.length });
      return suggestions;
    } catch (error) {
      console.error('Error in autocomplete:', error);
      throw error;
    }
  }

  /**
   * Get enriched place details (combines Google data with editorial content)
   */
  async getEnrichedPlace(googlePlaceId: string): Promise<EnrichedPlace | null> {
    try {
      const { data: place, error } = await supabase
        .from('enriched_places')
        .select('*')
        .eq('google_place_id', googlePlaceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return place || null;
    } catch (error) {
      console.error('Error getting enriched place:', error);
      return null;
    }
  }

  /**
   * Get place details from cache or fetch from Google API
   */
  async getPlaceDetails(googlePlaceId: string): Promise<PlaceDetails | null> {
    try {
      // First try to get from cache
      let place = await this.getPlaceFromCache(googlePlaceId);
      
      if (!place) {
        // If not in cache, fetch from Google Places API
        place = await this.fetchAndCacheGooglePlace(googlePlaceId);
      }

      if (!place) {
        return null;
      }

      // Convert to PlaceDetails format
      return this.convertCachedPlaceToDetails(place);
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Get multiple enriched places by Google Place IDs
   */
  async getEnrichedPlaces(googlePlaceIds: string[]): Promise<EnrichedPlace[]> {
    try {
      const { data: places, error } = await supabase
        .from('enriched_places')
        .select('*')
        .in('google_place_id', googlePlaceIds);

      if (error) throw error;
      return places || [];
    } catch (error) {
      console.error('Error getting enriched places:', error);
      return [];
    }
  }

  /**
   * Cache a Google Place result in google_places_cache
   */
  async cacheGooglePlace(googleResult: GooglePlaceResult): Promise<void> {
    try {
      const cacheData = {
        google_place_id: googleResult.place_id,
        name: googleResult.name,
        formatted_address: googleResult.formatted_address,
        geometry: googleResult.geometry,
        types: googleResult.types,
        rating: googleResult.rating,
        user_ratings_total: googleResult.user_ratings_total,
        price_level: googleResult.price_level,
        formatted_phone_number: googleResult.formatted_phone_number,
        international_phone_number: googleResult.international_phone_number,
        website: googleResult.website,
        opening_hours: googleResult.opening_hours,
        current_opening_hours: googleResult.current_opening_hours,
        photos: googleResult.photos,
        reviews: googleResult.reviews,
        business_status: googleResult.business_status || 'OPERATIONAL',
        plus_code: googleResult.plus_code,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        last_accessed: new Date().toISOString(),
        access_count: 1,
        has_basic_data: true,
        has_contact_data: !!(googleResult.formatted_phone_number || googleResult.website),
        has_hours_data: !!googleResult.opening_hours,
        has_photos_data: !!(googleResult.photos && googleResult.photos.length > 0),
        has_reviews_data: !!(googleResult.reviews && googleResult.reviews.length > 0),
        photo_urls: googleResult.photos?.map(photo => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`
        ) || []
      };

      await supabase
        .from('google_places_cache')
        .upsert(cacheData, { onConflict: 'google_place_id' });

    } catch (error) {
      console.error('Error caching Google place:', error);
    }
  }

  /**
   * Get place from google_places_cache
   */
  private async getPlaceFromCache(googlePlaceId: string): Promise<any | null> {
    try {
      const { data: place, error } = await supabase
        .from('google_places_cache')
        .select('*')
        .eq('google_place_id', googlePlaceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Update last_accessed if found
      if (place) {
        await supabase
          .from('google_places_cache')
          .update({ 
            last_accessed: new Date().toISOString(),
            access_count: (place.access_count || 0) + 1
          })
          .eq('google_place_id', googlePlaceId);
      }

      return place;
    } catch (error) {
      console.error('Error getting place from cache:', error);
      return null;
    }
  }

  /**
   * Fetch place from Google API and cache it
   */
  private async fetchAndCacheGooglePlace(googlePlaceId: string): Promise<any | null> {
    try {
      const url = `${this.baseUrl}/details/json`;
      const params = new URLSearchParams({
        place_id: googlePlaceId,
        key: this.apiKey,
        fields: 'place_id,name,formatted_address,geometry,types,rating,user_ratings_total,price_level,formatted_phone_number,international_phone_number,website,opening_hours,current_opening_hours,photos,reviews,business_status,plus_code'
      });

      console.log('🟢 GOOGLE API CALL: Place Details from Google Places API', {
        place_id: googlePlaceId,
        cost: '$0.017 per 1000 calls - PAID'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('❌ GOOGLE API ERROR:', { status: data.status, place_id: googlePlaceId });
        return null;
      }

      // Cache the result
      await this.cacheGooglePlace(data.result);
      
      // Return the cached place
      return await this.getPlaceFromCache(googlePlaceId);
    } catch (error) {
      console.error('Error fetching place from Google API:', error);
      return null;
    }
  }

  /**
   * Get cached nearby places from database
   */
  private async getCachedNearbyPlaces(location: Location, radius: number, type?: string): Promise<EnrichedPlace[]> {
    try {
      // Use PostGIS to find nearby places
      const radiusInMeters = radius;
      const point = `POINT(${location.longitude} ${location.latitude})`;
      
      let query = supabase
        .from('enriched_places')
        .select('*')
        .filter('business_status', 'eq', 'OPERATIONAL');

      // Add type filter if specified
      if (type) {
        query = query.contains('types', [type]);
      }

      // Note: For proper geospatial queries, you would use:
      // .rpc('nearby_places', { point, radius: radiusInMeters })
      // But for simplicity, we'll return recent cached places
      
      const { data: places, error } = await query
        .order('cached_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return places || [];
    } catch (error) {
      console.error('Error getting cached nearby places:', error);
      return [];
    }
  }

  /**
   * Convert cached place to PlaceDetails format
   */
  private convertCachedPlaceToDetails(cachedPlace: any): PlaceDetails {
    return {
      google_place_id: cachedPlace.google_place_id,
      name: cachedPlace.name,
      formatted_address: cachedPlace.formatted_address,
      geometry: cachedPlace.geometry,
      formatted_phone_number: cachedPlace.formatted_phone_number,
      international_phone_number: cachedPlace.international_phone_number,
      website: cachedPlace.website,
      opening_hours: cachedPlace.opening_hours,
      current_opening_hours: cachedPlace.current_opening_hours,
      price_level: cachedPlace.price_level,
      rating: cachedPlace.rating,
      user_ratings_total: cachedPlace.user_ratings_total,
      photos: cachedPlace.photos,
      photo_urls: cachedPlace.photo_urls,
      reviews: cachedPlace.reviews?.map((review: any) => ({
        author_name: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time
      })) || [],
      types: cachedPlace.types,
      business_status: cachedPlace.business_status,
      // Add computed coordinates for backwards compatibility
      coordinates: cachedPlace.geometry?.location ? 
        [cachedPlace.geometry.location.lng, cachedPlace.geometry.location.lat] : 
        [0, 0]
    };
  }

  /**
   * Cache autocomplete suggestions
   */
  private cacheAutocomplete(query: string, suggestions: PlaceSuggestion[]): void {
    this.autocompleteCache.set(query, {
      suggestions,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached autocomplete suggestions
   */
  private getCachedAutocomplete(query: string): PlaceSuggestion[] {
    const cached = this.autocompleteCache.get(query);
    if (cached && (Date.now() - cached.timestamp) < this.AUTOCOMPLETE_CACHE_DURATION) {
      return cached.suggestions;
    }
    return [];
  }
}

// Export singleton instance
export const placesService = new PlacesService();