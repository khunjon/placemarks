import { Place, PlaceDetails, PlaceSuggestion, Location, PlaceSearchParams, BangkokContext } from '../types';
import { placesCacheService } from './placesCache';
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

// Mock data structure
const mockPlaces: PlaceRow[] = [
  {
    id: 'place-1',
    name: 'Chatuchak Weekend Market',
    type: 'shopping',
    description: 'Famous weekend market with thousands of stalls selling everything from clothes to food',
    address: 'Kamphaeng Phet 2 Rd, Chatuchak, Bangkok 10900',
    latitude: 13.7997,
    longitude: 100.5510,
    rating: 4.5,
    price_level: 2,
    bts_station: 'Mo Chit',
    is_open: true,
    opening_hours: 'Sat-Sun 9:00-18:00',
    phone: '+66 2 272 4813',
    website: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'place-2',
    name: 'Wat Pho Temple',
    type: 'temple',
    description: 'Historic Buddhist temple famous for its giant reclining Buddha statue',
    address: '2 Sanamchai Road, Grand Palace Subdistrict, Phra Nakhon District, Bangkok 10200',
    latitude: 13.7465,
    longitude: 100.4927,
    rating: 4.8,
    price_level: 1,
    is_open: true,
    opening_hours: 'Daily 8:00-18:30',
    phone: '+66 2 226 0335',
    website: 'https://www.watpho.com',
    bts_station: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'place-3',
    name: 'Café Tartine',
    type: 'cafe',
    description: 'Cozy French-style café with excellent coffee and pastries',
    address: '496/1 Ploenchit Rd, Lumpini, Pathumwan, Bangkok 10330',
    latitude: 13.7440,
    longitude: 100.5416,
    rating: 4.3,
    price_level: 3,
    bts_station: 'Ploenchit',
    is_open: true,
    opening_hours: 'Daily 7:00-22:00',
    phone: '+66 2 252 3804',
    website: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'place-4',
    name: 'Gaggan Anand',
    type: 'restaurant',
    description: 'Progressive Indian cuisine restaurant by celebrity chef Gaggan Anand',
    address: '68/1 Soi Langsuan, Ploenchit Rd, Lumpini, Pathumwan, Bangkok 10330',
    latitude: 13.7408,
    longitude: 100.5370,
    rating: 4.9,
    price_level: 4,
    bts_station: 'Ploenchit',
    is_open: false,
    opening_hours: 'Tue-Sun 18:00-23:00',
    phone: '+66 2 652 1700',
    website: 'https://www.gaggan.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'place-5',
    name: 'Lumpini Park',
    type: 'park',
    description: 'Large public park in the heart of Bangkok, perfect for jogging and relaxation',
    address: 'Rama IV Rd, Pathumwan, Bangkok 10330',
    latitude: 13.7307,
    longitude: 100.5418,
    rating: 4.4,
    price_level: 0,
    bts_station: 'Sala Daeng',
    is_open: true,
    opening_hours: 'Daily 4:30-21:00',
    phone: undefined,
    website: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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

      console.log('🔍 GOOGLE PLACES API: Nearby Search (PlacesService)', {
        url: `${url}?${params}`,
        location: `${location.latitude},${location.longitude}`,
        radius: radius,
        type: type || 'all'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      console.log('💾 GOOGLE PLACES API: Nearby Search (completed)', {
        status: data.status,
        resultCount: data.results?.length || 0,
        cost: '$0.032 per 1000 calls'
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

      console.log('🔍 GOOGLE PLACES API: Autocomplete', {
        url: `${url}?${params}`,
        query: query,
        location: location ? `${location.latitude},${location.longitude}` : 'none'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      console.log('💾 GOOGLE PLACES API: Autocomplete (completed)', {
        status: data.status,
        suggestionCount: data.predictions?.length || 0,
        cost: '$0.00283 per 1000 calls'
      });

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

      console.log('🔍 GOOGLE PLACES API: Place Details (PlacesService)', {
        url: `${url}?${params}`,
        placeId: placeId,
        fields: 'place_id,name,formatted_address,geometry,types,price_level,rating,photos,opening_hours,formatted_phone_number,website,reviews'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      console.log('💾 GOOGLE PLACES API: Place Details (completed)', {
        status: data.status,
        hasResult: !!data.result,
        cost: '$0.017 per 1000 calls'
      });

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
      types: place.place_type ? place.place_type.split(',') : [],
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

// Service functions (mock implementations)
export const placeService = {
  // Get nearby places
  async getNearbyPlaces(
    latitude: number, 
    longitude: number, 
    radius = 5, // km
    limit = 20
  ): Promise<NearbyPlace[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock distance calculation (simplified)
    const placesWithDistance = mockPlaces.map(place => {
      const distance = Math.sqrt(
        Math.pow(place.latitude - latitude, 2) + 
        Math.pow(place.longitude - longitude, 2)
      ) * 111; // Rough conversion to km
      
      return {
        ...place,
        distance: Math.round(distance * 10) / 10,
      };
    });
    
    return placesWithDistance
      .filter(place => place.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  },

  // Search places
  async searchPlaces(query: string, limit = 20): Promise<PlaceWithDistance[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const searchTerm = query.toLowerCase();
    const results = mockPlaces.filter(place => 
      place.name.toLowerCase().includes(searchTerm) ||
      place.type.toLowerCase().includes(searchTerm) ||
      (place.description && place.description.toLowerCase().includes(searchTerm)) ||
      (place.address && place.address.toLowerCase().includes(searchTerm))
    );
    
    return results.slice(0, limit).map(place => ({
      ...place,
      distance: `${Math.random() * 5 + 0.5}km`, // Mock distance
    }));
  },

  // Get place by ID
  async getPlaceById(id: string): Promise<PlaceRow | null> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return mockPlaces.find(place => place.id === id) || null;
  },

  // Get places by type
  async getPlacesByType(type: string, limit = 20): Promise<PlaceWithDistance[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const results = mockPlaces.filter(place => place.type === type);
    
    return results.slice(0, limit).map(place => ({
      ...place,
      distance: `${Math.random() * 3 + 0.2}km`, // Mock distance
    }));
  },

  // Get popular places
  async getPopularPlaces(limit = 10): Promise<PlaceWithDistance[]> {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // Sort by rating and return top places
    const popular = [...mockPlaces]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);
    
    return popular.map(place => ({
      ...place,
      distance: `${Math.random() * 4 + 0.3}km`, // Mock distance
    }));
  },

  // Create a new place
  async createPlace(place: PlaceInsert): Promise<PlaceRow> {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const newPlace: PlaceRow = {
      id: `place-${Date.now()}`,
      name: place.name,
      type: place.type,
      description: place.description || undefined,
      address: place.address || undefined,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating || undefined,
      price_level: place.price_level || undefined,
      bts_station: place.bts_station || undefined,
      is_open: place.is_open || undefined,
      opening_hours: place.opening_hours || undefined,
      phone: place.phone || undefined,
      website: place.website || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return newPlace;
  },

  // Update a place
  async updatePlace(id: string, updates: PlaceUpdate): Promise<PlaceRow> {
    await new Promise(resolve => setTimeout(resolve, 900));
    
    const existingPlace = mockPlaces.find(p => p.id === id);
    if (!existingPlace) {
      throw new PlaceError('Place not found', 'NOT_FOUND');
    }
    
    return {
      ...existingPlace,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  },

  // Delete a place
  async deletePlace(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const index = mockPlaces.findIndex(p => p.id === id);
    if (index === -1) {
      throw new PlaceError('Place not found', 'NOT_FOUND');
    }
    
    console.log(`Place ${id} deleted`);
  },

  // Get place statistics
  async getPlaceStats(): Promise<{
    totalPlaces: number;
    placesByType: Record<string, number>;
    averageRating: number;
    topRatedPlaces: PlaceRow[];
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const placesByType = mockPlaces.reduce((acc, place) => {
      acc[place.type] = (acc[place.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const ratingsSum = mockPlaces.reduce((sum, place) => sum + (place.rating || 0), 0);
    const averageRating = ratingsSum / mockPlaces.length;
    
    const topRatedPlaces = [...mockPlaces]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);
    
    return {
      totalPlaces: mockPlaces.length,
      placesByType,
      averageRating: Math.round(averageRating * 10) / 10,
      topRatedPlaces,
    };
  },

  // Get places with filters
  async getPlacesWithFilters(filters: {
    type?: string;
    priceLevel?: number;
    rating?: number;
    isOpen?: boolean;
    hasBtsStation?: boolean;
    limit?: number;
  }): Promise<PlaceWithDistance[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    let filtered = mockPlaces;
    
    if (filters.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }
    
    if (filters.priceLevel !== undefined) {
      filtered = filtered.filter(p => (p.price_level || 0) <= filters.priceLevel!);
    }
    
    if (filters.rating !== undefined) {
      filtered = filtered.filter(p => (p.rating || 0) >= filters.rating!);
    }
    
    if (filters.isOpen !== undefined) {
      filtered = filtered.filter(p => p.is_open === filters.isOpen);
    }
    
    if (filters.hasBtsStation) {
      filtered = filtered.filter(p => p.bts_station !== undefined);
    }
    
    const limit = filters.limit || 20;
    return filtered.slice(0, limit).map(place => ({
      ...place,
      distance: `${Math.random() * 3 + 0.1}km`, // Mock distance
    }));
  },
};

// Error types
export class PlaceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PlaceError';
  }
} 