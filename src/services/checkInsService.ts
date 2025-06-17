import { supabase } from './supabase';
import { placesService } from './places';
import { Place, BangkokContext } from '../types';
import * as ImagePicker from 'expo-image-picker';

// Thumbs rating system type
export type ThumbsRating = 'thumbs_down' | 'neutral' | 'thumbs_up';

// CheckIn interface with simplified thumbs rating system
export interface CheckIn {
  id: string;
  user_id: string;
  place_id: string;
  timestamp: string;
  rating?: ThumbsRating; // Optional - can be added later
  comment?: string;
  photos?: string[];
  created_at: string;
  updated_at: string;
  // Relationships (when joined)
  place?: CheckInPlace;
}

// Place information for check-ins with district from Google Places API
export interface CheckInPlace {
  id: string;
  google_place_id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
  place_type: string;
  price_level?: number;
  district?: string; // Extracted from Google Places API address components
  bangkok_context?: BangkokContext;
}

// Google Places API address component interface
interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

// Google Places API result interface for place details
interface GooglePlaceDetailsResult {
  place_id: string;
  name: string;
  formatted_address: string;
  address_components: GoogleAddressComponent[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  price_level?: number;
  rating?: number;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
}

// Create check-in input interface
export interface CreateCheckInInput {
  place_id?: string; // For existing places
  google_place_id?: string; // For new places from Google Places API
  rating?: ThumbsRating; // Optional - can be added later
  comment?: string;
  photos?: string[];
}

// Update check-in input interface
export interface UpdateCheckInInput {
  rating?: ThumbsRating;
  comment?: string;
  photos?: string[];
}

// Check-in with place details for display
export interface CheckInWithPlace extends CheckIn {
  place: CheckInPlace;
}

// Grouped check-ins by date for history display
export interface CheckInsByDate {
  date: string; // YYYY-MM-DD format
  checkIns: CheckInWithPlace[];
}

// Check-in statistics
export interface CheckInStats {
  totalCheckIns: number;
  thumbsUp: number;
  neutral: number;
  thumbsDown: number;
  placesVisited: number;
  thisMonth: number;
  averageRating: number; // Converted from thumbs to numeric for stats
}

export class CheckInsService {
  private readonly GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  /**
   * Request camera permissions
   */
  async requestCameraPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  /**
   * Request media library permissions
   */
  async requestMediaLibraryPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  }

  /**
   * Get user's check-ins (for backward compatibility)
   */
  async getCheckIns(userId: string, limit = 50): Promise<{ data: CheckInWithPlace[] }> {
    try {
      const checkInsByDate = await this.getUserCheckInsByDate(userId, limit);
      const allCheckIns = checkInsByDate.flatMap(group => group.checkIns);
      return { data: allCheckIns };
    } catch (error) {
      console.error('Error getting check-ins:', error);
      throw error;
    }
  }

  /**
   * Get user's check-ins organized by date for history display
   * Updated to use optimized database function for better performance
   */
  async getUserCheckInsByDate(userId: string, limit = 50): Promise<CheckInsByDate[]> {
    try {
      // Use the optimized function to get check-ins with place data in a single query
      const { data: checkIns, error } = await supabase.rpc(
        'get_user_check_ins_optimized',
        { 
          user_uuid: userId,
          limit_count: limit,
          offset_count: 0
        }
      );

      if (error) throw error;

      // Group check-ins by date
      const groupedByDate = new Map<string, CheckInWithPlace[]>();

      for (const checkIn of checkIns || []) {
        // Use local date to avoid timezone issues
        const checkInDate = new Date(checkIn.check_in_timestamp);
        const date = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}-${String(checkInDate.getDate()).padStart(2, '0')}`;
        
        // Extract coordinates from PostGIS geometry
        let coordinates: [number, number] = [0, 0];
        if (checkIn.place_coordinates) {
          // Handle PostGIS POINT geometry - coordinates are stored as geometry type
          // For now, we'll use [0, 0] as placeholder - this would need proper PostGIS parsing
          coordinates = [0, 0];
        }
        
        const checkInWithPlace: CheckInWithPlace = {
          id: checkIn.check_in_id,
          user_id: checkIn.user_id,
          place_id: checkIn.place_id,
          timestamp: checkIn.check_in_timestamp,
          rating: checkIn.rating as ThumbsRating,
          comment: checkIn.comment,
          photos: checkIn.photos || [],
          created_at: checkIn.created_at,
          updated_at: checkIn.updated_at,
          place: {
            id: checkIn.place_id,
            google_place_id: checkIn.google_place_id,
            name: checkIn.place_name,
            address: checkIn.place_address,
            coordinates: coordinates,
            place_type: checkIn.place_type,
            price_level: checkIn.price_level,
            district: this.extractDistrictFromAddress(checkIn.place_address),
            bangkok_context: checkIn.bangkok_context
          }
        };

        if (!groupedByDate.has(date)) {
          groupedByDate.set(date, []);
        }
        groupedByDate.get(date)!.push(checkInWithPlace);
      }

      // Convert to array and sort by date (most recent first)
      const result: CheckInsByDate[] = Array.from(groupedByDate.entries())
        .map(([date, checkIns]) => ({
          date,
          checkIns: checkIns.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      return result;
    } catch (error) {
      console.error('Error getting user check-ins by date:', error);
      throw error;
    }
  }

  /**
   * Create a new check-in record
   */
  async createCheckIn(userId: string, input: CreateCheckInInput): Promise<CheckIn> {
    try {
      let placeId = input.place_id;

      // If no place_id provided, create place from Google Places API
      if (!placeId && input.google_place_id) {
        const place = await this.createPlaceFromGoogleId(input.google_place_id);
        placeId = place.id;
      }

      if (!placeId) {
        throw new CheckInError('Either place_id or google_place_id must be provided', 'INVALID_INPUT');
      }

      const { data: checkIn, error } = await supabase
        .from('check_ins')
        .insert({
          user_id: userId,
          place_id: placeId,
          rating: input.rating || null, // Direct string storage, no conversion needed
          comment: input.comment || null,
          photos: input.photos || [],
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: checkIn.id,
        user_id: checkIn.user_id,
        place_id: checkIn.place_id,
        timestamp: checkIn.timestamp,
        rating: checkIn.rating as ThumbsRating, // Direct string assignment
        comment: checkIn.comment,
        photos: checkIn.photos || [],
        created_at: checkIn.created_at,
        updated_at: checkIn.updated_at,
      };

    } catch (error) {
      console.error('Error creating check-in:', error);
      throw new CheckInError('Failed to create check-in', 'CREATE_ERROR');
    }
  }

  /**
   * Update an existing check-in
   */
  async updateCheckIn(checkInId: string, userId: string, updates: UpdateCheckInInput): Promise<CheckIn> {
    try {
      const updateData: any = {};
      
      if (updates.rating !== undefined) {
        updateData.rating = updates.rating; // Direct string storage
      }
      if (updates.comment !== undefined) {
        updateData.comment = updates.comment;
      }
      if (updates.photos !== undefined) {
        updateData.photos = updates.photos;
      }

      const { data: checkIn, error } = await supabase
        .from('check_ins')
        .update(updateData)
        .eq('id', checkInId)
        .eq('user_id', userId) // Ensure user can only update their own check-ins
        .select()
        .single();

      if (error) throw error;

      if (!checkIn) {
        throw new CheckInError('Check-in not found or access denied', 'NOT_FOUND');
      }

      return {
        id: checkIn.id,
        user_id: checkIn.user_id,
        place_id: checkIn.place_id,
        timestamp: checkIn.timestamp,
        rating: checkIn.rating as ThumbsRating, // Direct string assignment
        comment: checkIn.comment,
        photos: checkIn.photos || [],
        created_at: checkIn.created_at,
        updated_at: checkIn.updated_at,
      };

    } catch (error) {
      console.error('Error updating check-in:', error);
      throw new CheckInError('Failed to update check-in', 'UPDATE_ERROR');
    }
  }

  /**
   * Delete a check-in
   */
  async deleteCheckIn(checkInId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', checkInId)
        .eq('user_id', userId); // Ensure user can only delete their own check-ins

      if (error) throw error;

    } catch (error) {
      console.error('Error deleting check-in:', error);
      throw new CheckInError('Failed to delete check-in', 'DELETE_ERROR');
    }
  }

  /**
   * Get user's check-in statistics
   * Updated to use optimized database view for better performance
   */
  async getCheckInStats(userId: string): Promise<CheckInStats> {
    try {
      // Use enriched_check_ins view for better performance
      const { data: checkIns, error } = await supabase
        .from('enriched_check_ins')
        .select('rating, timestamp')
        .eq('user_id', userId);

      if (error) throw error;

      const stats: CheckInStats = {
        totalCheckIns: checkIns?.length || 0,
        thumbsUp: 0,
        neutral: 0,
        thumbsDown: 0,
        placesVisited: 0,
        thisMonth: 0,
        averageRating: 0,
      };

      if (!checkIns || checkIns.length === 0) {
        return stats;
      }

      // Get unique places count
      const { data: uniquePlaces, error: placesError } = await supabase
        .from('enriched_check_ins')
        .select('place_id')
        .eq('user_id', userId);

      if (!placesError && uniquePlaces) {
        const uniquePlaceIds = new Set(uniquePlaces.map(p => p.place_id));
        stats.placesVisited = uniquePlaceIds.size;
      }

      // Calculate rating statistics
      let totalRatingValue = 0;
      let ratedCheckIns = 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      for (const checkIn of checkIns) {
        // Count ratings
        if (checkIn.rating) {
          ratedCheckIns++;
          const ratingValue = this.thumbsToNumeric(checkIn.rating as ThumbsRating);
          totalRatingValue += ratingValue;

          switch (checkIn.rating) {
            case 'thumbs_up':
              stats.thumbsUp++;
              break;
            case 'neutral':
              stats.neutral++;
              break;
            case 'thumbs_down':
              stats.thumbsDown++;
              break;
          }
        }

        // Count this month's check-ins
        const checkInDate = new Date(checkIn.timestamp);
        if (checkInDate.getMonth() === currentMonth && checkInDate.getFullYear() === currentYear) {
          stats.thisMonth++;
        }
      }

      // Calculate average rating
      if (ratedCheckIns > 0) {
        stats.averageRating = totalRatingValue / ratedCheckIns;
      }

      return stats;
    } catch (error) {
      console.error('Error getting check-in stats:', error);
      throw new CheckInError('Failed to get check-in statistics', 'STATS_ERROR');
    }
  }

  /**
   * Get all check-ins for a specific place
   */
  async getPlaceCheckIns(placeId: string, limit = 10): Promise<CheckInWithPlace[]> {
    try {
      // Use enriched_check_ins view for better performance
      const { data: checkIns, error } = await supabase
        .from('enriched_check_ins')
        .select('*')
        .eq('place_id', placeId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (checkIns || []).map(checkIn => ({
        id: checkIn.id,
        user_id: checkIn.user_id,
        place_id: checkIn.place_id,
        timestamp: checkIn.timestamp,
        rating: checkIn.rating as ThumbsRating,
        comment: checkIn.comment,
        photos: checkIn.photos || [],
        created_at: checkIn.created_at,
        updated_at: checkIn.updated_at,
        place: {
          id: checkIn.place_id,
          google_place_id: checkIn.google_place_id,
          name: checkIn.place_name,
          address: checkIn.place_address,
          coordinates: [0, 0], // PostGIS geometry parsing would go here
          place_type: checkIn.place_type,
          price_level: checkIn.price_level,
          district: this.extractDistrictFromAddress(checkIn.place_address),
          bangkok_context: checkIn.bangkok_context
        }
      }));
    } catch (error) {
      console.error('Error getting place check-ins:', error);
      throw new CheckInError('Failed to get place check-ins', 'FETCH_ERROR');
    }
  }

  /**
   * Get comprehensive statistics for a specific place using optimized database function
   */
  async getPlaceCheckInStats(placeId: string): Promise<{
    placeId: string;
    totalCheckIns: number;
    uniqueVisitors: number;
    thumbsUpCount: number;
    thumbsDownCount: number;
    neutralCount: number;
    averageRating: number | null;
    mostRecentCheckIn: string | null;
  }> {
    try {
      const { data: stats, error } = await supabase.rpc(
        'get_place_check_in_stats',
        { place_uuid: placeId }
      );

      if (error) throw error;

      if (!stats || stats.length === 0) {
        return {
          placeId,
          totalCheckIns: 0,
          uniqueVisitors: 0,
          thumbsUpCount: 0,
          thumbsDownCount: 0,
          neutralCount: 0,
          averageRating: null,
          mostRecentCheckIn: null
        };
      }

      const stat = stats[0];
      return {
        placeId,
        totalCheckIns: Number(stat.total_check_ins),
        uniqueVisitors: Number(stat.unique_visitors),
        thumbsUpCount: Number(stat.thumbs_up_count),
        thumbsDownCount: Number(stat.thumbs_down_count),
        neutralCount: Number(stat.neutral_count),
        averageRating: stat.average_rating ? Number(stat.average_rating) : null,
        mostRecentCheckIn: stat.most_recent_check_in
      };
    } catch (error) {
      console.error('Error getting place check-in stats:', error);
      throw new CheckInError('Failed to get place statistics', 'STATS_ERROR');
    }
  }

  /**
   * Create a new place from Google Places API
   */
  private async createPlaceFromGoogleId(googlePlaceId: string): Promise<Place> {
    try {
      // Check if place already exists
      const { data: existingPlace } = await supabase
        .from('places')
        .select('*')
        .eq('google_place_id', googlePlaceId)
        .single();

      if (existingPlace) {
        return existingPlace;
      }

      // Fetch place details from Google Places API
      const placeDetails = await this.fetchGooglePlaceDetails(googlePlaceId);

      // Create new place record
      const { data: newPlace, error } = await supabase
        .from('places')
        .insert({
          google_place_id: placeDetails.place_id,
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          coordinates: `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})`,
          place_type: placeDetails.types.join(','),
          price_level: placeDetails.price_level,
          bangkok_context: await this.createBangkokContextFromGooglePlace(placeDetails),
        })
        .select()
        .single();

      if (error) throw error;

      return newPlace;

    } catch (error) {
      console.error('Error creating place from Google ID:', error);
      throw new CheckInError('Failed to create place from Google Places API', 'PLACE_CREATE_ERROR');
    }
  }

  /**
   * Fetch place details from Google Places API
   */
  private async fetchGooglePlaceDetails(placeId: string): Promise<GooglePlaceDetailsResult> {
    if (!this.GOOGLE_PLACES_API_KEY) {
      throw new CheckInError('Google Places API key not configured', 'API_KEY_MISSING');
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${this.GOOGLE_PLACES_API_KEY}&fields=place_id,name,formatted_address,address_components,geometry,types,price_level,rating,formatted_phone_number,website,opening_hours`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      return data.result;

    } catch (error) {
      console.error('Error fetching Google Place details:', error);
      throw new CheckInError('Failed to fetch place details from Google Places API', 'GOOGLE_API_ERROR');
    }
  }

  /**
   * Extract district from Google Places API address components
   */
  private extractDistrictFromGooglePlace(placeDetails: GooglePlaceDetailsResult): string | undefined {
    // Look for district/sublocality in address components
    const districtComponent = placeDetails.address_components.find(component =>
      component.types.includes('sublocality') ||
      component.types.includes('sublocality_level_1') ||
      component.types.includes('administrative_area_level_2')
    );

    return districtComponent?.long_name;
  }

  /**
   * Extract district from existing place data (fallback method)
   */
  private async extractDistrictFromPlace(place: any): Promise<string | undefined> {
    if (!place?.google_place_id) {
      // Try to extract from address string as fallback
      return this.extractDistrictFromAddress(place?.address);
    }

    try {
      // Fetch fresh data from Google Places API to get district
      const placeDetails = await this.fetchGooglePlaceDetails(place.google_place_id);
      return this.extractDistrictFromGooglePlace(placeDetails);
    } catch (error) {
      console.warn('Could not fetch district from Google Places API, using address fallback');
      return this.extractDistrictFromAddress(place?.address);
    }
  }

  /**
   * Extract district from address string (fallback method)
   */
  private extractDistrictFromAddress(address?: string): string | undefined {
    if (!address) return undefined;

    // Common Bangkok district patterns in addresses
    const districtPatterns = [
      /(\w+)\s+District/i,
      /District\s+(\w+)/i,
      /(Sukhumvit|Silom|Siam|Chatuchak|Thonglor|Ekkamai|Ari|Phrom\s*Phong|Asok|Ratchada)/i,
    ];

    for (const pattern of districtPatterns) {
      const match = address.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Create Bangkok context from Google Place details
   */
  private async createBangkokContextFromGooglePlace(placeDetails: GooglePlaceDetailsResult): Promise<BangkokContext> {
    const context: BangkokContext = {
      environment: 'indoor',
      location_type: 'building',
      bts_proximity: 'none',
      air_conditioning: true,
      noise_level: 'moderate',
      price_tier: 'casual',
    };

    const types = placeDetails.types;

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

    // Determine price tier based on Google's price_level
    if (placeDetails.price_level) {
      switch (placeDetails.price_level) {
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

  /**
   * Convert thumbs rating to numeric value for calculations (stats only)
   */
  private thumbsToNumeric(rating: ThumbsRating): number {
    switch (rating) {
      case 'thumbs_down': return 1;
      case 'neutral': return 2;
      case 'thumbs_up': return 3;
      default: return 2;
    }
  }
}

// Error class for check-in related errors
export class CheckInError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'CheckInError';
  }
}

// Export singleton instance
export const checkInsService = new CheckInsService();

// Export utility functions
export const checkInUtils = {
  /**
   * Format thumbs rating for display
   */
  formatRating(rating?: ThumbsRating): string {
    if (!rating) return '—'; // Em dash for no rating
    
    switch (rating) {
      case 'thumbs_up': return '👍';
      case 'thumbs_down': return '👎';
      case 'neutral': return '👌';
      default: return '—';
    }
  },

  /**
   * Get rating color for UI
   */
  getRatingColor(rating?: ThumbsRating): string {
    if (!rating) return '#9CA3AF'; // Gray for no rating
    
    switch (rating) {
      case 'thumbs_up': return '#4CAF50'; // Green
      case 'thumbs_down': return '#F44336'; // Red
      case 'neutral': return '#FF9800'; // Orange
      default: return '#9CA3AF';
    }
  },

  /**
   * Get category icon based on place types
   */
  getCategoryIcon(placeType?: string, types?: string[]): string {
    // Use types array if provided, otherwise fall back to single placeType
    const typesToCheck = types || (placeType ? [placeType] : []);
    
    // Check for specific types and return appropriate emoji
    if (typesToCheck.some(type => ['restaurant', 'meal_takeaway', 'meal_delivery'].includes(type))) {
      return '🍽️';
    }
    if (typesToCheck.some(type => ['cafe', 'bakery'].includes(type))) {
      return '☕';
    }
    if (typesToCheck.some(type => ['shopping_mall', 'store', 'clothing_store', 'electronics_store'].includes(type))) {
      return '🛍️';
    }
    if (typesToCheck.some(type => ['lodging', 'hotel'].includes(type))) {
      return '🏨';
    }
    if (typesToCheck.some(type => ['hospital', 'pharmacy', 'doctor'].includes(type))) {
      return '🏥';
    }
    if (typesToCheck.some(type => ['gas_station', 'car_repair'].includes(type))) {
      return '⛽';
    }
    if (typesToCheck.some(type => ['bank', 'atm', 'finance'].includes(type))) {
      return '🏦';
    }
    if (typesToCheck.some(type => ['gym', 'spa', 'beauty_salon'].includes(type))) {
      return '💪';
    }
    if (typesToCheck.some(type => ['tourist_attraction', 'museum', 'art_gallery'].includes(type))) {
      return '🎨';
    }
    if (typesToCheck.some(type => ['park', 'campground'].includes(type))) {
      return '🌳';
    }
    if (typesToCheck.some(type => ['school', 'university', 'library'].includes(type))) {
      return '🎓';
    }
    if (typesToCheck.some(type => ['church', 'hindu_temple', 'mosque', 'synagogue'].includes(type))) {
      return '⛪';
    }
    if (typesToCheck.some(type => ['night_club', 'bar'].includes(type))) {
      return '🍻';
    }
    if (typesToCheck.some(type => ['movie_theater', 'amusement_park'].includes(type))) {
      return '🎬';
    }
    
    // Default icon for other places
    return '📍';
  },

  /**
   * Format date for check-in history grouping
   */
  formatDateForGrouping(date: Date): string {
    // Use local date to avoid timezone issues
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  /**
   * Format date for display
   */
  formatDateForDisplay(dateString: string): string {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Compare using local date strings to avoid timezone issues
    const dateStr = date.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  },
};