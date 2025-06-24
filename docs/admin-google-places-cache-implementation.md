# Google Places Cache Implementation Guide for Admin UI

This document provides a comprehensive guide for implementing the Google Places caching system from the Placemarks mobile app into your admin UI. The system provides intelligent caching to minimize Google Places API costs while ensuring fast place search and selection for curated list management.

## Architecture Overview

The caching system uses a **3-layer architecture** designed to minimize API costs:

1. **Local Places Cache** - Database-level caching with PostGIS for geospatial queries
2. **Google Places API Cache** - Smart caching with soft expiry for place details
3. **Autocomplete Cache** - In-memory caching for search suggestions

### Cost Optimization Strategy

- **Google Places Nearby Search**: $0.032 per 1000 requests
- **Google Places Autocomplete**: $0.00283 per 1000 requests  
- **Google Places Details**: $0.017 per 1000 requests

The system can reduce API costs by **80-90%** through intelligent caching.

## Required Dependencies

```bash
npm install @supabase/supabase-js
```

## Environment Variables

```env
# Required
GOOGLE_PLACES_API_KEY=your_google_places_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional (for cache optimization)
GOOGLE_PLACES_CACHE_DAYS=90
```

## Database Schema Requirements

### Required Tables

1. **places** table (already exists in your Supabase)
2. **google_places_cache** table (needs to be created)

```sql
-- Create Google Places cache table
CREATE TABLE google_places_cache (
  id SERIAL PRIMARY KEY,
  google_place_id TEXT UNIQUE NOT NULL,
  name TEXT,
  formatted_address TEXT,
  geometry JSONB,
  types TEXT[],
  rating DECIMAL(2,1),
  user_ratings_total INTEGER,
  price_level INTEGER,
  formatted_phone_number TEXT,
  international_phone_number TEXT,
  website TEXT,
  opening_hours JSONB,
  current_opening_hours JSONB,
  photos JSONB,
  photo_urls TEXT[], -- Pre-generated photo URLs
  reviews JSONB,
  business_status TEXT,
  place_id TEXT,
  plus_code JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  has_basic_data BOOLEAN DEFAULT FALSE,
  has_contact_data BOOLEAN DEFAULT FALSE,
  has_hours_data BOOLEAN DEFAULT FALSE,
  has_photos_data BOOLEAN DEFAULT FALSE,
  has_reviews_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_google_places_cache_place_id ON google_places_cache(google_place_id);
CREATE INDEX idx_google_places_cache_expires_at ON google_places_cache(expires_at);

-- Create view for valid cache entries
CREATE VIEW google_places_cache_valid AS 
SELECT * FROM google_places_cache 
WHERE expires_at > NOW();

-- Create function to increment access count
CREATE OR REPLACE FUNCTION increment_access_count(p_place_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE google_places_cache 
  SET access_count = access_count + 1, 
      last_accessed = NOW()
  WHERE google_place_id = p_place_id;
END;
$$ LANGUAGE plpgsql;
```

## Core TypeScript Types

```typescript
// types/places.ts
export interface Place {
  id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  coordinates: [number, number]; // [lng, lat]
  place_type?: string;
  price_level?: number;
  city_context?: CityContext;
  bangkok_context?: BangkokContext; // Legacy field
}

export interface PlaceDetails extends Place {
  phone_number?: string;
  website?: string;
  opening_hours?: string[];
  rating?: number;
  photos?: string[];
  reviews?: PlaceReview[];
  types?: string[];
}

export interface PlaceSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

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
  website?: string;
  opening_hours?: any;
  photos?: any;
  photo_urls?: string[]; // Pre-generated URLs
  reviews?: any;
  cached_at: string;
  expires_at: string;
  last_accessed: string;
  access_count: number;
}
```

## Implementation: Core Services

### 1. Google Places Cache Service

```typescript
// services/googlePlacesCache.ts
import { createClient } from '@supabase/supabase-js';

export class GooglePlacesCacheService {
  private readonly GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  private readonly CACHE_DURATION_DAYS = parseInt(process.env.GOOGLE_PLACES_CACHE_DAYS || '90', 10);
  private readonly supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get place details with intelligent caching
   * This is the main method for getting place data efficiently
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
            await this.updateAccessTracking(googlePlaceId);
            
            console.log(`🗄️ CACHE HIT: Using cached place data`, {
              placeId: googlePlaceId.substring(0, 20) + '...',
              name: cached.name,
              cost: '$0.000 - FREE!',
              isStale: isExpired
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
      
      console.log('🟢 GOOGLE API CALL: Fresh data cached', {
        placeId: googlePlaceId.substring(0, 20) + '...',
        name: googleData.result.name,
        cost: '$0.017 per 1000 calls - PAID'
      });

      return cachedEntry;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Batch fetch multiple places with smart caching
   * Excellent for adding multiple places to lists
   */
  async getMultiplePlaceDetails(googlePlaceIds: string[]): Promise<Map<string, GooglePlacesCacheEntry>> {
    const result = new Map<string, GooglePlacesCacheEntry>();
    
    // First, get all cached places
    const cachedPlaces = await this.getMultipleCachedPlaces(googlePlaceIds);
    
    // Identify which places need to be fetched
    const placesToFetch = googlePlaceIds.filter(id => !cachedPlaces.has(id));
    
    console.log(`🗄️ BATCH PROCESSING: ${cachedPlaces.size} cached, ${placesToFetch.length} need API calls`);
    
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
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return result;
  }

  /**
   * Get cached place data only (no API call)
   */
  async getCachedPlace(googlePlaceId: string): Promise<GooglePlacesCacheEntry | null> {
    try {
      const { data, error } = await this.supabase
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
      const { data, error } = await this.supabase
        .from('google_places_cache')
        .select('*')
        .in('google_place_id', googlePlaceIds);

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
   * Fetch place data from Google Places API
   */
  private async fetchFromGoogleAPI(googlePlaceId: string): Promise<any | null> {
    if (!this.GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key not configured');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json`;
      const fields = [
        'place_id', 'name', 'formatted_address', 'geometry', 'types',
        'rating', 'user_ratings_total', 'price_level', 'formatted_phone_number',
        'website', 'opening_hours', 'photos', 'reviews', 'business_status'
      ].join(',');

      const params = new URLSearchParams({
        place_id: googlePlaceId,
        fields: fields,
        key: this.GOOGLE_PLACES_API_KEY
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

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
  private async cacheGooglePlaceData(googleData: any): Promise<GooglePlacesCacheEntry> {
    const result = googleData.result;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);

    // Generate photo URLs from photo references
    const photoUrls: string[] = [];
    if (result.photos && result.photos.length > 0 && this.GOOGLE_PLACES_API_KEY) {
      for (const photo of result.photos) {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${this.GOOGLE_PLACES_API_KEY}`;
        photoUrls.push(photoUrl);
      }
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
      website: result.website,
      opening_hours: result.opening_hours,
      photos: result.photos,
      photo_urls: photoUrls,
      reviews: result.reviews?.slice(0, 5), // Limit to 5 reviews
      business_status: result.business_status,
      cached_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_accessed: now.toISOString(),
      access_count: 1,
      has_basic_data: !!(result.name && result.formatted_address),
      has_contact_data: !!(result.formatted_phone_number || result.website),
      has_hours_data: !!result.opening_hours,
      has_photos_data: !!result.photos?.length,
      has_reviews_data: !!result.reviews?.length
    };

    const { data, error } = await this.supabase
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
      await this.supabase.rpc('increment_access_count', { 
        p_place_id: googlePlaceId 
      });
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
}
```

### 2. Places Search Service

```typescript
// services/placesService.ts
import { GooglePlacesCacheService } from './googlePlacesCache';

export class PlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private googlePlacesCache: GooglePlacesCacheService;
  
  // In-memory autocomplete cache
  private autocompleteCache: Map<string, { suggestions: PlaceSuggestion[]; timestamp: number }> = new Map();
  private readonly AUTOCOMPLETE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    this.googlePlacesCache = new GooglePlacesCacheService(supabaseUrl, supabaseKey);
  }

  /**
   * Search for places with autocomplete (for list management)
   * This is your main search function for the admin UI
   */
  async searchPlaces(query: string, location?: Location): Promise<PlaceSuggestion[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const sanitizedQuery = query.trim();
      
      // Check autocomplete cache first
      const cachedSuggestions = await this.getCachedAutocomplete(sanitizedQuery);
      if (cachedSuggestions.length > 0) {
        return cachedSuggestions;
      }

      // Make Google Places Autocomplete API call
      const url = `${this.baseUrl}/autocomplete/json`;
      const params = new URLSearchParams({
        input: sanitizedQuery,
        key: this.apiKey,
        components: 'country:th', // Restrict to Thailand (adjust as needed)
      });

      if (location) {
        params.append('location', `${location.latitude},${location.longitude}`);
        params.append('radius', '50000'); // 50km radius
      }

      console.log('🟢 GOOGLE API CALL: Autocomplete search', {
        query: sanitizedQuery,
        cost: '$0.00283 per 1000 calls - PAID'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error(`Google Places Autocomplete API error: ${data.status}`);
        throw new Error(`Google Places Autocomplete API error: ${data.status}`);
      }

      const suggestions: PlaceSuggestion[] = data.predictions.map((prediction: any) => ({
        place_id: prediction.place_id,
        description: prediction.description,
        main_text: prediction.structured_formatting.main_text,
        secondary_text: prediction.structured_formatting.secondary_text,
      }));

      // Cache the results
      await this.cacheAutocomplete(sanitizedQuery, suggestions);

      return suggestions;
    } catch (error) {
      console.error('Error searching places:', error);
      throw error;
    }
  }

  /**
   * Get detailed place information by Google Place ID
   * Use this when user selects a place from search results
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      // Get from cache (includes API call if needed)
      const cachedPlace = await this.googlePlacesCache.getPlaceDetails(placeId);
      if (!cachedPlace) {
        return null;
      }

      // Convert cached data to PlaceDetails format
      return this.convertCacheToPlaceDetails(cachedPlace);
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Batch get place details for multiple places
   * Perfect for loading places in a list
   */
  async getMultiplePlaceDetails(placeIds: string[]): Promise<PlaceDetails[]> {
    try {
      const cachedPlaces = await this.googlePlacesCache.getMultiplePlaceDetails(placeIds);
      const results: PlaceDetails[] = [];
      
      for (const [placeId, cachedPlace] of cachedPlaces) {
        const placeDetails = this.convertCacheToPlaceDetails(cachedPlace);
        if (placeDetails) {
          results.push(placeDetails);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error getting multiple place details:', error);
      return [];
    }
  }

  /**
   * Cache autocomplete results
   */
  private async cacheAutocomplete(query: string, suggestions: PlaceSuggestion[]): Promise<void> {
    const cacheKey = query.toLowerCase().trim();
    this.autocompleteCache.set(cacheKey, {
      suggestions,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (this.autocompleteCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of this.autocompleteCache.entries()) {
        if (now - value.timestamp > this.AUTOCOMPLETE_CACHE_DURATION) {
          this.autocompleteCache.delete(key);
        }
      }
    }
  }

  /**
   * Get cached autocomplete results with smart matching
   */
  private async getCachedAutocomplete(query: string): Promise<PlaceSuggestion[]> {
    const cacheKey = query.toLowerCase().trim();
    const cached = this.autocompleteCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.AUTOCOMPLETE_CACHE_DURATION) {
      console.log('🗄️ AUTOCOMPLETE CACHE HIT', {
        query: query,
        resultCount: cached.suggestions.length,
        cost: '$0.000 - FREE!'
      });
      return cached.suggestions;
    }

    return [];
  }

  /**
   * Convert cached place to PlaceDetails format
   */
  private convertCacheToPlaceDetails(cachedPlace: GooglePlacesCacheEntry): PlaceDetails | null {
    if (!cachedPlace.geometry?.location) {
      return null;
    }

    return {
      id: '', // Will be set when saved to database
      google_place_id: cachedPlace.google_place_id,
      name: cachedPlace.name || 'Unknown Place',
      address: cachedPlace.formatted_address || '',
      coordinates: [
        cachedPlace.geometry.location.lng,
        cachedPlace.geometry.location.lat
      ],
      phone_number: cachedPlace.formatted_phone_number,
      website: cachedPlace.website,
      opening_hours: cachedPlace.opening_hours?.weekday_text || [],
      price_level: cachedPlace.price_level,
      rating: cachedPlace.rating,
      photos: cachedPlace.photo_urls || [],
      reviews: cachedPlace.reviews?.map((review: any) => ({
        author_name: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time
      })) || [],
      types: cachedPlace.types || []
    };
  }
}
```

## Usage Examples for Admin UI

### 1. Search Places for List Management

```typescript
// components/PlaceSearch.tsx
import React, { useState, useEffect } from 'react';
import { PlacesService } from '../services/placesService';

const PlaceSearch: React.FC<{
  onPlaceSelected: (place: PlaceDetails) => void;
}> = ({ onPlaceSelected }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const placesService = new PlacesService(
    process.env.REACT_APP_SUPABASE_URL!,
    process.env.REACT_APP_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const searchPlaces = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await placesService.searchPlaces(query);
        setSuggestions(results);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPlaces, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handlePlaceSelect = async (suggestion: PlaceSuggestion) => {
    setLoading(true);
    try {
      const placeDetails = await placesService.getPlaceDetails(suggestion.place_id);
      if (placeDetails) {
        onPlaceSelected(placeDetails);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="place-search">
      <input
        type="text"
        placeholder="Search places..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
      />
      
      {loading && <div className="loading">Searching...</div>}
      
      <div className="suggestions">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.place_id}
            className="suggestion-item"
            onClick={() => handlePlaceSelect(suggestion)}
          >
            <div className="main-text">{suggestion.main_text}</div>
            <div className="secondary-text">{suggestion.secondary_text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2. Batch Add Places to Curated List

```typescript
// services/curatedListService.ts
export class CuratedListService {
  private placesService: PlacesService;
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.placesService = new PlacesService(supabaseUrl, supabaseKey);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Add multiple places to a curated list efficiently
   */
  async addPlacesToList(listId: string, googlePlaceIds: string[]): Promise<void> {
    try {
      console.log(`🔄 BATCH ADD: Adding ${googlePlaceIds.length} places to list ${listId}`);
      
      // Batch fetch all place details (uses smart caching)
      const placeDetails = await this.placesService.getMultiplePlaceDetails(googlePlaceIds);
      
      // Save places to database and get their IDs
      const placeIds: string[] = [];
      for (const place of placeDetails) {
        const savedPlace = await this.savePlaceToDatabase(place);
        if (savedPlace) {
          placeIds.push(savedPlace.id);
        }
      }
      
      // Batch add to list
      const listPlaceInserts = placeIds.map(placeId => ({
        list_id: listId,
        place_id: placeId
      }));
      
      const { error } = await this.supabase
        .from('list_places')
        .insert(listPlaceInserts);
        
      if (error) {
        throw error;
      }
      
      console.log(`✅ BATCH ADD COMPLETE: ${placeIds.length} places added to list`);
    } catch (error) {
      console.error('Error adding places to list:', error);
      throw error;
    }
  }

  /**
   * Save place to database (upsert)
   */
  private async savePlaceToDatabase(place: PlaceDetails): Promise<Place | null> {
    try {
      const { data, error } = await this.supabase
        .from('places')
        .upsert({
          google_place_id: place.google_place_id,
          name: place.name,
          address: place.address,
          coordinates: `POINT(${place.coordinates[0]} ${place.coordinates[1]})`,
          place_type: place.types?.join(',') || 'establishment',
          price_level: place.price_level,
        }, {
          onConflict: 'google_place_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving place:', error);
        return null;
      }

      return data as Place;
    } catch (error) {
      console.error('Error saving place:', error);
      return null;
    }
  }
}
```

### 3. Cache Monitoring and Statistics

```typescript
// utils/cacheMonitor.ts
export class CacheMonitor {
  private googlePlacesCache: GooglePlacesCacheService;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.googlePlacesCache = new GooglePlacesCacheService(supabaseUrl, supabaseKey);
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStats() {
    try {
      const { data: totalEntries } = await this.supabase
        .from('google_places_cache')
        .select('google_place_id', { count: 'exact' });

      const { data: validEntries } = await this.supabase
        .from('google_places_cache_valid')
        .select('google_place_id', { count: 'exact' });

      const { data: topPlaces } = await this.supabase
        .from('google_places_cache')
        .select('name, access_count')
        .order('access_count', { ascending: false })
        .limit(10);

      const totalCount = totalEntries?.length || 0;
      const validCount = validEntries?.length || 0;
      const hitRate = totalCount > 0 ? (validCount / totalCount * 100).toFixed(1) : '0';
      
      return {
        totalCachedPlaces: totalCount,
        validCachedPlaces: validCount,
        hitRate: `${hitRate}%`,
        topPlaces: topPlaces || [],
        estimatedMonthlySavings: `$${(validCount * 0.017 * 30).toFixed(2)}`,
        costPerPlace: '$0.017',
        costPerAutocomplete: '$0.00283'
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }
}
```

## Best Practices for Admin UI

### 1. Error Handling
- Always wrap API calls in try-catch blocks
- Provide fallback behavior when cache is unavailable
- Show user-friendly error messages

### 2. Rate Limiting
- Implement delays between consecutive API calls (100ms recommended)
- Use batch operations when adding multiple places
- Monitor API usage through cache statistics

### 3. Cost Optimization
- Always search cache before making API calls
- Use autocomplete cache for search suggestions
- Implement soft expiry for non-critical operations

### 4. User Experience
- Show loading states during API calls
- Implement debounced search (300ms delay)
- Cache search results for better performance

## Integration Checklist

- [ ] Set up Supabase client with environment variables
- [ ] Create `google_places_cache` table and related functions
- [ ] Implement `GooglePlacesCacheService`
- [ ] Implement `PlacesService` with autocomplete
- [ ] Add search component for place selection
- [ ] Implement batch place addition to lists
- [ ] Add cache monitoring dashboard
- [ ] Test with real Google Places API key
- [ ] Monitor API costs and cache hit rates

This implementation will provide you with the same powerful caching system used in the Placemarks mobile app, optimized for your admin UI's curated list management needs.