import { supabase } from './supabase';
import { Place, Location } from '../types';

export class PlacesCacheService {
  private cacheExpiryHours = 24; // Cache places for 24 hours

  /**
   * Cache a place in the database
   */
  async cachePlace(place: Place): Promise<void> {
    try {
      const { error } = await supabase
        .from('places')
        .upsert({
          google_place_id: place.google_place_id,
          name: place.name,
          address: place.address, // Now allows null
          coordinates: `POINT(${place.coordinates[0]} ${place.coordinates[1]})`,
          place_type: place.place_type || 'establishment',
          price_level: place.price_level,
          bangkok_context: place.bangkok_context,
        }, {
          onConflict: 'google_place_id'
        });

      if (error) {
        console.error('Error caching place:', error);
      }
    } catch (error) {
      console.error('Exception caching place:', error);
    }
  }

  /**
   * Get a cached place by Google Place ID
   */
  async getCachedPlace(googlePlaceId: string): Promise<Place | null> {
    try {
      // Use raw SQL to get coordinates properly
      const { data, error } = await supabase.rpc('get_place_with_coordinates', {
        place_id: googlePlaceId,
        cutoff_time: new Date(Date.now() - this.cacheExpiryHours * 60 * 60 * 1000).toISOString()
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const place = data[0];
      return {
        id: place.id,
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        coordinates: [place.longitude || 0, place.latitude || 0],
        place_type: place.place_type,
        price_level: place.price_level,
        bangkok_context: place.bangkok_context,
      };
    } catch (error) {
      console.error('Error getting cached place:', error);
      return null;
    }
  }

  /**
   * Get cached places within a radius of a location
   */
  async getCachedNearbyPlaces(location: Location, radius: number, type?: string): Promise<Place[]> {
    try {
      // Use PostGIS function to find places within radius
      const { data, error } = await supabase.rpc('places_within_radius', {
        center_lat: location.latitude,
        center_lng: location.longitude,
        radius_meters: radius
      });

      if (error) {
        console.error('Error getting cached nearby places:', error);
        return [];
      }

      // Filter by cache expiry and type if specified
      const cutoffTime = new Date(Date.now() - this.cacheExpiryHours * 60 * 60 * 1000);
      const filteredData = (data || []).filter((place: any) => {
        const createdAt = new Date(place.created_at);
        const isRecent = createdAt >= cutoffTime;
        const matchesType = !type || (place.place_type && place.place_type.includes(type));
        return isRecent && matchesType;
      });

      return filteredData.map((place: any) => ({
        id: place.id,
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        coordinates: [place.longitude || 0, place.latitude || 0],
        place_type: place.place_type,
        price_level: place.price_level,
        bangkok_context: place.bangkok_context,
      }));
    } catch (error) {
      console.error('Error getting cached nearby places:', error);
      return [];
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    totalPlaces: number;
    recentPlaces: number;
    oldestPlace: string | null;
    newestPlace: string | null;
  }> {
    try {
      const { count: totalCount } = await supabase
        .from('places')
        .select('*', { count: 'exact', head: true });

      const cutoffTime = new Date(Date.now() - this.cacheExpiryHours * 60 * 60 * 1000);
      const { count: recentCount } = await supabase
        .from('places')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', cutoffTime.toISOString());

      const { data: oldestData } = await supabase
        .from('places')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      const { data: newestData } = await supabase
        .from('places')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        totalPlaces: totalCount || 0,
        recentPlaces: recentCount || 0,
        oldestPlace: oldestData?.created_at || null,
        newestPlace: newestData?.created_at || null,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalPlaces: 0,
        recentPlaces: 0,
        oldestPlace: null,
        newestPlace: null,
      };
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - this.cacheExpiryHours * 60 * 60 * 1000);
      const { count, error } = await supabase
        .from('places')
        .delete({ count: 'exact' })
        .lt('created_at', cutoffTime.toISOString());

      if (error) {
        console.error('Error clearing expired cache:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Exception clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Parse PostGIS POINT to coordinates array
   */
  private parseCoordinates(pointString: string | null | undefined): [number, number] {
    // Handle null/undefined coordinates
    if (!pointString || typeof pointString !== 'string') {
      return [0, 0];
    }
    
    // PostGIS returns POINT(lng lat) format
    const match = pointString.match(/POINT\(([^)]+)\)/);
    if (match) {
      const [lng, lat] = match[1].split(' ').map(Number);
      return [lng, lat];
    }
    return [0, 0];
  }
}

// Export singleton instance
export const placesCacheService = new PlacesCacheService(); 