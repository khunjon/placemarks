import { supabase } from './supabase';

export interface GooglePlacesCacheEntry {
  google_place_id: string;
  name?: string;
  formatted_address?: string;
  geometry?: any;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: any;
  current_opening_hours?: any;
  photos?: any;
  photo_urls?: string[]; // Pre-generated photo URLs
  reviews?: any;
  business_status?: string;
  place_id?: string;
  plus_code?: any;
  cached_at: string;
  expires_at: string;
  last_accessed: string;
  access_count: number;
  has_basic_data: boolean;
  has_contact_data: boolean;
  has_hours_data: boolean;
  has_photos_data: boolean;
  has_reviews_data: boolean;
  created_at: string;
  updated_at: string;
}

export interface GooglePlacesCacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  staleButUsableEntries: number;
  cacheDurationDays: number;
  topPlaces: Array<{ name: string; access_count: number }>;
}

export interface GooglePlacesCacheConfig {
  cacheDurationDays: number;
  staleCacheThresholdDays: number;
  softExpiryEnabled: boolean;
}

export interface GooglePlacesApiResponse {
  result: {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
      viewport?: any;
    };
    types: string[];
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    opening_hours?: any;
    current_opening_hours?: any;
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
      html_attributions: string[];
    }>;
    reviews?: any[];
    business_status?: string;
    plus_code?: any;
  };
  status: string;
}

class GooglePlacesCacheService {
  private readonly GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  private readonly CACHE_DURATION_DAYS = parseInt(process.env.EXPO_PUBLIC_GOOGLE_PLACES_CACHE_DAYS || '90', 10);
  private readonly DEFAULT_FIELDS = [
    'place_id',
    'name',
    'formatted_address',
    'geometry',
    'types',
    'rating',
    'user_ratings_total',
    'price_level',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'opening_hours',
    'current_opening_hours',
    'photos',
    'reviews',
    'business_status',
    'plus_code'
  ].join(',');

  /**
   * Get place details with intelligent caching and soft expiry
   * Checks cache first, fetches from Google API if needed
   * @param googlePlaceId - The Google Place ID
   * @param forceRefresh - Force refresh from API even if cached
   * @param allowStale - Allow stale cache for recommendations (soft expiry)
   */
  async getPlaceDetails(
    googlePlaceId: string, 
    forceRefresh = false, 
    allowStale = false
  ): Promise<GooglePlacesCacheEntry | null> {
    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = await this.getCachedPlace(googlePlaceId);
        if (cached) {
          const isExpired = this.isExpired(cached);
          
          // For recommendations, use stale data if available (soft expiry)
          if (allowStale || !isExpired) {
            // Update access tracking
            await this.updateAccessTracking(googlePlaceId);
            
            const cacheType = isExpired ? 'STALE CACHE' : 'CACHE HIT';
            console.log(`🗄️ DATABASE ${cacheType}: Retrieved from database cache`, {
              googlePlaceId: googlePlaceId.substring(0, 20) + '...',
              name: cached.name,
              cost: '$0.000 - FREE!',
              accessCount: cached.access_count + 1,
              cachedAt: cached.cached_at,
              isStale: isExpired,
              hasPhotoUrls: !!(cached.photo_urls && cached.photo_urls.length > 0)
            });
            
            return cached;
          }
        }
      }

      // Fetch fresh data from Google API
      const googleData = await this.fetchFromGoogleAPI(googlePlaceId);
      if (!googleData) {
        return null;
      }

      // Cache the fresh data
      const cachedEntry = await this.cacheGooglePlaceData(googleData);
      
      console.log('🟢 GOOGLE API CALL: Fresh data from Google Places API', {
        googlePlaceId: googlePlaceId.substring(0, 20) + '...',
        name: googleData.result.name,
        cost: '$0.017 per 1000 calls - PAID',
        hasPhotos: !!googleData.result.photos?.length,
        rating: googleData.result.rating,
        nowCached: true,
        photoUrlsGenerated: cachedEntry.photo_urls?.length || 0
      });

      return cachedEntry;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Get cached place data only (no API call)
   */
  async getCachedPlace(googlePlaceId: string): Promise<GooglePlacesCacheEntry | null> {
    try {
      const { data, error } = await supabase
        .from('google_places_cache')
        .select('*')
        .eq('google_place_id', googlePlaceId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as GooglePlacesCacheEntry;
    } catch (error) {
      console.error('Error getting cached place:', error);
      return null;
    }
  }

  /**
   * Check if multiple places are cached
   */
  async getMultipleCachedPlaces(googlePlaceIds: string[]): Promise<Map<string, GooglePlacesCacheEntry>> {
    const result = new Map<string, GooglePlacesCacheEntry>();
    
    if (googlePlaceIds.length === 0) {
      return result;
    }

    try {
      const { data, error } = await supabase
        .from('google_places_cache')
        .select('*')
        .in('google_place_id', googlePlaceIds)
        .gte('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error getting multiple cached places:', error);
        return result;
      }

      data?.forEach((place: GooglePlacesCacheEntry) => {
        result.set(place.google_place_id, place);
      });

      return result;
    } catch (error) {
      console.error('Error getting multiple cached places:', error);
      return result;
    }
  }

  /**
   * Batch fetch multiple places with smart caching
   */
  async getMultiplePlaceDetails(googlePlaceIds: string[]): Promise<Map<string, GooglePlacesCacheEntry>> {
    const result = new Map<string, GooglePlacesCacheEntry>();
    
    // First, get all cached places
    const cachedPlaces = await this.getMultipleCachedPlaces(googlePlaceIds);
    
    // Identify which places need to be fetched
    const placesToFetch = googlePlaceIds.filter(id => !cachedPlaces.has(id));
    
    console.log(`🗄️ BATCH CACHE CHECK: ${cachedPlaces.size} found in cache, ${placesToFetch.length} need Google API calls`);
    
    // Add cached places to result
    cachedPlaces.forEach((place, id) => {
      result.set(id, place);
    });

    // Fetch missing places with rate limiting
    for (const placeId of placesToFetch) {
      const place = await this.getPlaceDetails(placeId);
      if (place) {
        result.set(placeId, place);
      }
      
      // Rate limiting: wait 100ms between API calls
      if (placesToFetch.indexOf(placeId) < placesToFetch.length - 1) {
        console.log('⏱️ Rate limiting: Waiting 100ms before next Google API call...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return result;
  }

  /**
   * Fetch place data from Google Places API
   */
  private async fetchFromGoogleAPI(googlePlaceId: string): Promise<GooglePlacesApiResponse | null> {
    if (!this.GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key not configured');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json`;
      const params = new URLSearchParams({
        place_id: googlePlaceId,
        fields: this.DEFAULT_FIELDS,
        key: this.GOOGLE_PLACES_API_KEY
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json() as GooglePlacesApiResponse;

      if (data.status !== 'OK') {
        console.error(`Google Places API error: ${data.status}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching from Google Places API:', error);
      return null;
    }
  }

  /**
   * Cache Google Places data in Supabase
   */
  private async cacheGooglePlaceData(googleData: GooglePlacesApiResponse): Promise<GooglePlacesCacheEntry> {
    const result = googleData.result;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);

    // Generate photo URLs from photo references (if available)
    const photoUrls: string[] = [];
    if (result.photos && result.photos.length > 0 && this.GOOGLE_PLACES_API_KEY) {
      for (const photo of result.photos) {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${this.GOOGLE_PLACES_API_KEY}`;
        photoUrls.push(photoUrl);
      }
      
      console.log('🔗 PHOTO URLS GENERATED: Pre-generated photo URLs for database storage', {
        photoCount: photoUrls.length,
        googlePlaceId: result.place_id.substring(0, 20) + '...',
        benefit: 'No URL generation needed on future loads'
      });
    }

    const cacheEntry = {
      google_place_id: result.place_id,
      name: result.name,
      formatted_address: result.formatted_address,
      geometry: result.geometry,
      types: result.types,
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      price_level: result.price_level,
      formatted_phone_number: result.formatted_phone_number,
      international_phone_number: result.international_phone_number,
      website: result.website,
      opening_hours: result.opening_hours,
      current_opening_hours: result.current_opening_hours,
      photos: result.photos,
      photo_urls: photoUrls, // Store pre-generated URLs
      reviews: result.reviews?.slice(0, 5), // Limit to 5 reviews
      business_status: result.business_status,
      place_id: result.place_id,
      plus_code: result.plus_code,
      cached_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_accessed: now.toISOString(),
      access_count: 1,
      has_basic_data: !!(result.name && result.formatted_address && result.geometry),
      has_contact_data: !!(result.formatted_phone_number || result.website),
      has_hours_data: !!result.opening_hours,
      has_photos_data: !!result.photos?.length,
      has_reviews_data: !!result.reviews?.length
    };

    const { data, error } = await supabase
      .from('google_places_cache')
      .upsert(cacheEntry, { onConflict: 'google_place_id' })
      .select()
      .single();

    if (error) {
      console.error('Error caching Google Places data:', error);
      throw error;
    }

    return data as GooglePlacesCacheEntry;
  }

  /**
   * Update access tracking for a cached place
   */
  private async updateAccessTracking(googlePlaceId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_access_count', { 
        p_place_id: googlePlaceId 
      });

      if (error) {
        console.warn('Error updating access tracking:', error);
      }
    } catch (error) {
      console.warn('Error updating access tracking:', error);
    }
  }

  /**
   * Check if cached data is expired
   */
  private isExpired(cachedPlace: GooglePlacesCacheEntry): boolean {
    const expiresAt = new Date(cachedPlace.expires_at);
    return expiresAt < new Date();
  }

  /**
   * Check if cached data is stale but still usable for recommendations
   * Stale data is expired but within a reasonable timeframe for recommendations
   */
  private isStaleButUsable(cachedPlace: GooglePlacesCacheEntry): boolean {
    if (!this.isExpired(cachedPlace)) {
      return false; // Not expired, so not stale
    }
    
    // Consider data stale but usable if expired within the last 180 days (6 months)
    const expiresAt = new Date(cachedPlace.expires_at);
    const maxStaleTime = 180 * 24 * 60 * 60 * 1000; // 180 days in milliseconds
    const staleThreshold = new Date(expiresAt.getTime() + maxStaleTime);
    
    return new Date() < staleThreshold;
  }

  /**
   * Get cache statistics including soft expiry information
   */
  async getCacheStats(): Promise<GooglePlacesCacheStats> {
    try {
      const { data: totalData } = await supabase
        .from('google_places_cache')
        .select('google_place_id', { count: 'exact' });

      const { data: validData } = await supabase
        .from('google_places_cache_valid')
        .select('google_place_id', { count: 'exact' });

      // Get stale but usable entries (expired within last 180 days)
      const staleThreshold = new Date();
      staleThreshold.setDate(staleThreshold.getDate() - 180);
      
      const { data: staleData } = await supabase
        .from('google_places_cache')
        .select('google_place_id', { count: 'exact' })
        .lt('expires_at', new Date().toISOString())
        .gte('expires_at', staleThreshold.toISOString());

      const { data: topPlaces } = await supabase
        .from('google_places_cache')
        .select('name, access_count')
        .order('access_count', { ascending: false })
        .limit(10);

      const totalEntries = totalData?.length || 0;
      const validEntries = validData?.length || 0;
      const staleButUsableEntries = staleData?.length || 0;
      const expiredEntries = totalEntries - validEntries - staleButUsableEntries;

      return {
        totalEntries,
        validEntries,
        expiredEntries,
        staleButUsableEntries,
        cacheDurationDays: this.CACHE_DURATION_DAYS,
        topPlaces: topPlaces || []
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        staleButUsableEntries: 0,
        cacheDurationDays: this.CACHE_DURATION_DAYS,
        topPlaces: []
      };
    }
  }

  /**
   * Demonstrate cache vs API logging with soft expiry
   * This method shows the difference between cache hits, stale cache, and API calls
   */
  async demonstrateLogging(testPlaceId: string = 'ChIJDemo123456789'): Promise<void> {
    console.log('🎯 DEMO: Enhanced Cache with Soft Expiry Demonstration');
    console.log(`   Cache Duration: ${this.CACHE_DURATION_DAYS} days`);
    console.log('   🗄️ = Database cache (FREE)');
    console.log('   🗄️ STALE CACHE = Expired but usable for recommendations (FREE)');
    console.log('   🟢 = Google API calls (PAID)');
    console.log('');

    try {
      // First call - will be an API call (if not cached)
      console.log('📍 First call - expecting Google API call:');
      await this.getPlaceDetails(testPlaceId);

      // Second call - should be a cache hit
      console.log('\n📍 Second call - expecting cache hit:');
      await this.getPlaceDetails(testPlaceId);

      // Third call with soft expiry enabled (for recommendations)
      console.log('\n📍 Third call (with soft expiry for recommendations):');
      await this.getPlaceDetails(testPlaceId, false, true);

      // Fourth call with force refresh - will be an API call
      console.log('\n📍 Fourth call (force refresh) - expecting Google API call:');
      await this.getPlaceDetails(testPlaceId, true);

      console.log('\n✅ Demo completed! Notice the different log messages above.');
      console.log(`💡 Soft expiry allows using stale data for recommendations, reducing API costs.`);
    } catch (error) {
      console.log('ℹ️ Demo used test place ID - actual API calls would work with real place IDs');
    }
  }

  /**
   * Get cache configuration summary
   */
  getCacheConfig(): GooglePlacesCacheConfig {
    return {
      cacheDurationDays: this.CACHE_DURATION_DAYS,
      staleCacheThresholdDays: 180, // 6 months
      softExpiryEnabled: true,
    };
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredEntries(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('google_places_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('google_place_id');

      if (error) {
        console.error('Error clearing expired entries:', error);
        return 0;
      }

      const clearedCount = data?.length || 0;
      console.log(`🗄️ CACHE MAINTENANCE: Cleared ${clearedCount} expired entries from database`);
      return clearedCount;
    } catch (error) {
      console.error('Error clearing expired entries:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const googlePlacesCache = new GooglePlacesCacheService(); 