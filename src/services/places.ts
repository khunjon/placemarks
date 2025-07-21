import { Place, EnrichedPlace, PlaceDetails, PlaceSuggestion, Location, PlaceSearchParams } from '../types';
import { supabase } from './supabase';
import { getPlaceTimezone } from '../utils/operatingHours';
import { ErrorFactory, ErrorLogger, safeAsync, withRetry, withTimeout, ErrorType } from '../utils/errorHandling';
import { CACHE_CONFIG } from '../config/cacheConfig';
import { config } from '../config/environment';

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
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  current_opening_hours?: any;
  utc_offset?: number;
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
  types?: string[]; // Place types from Google API
}

export class PlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private autocompleteCache: Map<string, { suggestions: PlaceSuggestion[]; timestamp: number }> = new Map();
  private readonly AUTOCOMPLETE_CACHE_DURATION = CACHE_CONFIG.PLACES_SERVICE.AUTOCOMPLETE_CACHE_DURATION_MS;

  constructor() {
    this.apiKey = config.googlePlacesApiKey;
    if (!this.apiKey) {
      ErrorLogger.log(
        ErrorFactory.config(
          'Google Places API key not configured',
          { service: 'places', operation: 'initialization' }
        )
      );
    }
  }

  /**
   * Search nearby places and cache results in google_places_cache
   */
  async searchNearbyPlaces(location: Location, radius: number, type?: string): Promise<EnrichedPlace[]> {
    const result = await safeAsync(async () => {
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

      // Make Google Places API request with retry and timeout
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

      const data = await withRetry(
        async () => {
          const response = await withTimeout(
            () => fetch(`${url}?${params}`),
            CACHE_CONFIG.TIMEOUTS.API_DEFAULT_MS,
            { service: 'places', operation: 'searchNearbyPlaces', metadata: { location, radius, type } }
          );
          
          if (!response.ok) {
            throw ErrorFactory.googlePlaces(
              `HTTP error: ${response.status} ${response.statusText}`,
              response.status.toString(),
              { service: 'places', operation: 'searchNearbyPlaces', metadata: { location, radius, type } }
            );
          }
          
          return response.json();
        },
        {
          maxRetries: 3,
          retryCondition: (error) => {
            // Retry on network errors and specific Google API errors
            if (error instanceof Error && error.message.includes('UNKNOWN_ERROR')) return true;
            if (error instanceof Error && error.message.includes('TIMEOUT')) return true;
            return false;
          }
        },
        { service: 'places', operation: 'searchNearbyPlaces' }
      );

      console.log('📊 API RESPONSE: Nearby Search completed', {
        status: data.status,
        resultCount: data.results?.length || 0,
        cost: '$0.032 per 1000 calls - PAID'
      });

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        const errorMessage = this.getGoogleAPIErrorMessage(data.status);
        throw ErrorFactory.googlePlaces(
          errorMessage,
          data.status,
          { service: 'places', operation: 'searchNearbyPlaces', metadata: { location, radius, type } }
        );
      }
      
      // Handle ZERO_RESULTS gracefully
      if (data.status === 'ZERO_RESULTS') {
        console.log('🔍 NO RESULTS: No nearby places found', { 
          location: `${location.latitude},${location.longitude}`,
          radius,
          type: type || 'all'
        });
        return [];
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
    }, { service: 'places', operation: 'searchNearbyPlaces', metadata: { location, radius, type } });
    return result || [];
  }

  /**
   * Get error message for Google API status codes
   */
  private getGoogleAPIErrorMessage(status: string): string {
    switch (status) {
      case 'ZERO_RESULTS':
        return 'No results found for this search';
      case 'NOT_FOUND':
        return 'Place not found - Place ID may be invalid or outdated';
      case 'INVALID_REQUEST':
        return 'Invalid request - Check parameters and API key permissions';
      case 'OVER_QUERY_LIMIT':
        return 'API quota exceeded - Daily or per-second limits reached';
      case 'REQUEST_DENIED':
        return 'Request denied - Check API key permissions and billing setup';
      case 'UNKNOWN_ERROR':
        return 'Server error - Temporary issue, retry may help';
      default:
        return `Google Places API error: ${status}`;
    }
  }

  /**
   * Get autocomplete suggestions with caching
   */
  async getPlaceAutocomplete(query: string, location?: Location): Promise<PlaceSuggestion[]> {
    const result = await safeAsync(async () => {
      // Validate input
      if (!query || typeof query !== 'string') {
        throw ErrorFactory.validation(
          'Invalid query provided to autocomplete',
          { service: 'places', operation: 'getPlaceAutocomplete', metadata: { query, type: typeof query } }
        );
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

      const data = await withTimeout(
        async () => {
          const response = await fetch(`${url}?${params}`);
          if (!response.ok) {
            throw ErrorFactory.network(
              `Autocomplete request failed: ${response.status}`,
              { service: 'places', operation: 'getPlaceAutocomplete', metadata: { query: sanitizedQuery } }
            );
          }
          return response.json();
        },
        CACHE_CONFIG.TIMEOUTS.API_AUTOCOMPLETE_MS,
        { service: 'places', operation: 'getPlaceAutocomplete' }
      );

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        const errorMessage = this.getGoogleAPIErrorMessage(data.status);
        throw ErrorFactory.googlePlaces(
          errorMessage,
          data.status,
          { service: 'places', operation: 'getPlaceAutocomplete', metadata: { query: sanitizedQuery } }
        );
      }
      
      // Handle ZERO_RESULTS gracefully
      if (data.status === 'ZERO_RESULTS') {
        console.log('🔍 NO RESULTS: No autocomplete suggestions found', { query: sanitizedQuery });
        return [];
      }

      const suggestions: PlaceSuggestion[] = data.predictions.map((prediction: GoogleAutocompleteResult) => ({
        place_id: prediction.place_id,
        description: prediction.description,
        main_text: prediction.structured_formatting.main_text,
        secondary_text: prediction.structured_formatting.secondary_text,
        types: prediction.types || [], // Include place types from API
      }));

      // Cache suggestions
      this.cacheAutocomplete(sanitizedQuery, suggestions);

      console.log('📝 AUTOCOMPLETE SUCCESS:', { query: sanitizedQuery, resultCount: suggestions.length });
      return suggestions;
    }, { service: 'places', operation: 'getPlaceAutocomplete', metadata: { query, location } });
    return result || [];
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
   * Check if a cached place has complete data for list addition
   */
  private isPlaceDataComplete(cachedPlace: any): boolean {
    if (!cachedPlace) return false;
    
    // Check essential fields for a complete place record
    const hasBasicData = cachedPlace.name && cachedPlace.formatted_address && cachedPlace.geometry;
    const hasDetailedData = cachedPlace.has_contact_data && cachedPlace.has_hours_data;
    
    // For list addition, we want contact info (phone/website) and hours when available
    // Some places legitimately don't have websites or phones, so we check the flags
    return hasBasicData && (
      // Either has contact data or the API confirmed there's no contact data
      (cachedPlace.formatted_phone_number || cachedPlace.website || cachedPlace.has_contact_data) &&
      // Either has hours data or the API confirmed there are no hours
      (cachedPlace.opening_hours || cachedPlace.has_hours_data)
    );
  }

  /**
   * Get place details from cache or fetch from Google API
   * @param forceRefresh - If true, bypass cache even if place exists but has incomplete data
   */
  async getPlaceDetails(googlePlaceId: string, forceRefresh: boolean = false): Promise<PlaceDetails | null> {
    try {
      // First try to get from cache
      let place = await this.getPlaceFromCache(googlePlaceId);
      
      if (!place || forceRefresh || !this.isPlaceDataComplete(place)) {
        // If not in cache, force refresh requested, or data is incomplete, fetch from Google Places API
        if (place && !this.isPlaceDataComplete(place)) {
          console.log('🔄 CACHE REFRESH: Place has incomplete data, fetching detailed info', {
            googlePlaceId,
            hasContactData: place.has_contact_data,
            hasHoursData: place.has_hours_data,
            cost: '$0.017 per 1000 calls - PAID'
          });
        }
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
        photos: googleResult.photos?.slice(0, 1),
        reviews: googleResult.reviews,
        business_status: googleResult.business_status || 'OPERATIONAL',
        plus_code: googleResult.plus_code,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + CACHE_CONFIG.PLACES_SERVICE.PLACES_CACHE_EXPIRY_MS).toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1,
        has_basic_data: true,
        has_contact_data: !!(googleResult.formatted_phone_number || googleResult.website),
        has_hours_data: !!googleResult.opening_hours,
        has_photos_data: !!(googleResult.photos && googleResult.photos.length > 0),
        has_reviews_data: !!(googleResult.reviews && googleResult.reviews.length > 0),
        photo_urls: googleResult.photos?.slice(0, 1).map(photo => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`
        ) || []
      };

      const { error: upsertError } = await supabase
        .from('google_places_cache')
        .upsert(cacheData, { onConflict: 'google_place_id' });

      if (upsertError) {
        console.error('Error caching Google place:', upsertError);
        throw upsertError;
      }

    } catch (error) {
      console.error('Error caching Google place:', error);
      throw error;
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
    return safeAsync(async () => {
      const url = `${this.baseUrl}/details/json`;
      const params = new URLSearchParams({
        place_id: googlePlaceId,
        key: this.apiKey,
        fields: 'place_id,name,formatted_address,geometry,types,rating,user_ratings_total,price_level,formatted_phone_number,international_phone_number,website,opening_hours,current_opening_hours,utc_offset,photos,reviews,business_status,plus_code'
      });

      console.log('🟢 GOOGLE API CALL: Place Details from Google Places API', {
        place_id: googlePlaceId,
        cost: '$0.017 per 1000 calls - PAID'
      });

      const data = await withRetry(
        async () => {
          const response = await withTimeout(
            () => fetch(`${url}?${params}`),
            CACHE_CONFIG.TIMEOUTS.API_DEFAULT_MS,
            { service: 'places', operation: 'fetchPlaceDetails', metadata: { googlePlaceId } }
          );
          
          if (!response.ok) {
            ErrorLogger.log(
              ErrorFactory.googlePlaces(
                `HTTP error: ${response.status} ${response.statusText}`,
                response.status.toString(),
                { service: 'places', operation: 'fetchPlaceDetails', metadata: { googlePlaceId } }
              )
            );
            throw ErrorFactory.network(
              `Failed to fetch place details: ${response.status}`,
              { service: 'places', operation: 'fetchPlaceDetails', metadata: { googlePlaceId } }
            );
          }
          
          return response.json();
        },
        {
          maxRetries: 3,
          retryCondition: (error) => {
            if (error instanceof Error && error.message.includes('UNKNOWN_ERROR')) return true;
            if (error instanceof Error && error.message.includes('TIMEOUT')) return true;
            return false;
          }
        },
        { service: 'places', operation: 'fetchPlaceDetails' }
      );

      if (data.status !== 'OK') {
        const errorMessage = this.getGoogleAPIErrorMessage(data.status);
        ErrorLogger.log(
          ErrorFactory.googlePlaces(
            errorMessage,
            data.status,
            { 
              service: 'places', 
              operation: 'fetchPlaceDetails', 
              metadata: { 
                googlePlaceId,
                errorMessage: data.error_message,
                cost: '$0.017 per 1000 calls - PAID (but failed)'
              } 
            }
          )
        );
        return null;
      }

      console.log('📍 PLACE DETAILS SUCCESS: Place details fetched successfully', {
        place_id: googlePlaceId,
        place_name: data.result?.name || 'Unknown',
        has_phone: !!data.result?.formatted_phone_number,
        has_website: !!data.result?.website,
        has_hours: !!data.result?.opening_hours,
        cost: '$0.017 per 1000 calls - PAID'
      });

      // Cache the result
      await this.cacheGooglePlace(data.result);
      
      // Return the cached place
      return await this.getPlaceFromCache(googlePlaceId);
    }, { service: 'places', operation: 'fetchPlaceDetails', metadata: { googlePlaceId } }, null, false);
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