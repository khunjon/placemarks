import { supabase } from './supabase';
import { EnrichedPlace } from '../types';
import { placesService } from './places';

// Thumbs rating system type
export type ThumbsRating = 'thumbs_down' | 'neutral' | 'thumbs_up';

// CheckIn interface with simplified thumbs rating system
export interface CheckIn {
  id: string;
  user_id: string;
  place_id: string; // Google Place ID
  timestamp: string;
  rating?: ThumbsRating;
  comment?: string;
  photos?: string[];
  tags?: string[];
  context?: any;
  weather_context?: any;
  companion_type?: string;
  meal_type?: string;
  transportation_method?: string;
  visit_duration?: number;
  would_return?: boolean;
  created_at: string;
  updated_at: string;
  // Relationships (when joined)
  place?: EnrichedPlace;
}

// Enriched CheckIn with place details
export interface CheckInWithPlace extends CheckIn {
  place?: EnrichedPlace;
}
export interface EnrichedCheckIn extends CheckIn {
  place: EnrichedPlace;
}

// Create check-in input interface
export interface CreateCheckInInput {
  place_id: string; // Google Place ID - primary identifier
  rating?: ThumbsRating;
  comment?: string;
  photos?: string[];
  tags?: string[];
  context?: any;
  weather_context?: any;
  companion_type?: string;
  meal_type?: string;
  transportation_method?: string;
  visit_duration?: number;
  would_return?: boolean;
}

// Update check-in input interface
export interface UpdateCheckInInput {
  rating?: ThumbsRating;
  comment?: string;
  photos?: string[];
  tags?: string[];
  context?: any;
  weather_context?: any;
  companion_type?: string;
  meal_type?: string;
  transportation_method?: string;
  visit_duration?: number;
  would_return?: boolean;
}

// Check-ins grouped by date for display
export interface CheckInsByDate {
  date: string;
  checkIns: EnrichedCheckIn[];
}

// Check-in statistics
export interface CheckInStats {
  totalCheckIns: number;
  uniquePlaces: number;
  averageRating: number;
  mostVisitedPlace: {
    place: EnrichedPlace;
    visitCount: number;
  } | null;
  recentActivity: EnrichedCheckIn[];
}

// Error class for check-in operations
export class CheckInError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'CheckInError';
    this.code = code;
  }
}

export class CheckInsService {
  /**
   * Create a new check-in record
   */
  async createCheckIn(userId: string, input: CreateCheckInInput): Promise<CheckIn> {
    try {
      const googlePlaceId = input.place_id;

      if (!googlePlaceId) {
        throw new CheckInError('place_id (Google Place ID) must be provided', 'INVALID_INPUT');
      }

      // Verify the place exists in google_places_cache
      const { data: existingPlace, error: placeError } = await supabase
        .from('google_places_cache')
        .select('google_place_id')
        .eq('google_place_id', googlePlaceId)
        .single();

      if (placeError && placeError.code !== 'PGRST116') {
        throw placeError;
      }

      if (!existingPlace) {
        // Attempt to get place details and cache it
        if (__DEV__) {
          console.log('Place not found in cache, attempting to fetch and cache:', googlePlaceId);
        }
        try {
          const placeDetails = await placesService.getPlaceDetails(googlePlaceId);
          if (!placeDetails) {
            console.error('getPlaceDetails returned null for place_id:', googlePlaceId);
            throw new CheckInError('Place not found in Google Places API', 'PLACE_NOT_FOUND');
          }
          // Cache the place (getPlaceDetails already caches it internally)
          if (__DEV__) {
            console.log('Successfully cached place for check-in:', googlePlaceId);
          }
        } catch (error) {
          console.error('Failed to fetch and cache place for check-in:', error);
          if (error instanceof CheckInError) {
            throw error;
          }
          throw new CheckInError('Unable to fetch place details. Please try again.', 'PLACE_FETCH_FAILED');
        }
      }

      const { data: checkIn, error } = await supabase
        .from('check_ins')
        .insert({
          user_id: userId,
          place_id: googlePlaceId,
          rating: input.rating || null,
          comment: input.comment || null,
          photos: input.photos || [],
          tags: input.tags || [],
          context: input.context || null,
          weather_context: input.weather_context || null,
          companion_type: input.companion_type || null,
          meal_type: input.meal_type || null,
          transportation_method: input.transportation_method || null,
          visit_duration: input.visit_duration || null,
          would_return: input.would_return || null,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: checkIn.id,
        user_id: checkIn.user_id,
        place_id: checkIn.place_id,
        timestamp: checkIn.timestamp,
        rating: checkIn.rating as ThumbsRating,
        comment: checkIn.comment,
        photos: checkIn.photos || [],
        tags: checkIn.tags || [],
        context: checkIn.context,
        weather_context: checkIn.weather_context,
        companion_type: checkIn.companion_type,
        meal_type: checkIn.meal_type,
        transportation_method: checkIn.transportation_method,
        visit_duration: checkIn.visit_duration,
        would_return: checkIn.would_return,
        created_at: checkIn.created_at,
        updated_at: checkIn.updated_at,
      };

    } catch (error) {
      console.error('Error creating check-in:', error);
      if (error instanceof CheckInError) throw error;
      throw new CheckInError('Failed to create check-in', 'CREATE_ERROR');
    }
  }

  /**
   * Update an existing check-in
   */
  async updateCheckIn(checkInId: string, userId: string, updates: UpdateCheckInInput): Promise<CheckIn> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      // Only include fields that are explicitly provided
      if (updates.rating !== undefined) updateData.rating = updates.rating;
      if (updates.comment !== undefined) updateData.comment = updates.comment;
      if (updates.photos !== undefined) updateData.photos = updates.photos;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.context !== undefined) updateData.context = updates.context;
      if (updates.weather_context !== undefined) updateData.weather_context = updates.weather_context;
      if (updates.companion_type !== undefined) updateData.companion_type = updates.companion_type;
      if (updates.meal_type !== undefined) updateData.meal_type = updates.meal_type;
      if (updates.transportation_method !== undefined) updateData.transportation_method = updates.transportation_method;
      if (updates.visit_duration !== undefined) updateData.visit_duration = updates.visit_duration;
      if (updates.would_return !== undefined) updateData.would_return = updates.would_return;

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
        rating: checkIn.rating as ThumbsRating,
        comment: checkIn.comment,
        photos: checkIn.photos || [],
        tags: checkIn.tags || [],
        context: checkIn.context,
        weather_context: checkIn.weather_context,
        companion_type: checkIn.companion_type,
        meal_type: checkIn.meal_type,
        transportation_method: checkIn.transportation_method,
        visit_duration: checkIn.visit_duration,
        would_return: checkIn.would_return,
        created_at: checkIn.created_at,
        updated_at: checkIn.updated_at,
      };

    } catch (error) {
      console.error('Error updating check-in:', error);
      if (error instanceof CheckInError) throw error;
      throw new CheckInError('Failed to update check-in', 'UPDATE_ERROR');
    }
  }

  /**
   * Get user's check-ins with enriched place data
   */
  async getUserCheckIns(userId: string, limit = 50, offset = 0): Promise<EnrichedCheckIn[]> {
    try {
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          user_id,
          place_id,
          timestamp,
          rating,
          comment,
          photos,
          tags,
          context,
          weather_context,
          companion_type,
          meal_type,
          transportation_method,
          visit_duration,
          would_return,
          created_at,
          updated_at,
          enriched_places!fk_check_ins_place_id (
            google_place_id,
            name,
            formatted_address,
            geometry,
            types,
            rating,
            price_level,
            formatted_phone_number,
            website,
            opening_hours,
            photo_urls,
            primary_image_url,
            display_description,
            is_featured,
            has_editorial_content,
            business_status
          )
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const enrichedCheckIns: EnrichedCheckIn[] = [];

      for (const checkIn of checkIns || []) {
        if (checkIn.enriched_places) {
          const place = Array.isArray(checkIn.enriched_places)
            ? checkIn.enriched_places[0]
            : checkIn.enriched_places;

          if (place && place.business_status === 'OPERATIONAL') {
            enrichedCheckIns.push({
              id: checkIn.id,
              user_id: checkIn.user_id,
              place_id: checkIn.place_id,
              timestamp: checkIn.timestamp,
              rating: checkIn.rating as ThumbsRating,
              comment: checkIn.comment,
              photos: checkIn.photos || [],
              tags: checkIn.tags || [],
              context: checkIn.context,
              weather_context: checkIn.weather_context,
              companion_type: checkIn.companion_type,
              meal_type: checkIn.meal_type,
              transportation_method: checkIn.transportation_method,
              visit_duration: checkIn.visit_duration,
              would_return: checkIn.would_return,
              created_at: checkIn.created_at,
              updated_at: checkIn.updated_at,
              place: place as EnrichedPlace
            });
          }
        }
      }

      return enrichedCheckIns;
    } catch (error) {
      console.error('Error getting user check-ins:', error);
      throw new CheckInError('Failed to get user check-ins', 'GET_CHECK_INS_ERROR');
    }
  }

  /**
   * Get user's check-ins organized by date for history display
   */
  async getUserCheckInsByDate(userId: string, limit = 50): Promise<CheckInsByDate[]> {
    try {
      const checkIns = await this.getUserCheckIns(userId, limit);
      
      // Group check-ins by date
      const groupedByDate = new Map<string, EnrichedCheckIn[]>();
      
      checkIns.forEach(checkIn => {
        const date = new Date(checkIn.timestamp).toDateString();
        if (!groupedByDate.has(date)) {
          groupedByDate.set(date, []);
        }
        groupedByDate.get(date)!.push(checkIn);
      });

      // Convert to array and sort by date (most recent first)
      const checkInsByDate: CheckInsByDate[] = Array.from(groupedByDate.entries())
        .map(([date, checkIns]) => ({
          date,
          checkIns: checkIns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return checkInsByDate;
    } catch (error) {
      console.error('Error getting check-ins by date:', error);
      throw new CheckInError('Failed to get check-ins by date', 'GET_CHECK_INS_BY_DATE_ERROR');
    }
  }

  /**
   * Get check-in details by ID
   */
  async getCheckInDetails(checkInId: string, userId?: string): Promise<EnrichedCheckIn | null> {
    try {
      let query = supabase
        .from('check_ins')
        .select(`
          id,
          user_id,
          place_id,
          timestamp,
          rating,
          comment,
          photos,
          tags,
          context,
          weather_context,
          companion_type,
          meal_type,
          transportation_method,
          visit_duration,
          would_return,
          created_at,
          updated_at,
          enriched_places!fk_check_ins_place_id (
            google_place_id,
            name,
            formatted_address,
            geometry,
            types,
            rating,
            price_level,
            formatted_phone_number,
            website,
            opening_hours,
            photo_urls,
            primary_image_url,
            display_description,
            is_featured,
            has_editorial_content,
            business_status
          )
        `)
        .eq('id', checkInId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: checkIn, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!checkIn || !checkIn.enriched_places) {
        return null;
      }

      const place = Array.isArray(checkIn.enriched_places)
        ? checkIn.enriched_places[0]
        : checkIn.enriched_places;

      if (!place || place.business_status !== 'OPERATIONAL') {
        return null;
      }

      return {
        id: checkIn.id,
        user_id: checkIn.user_id,
        place_id: checkIn.place_id,
        timestamp: checkIn.timestamp,
        rating: checkIn.rating as ThumbsRating,
        comment: checkIn.comment,
        photos: checkIn.photos || [],
        tags: checkIn.tags || [],
        context: checkIn.context,
        weather_context: checkIn.weather_context,
        companion_type: checkIn.companion_type,
        meal_type: checkIn.meal_type,
        transportation_method: checkIn.transportation_method,
        visit_duration: checkIn.visit_duration,
        would_return: checkIn.would_return,
        created_at: checkIn.created_at,
        updated_at: checkIn.updated_at,
        place: place as EnrichedPlace
      };

    } catch (error) {
      console.error('Error getting check-in details:', error);
      return null;
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
   * Get check-ins for a specific place
   */
  async getPlaceCheckIns(googlePlaceId: string, limit = 20): Promise<EnrichedCheckIn[]> {
    try {
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          user_id,
          place_id,
          timestamp,
          rating,
          comment,
          photos,
          tags,
          context,
          weather_context,
          companion_type,
          meal_type,
          transportation_method,
          visit_duration,
          would_return,
          created_at,
          updated_at,
          enriched_places!fk_check_ins_place_id (
            google_place_id,
            name,
            formatted_address,
            geometry,
            types,
            rating,
            price_level,
            formatted_phone_number,
            website,
            opening_hours,
            photo_urls,
            primary_image_url,
            display_description,
            is_featured,
            has_editorial_content,
            business_status
          )
        `)
        .eq('place_id', googlePlaceId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const enrichedCheckIns: EnrichedCheckIn[] = [];

      for (const checkIn of checkIns || []) {
        if (checkIn.enriched_places) {
          const place = Array.isArray(checkIn.enriched_places)
            ? checkIn.enriched_places[0]
            : checkIn.enriched_places;

          if (place) {
            enrichedCheckIns.push({
              id: checkIn.id,
              user_id: checkIn.user_id,
              place_id: checkIn.place_id,
              timestamp: checkIn.timestamp,
              rating: checkIn.rating as ThumbsRating,
              comment: checkIn.comment,
              photos: checkIn.photos || [],
              tags: checkIn.tags || [],
              context: checkIn.context,
              weather_context: checkIn.weather_context,
              companion_type: checkIn.companion_type,
              meal_type: checkIn.meal_type,
              transportation_method: checkIn.transportation_method,
              visit_duration: checkIn.visit_duration,
              would_return: checkIn.would_return,
              created_at: checkIn.created_at,
              updated_at: checkIn.updated_at,
              place: place as EnrichedPlace
            });
          }
        }
      }

      return enrichedCheckIns;
    } catch (error) {
      console.error('Error getting place check-ins:', error);
      throw new CheckInError('Failed to get place check-ins', 'GET_PLACE_CHECK_INS_ERROR');
    }
  }

  /**
   * Get user's check-in statistics
   */
  async getUserCheckInStats(userId: string): Promise<CheckInStats> {
    try {
      const checkIns = await this.getUserCheckIns(userId, 1000); // Get more for stats

      const stats: CheckInStats = {
        totalCheckIns: checkIns.length,
        uniquePlaces: 0,
        averageRating: 0,
        mostVisitedPlace: null,
        recentActivity: checkIns.slice(0, 5) // Most recent 5 check-ins
      };

      if (checkIns.length > 0) {
        // Count unique places
        const uniquePlaceIds = new Set(checkIns.map(c => c.place_id));
        stats.uniquePlaces = uniquePlaceIds.size;

        // Calculate average rating
        const ratingsWithValues = checkIns
          .filter(c => c.rating && c.rating !== 'neutral')
          .map(c => c.rating === 'thumbs_up' ? 1 : 0);
        
        if (ratingsWithValues.length > 0) {
          stats.averageRating = ratingsWithValues.reduce((sum: number, rating: number) => sum + rating, 0) / ratingsWithValues.length;
        }

        // Find most visited place
        const placeVisitCounts = new Map<string, { place: EnrichedPlace; count: number }>();
        
        checkIns.forEach(checkIn => {
          const existing = placeVisitCounts.get(checkIn.place_id);
          if (existing) {
            existing.count++;
          } else {
            placeVisitCounts.set(checkIn.place_id, {
              place: checkIn.place,
              count: 1
            });
          }
        });

        // Find the place with the most visits
        let mostVisited = null;
        let maxCount = 0;
        
        placeVisitCounts.forEach(({ place, count }) => {
          if (count > maxCount) {
            maxCount = count;
            mostVisited = { place, visitCount: count };
          }
        });

        stats.mostVisitedPlace = mostVisited;
      }

      return stats;
    } catch (error) {
      console.error('Error getting user check-in stats:', error);
      return {
        totalCheckIns: 0,
        uniquePlaces: 0,
        averageRating: 0,
        mostVisitedPlace: null,
        recentActivity: []
      };
    }
  }

  /**
   * Get recent check-ins across all users for a place (for place details screen)
   */
  async getRecentPlaceActivity(googlePlaceId: string, limit = 10): Promise<EnrichedCheckIn[]> {
    try {
      return await this.getPlaceCheckIns(googlePlaceId, limit);
    } catch (error) {
      console.error('Error getting recent place activity:', error);
      return [];
    }
  }

  /**
   * Check if user has checked in to a place
   */
  async hasUserCheckedInToPlace(userId: string, googlePlaceId: string): Promise<boolean> {
    try {
      const { data: checkIn, error } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', userId)
        .eq('place_id', googlePlaceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!checkIn;
    } catch (error) {
      console.error('Error checking if user has checked in to place:', error);
      return false;
    }
  }

  /**
   * Get user's last check-in at a specific place
   */
  async getUserLastCheckInAtPlace(userId: string, googlePlaceId: string): Promise<EnrichedCheckIn | null> {
    try {
      const { data: checkIn, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          user_id,
          place_id,
          timestamp,
          rating,
          comment,
          photos,
          tags,
          context,
          weather_context,
          companion_type,
          meal_type,
          transportation_method,
          visit_duration,
          would_return,
          created_at,
          updated_at,
          enriched_places!fk_check_ins_place_id (
            google_place_id,
            name,
            formatted_address,
            geometry,
            types,
            rating,
            price_level,
            formatted_phone_number,
            website,
            opening_hours,
            photo_urls,
            primary_image_url,
            display_description,
            is_featured,
            has_editorial_content,
            business_status
          )
        `)
        .eq('user_id', userId)
        .eq('place_id', googlePlaceId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!checkIn || !checkIn.enriched_places) {
        return null;
      }

      const place = Array.isArray(checkIn.enriched_places)
        ? checkIn.enriched_places[0]
        : checkIn.enriched_places;

      if (!place) {
        return null;
      }

      return {
        id: checkIn.id,
        user_id: checkIn.user_id,
        place_id: checkIn.place_id,
        timestamp: checkIn.timestamp,
        rating: checkIn.rating as ThumbsRating,
        comment: checkIn.comment,
        photos: checkIn.photos || [],
        tags: checkIn.tags || [],
        context: checkIn.context,
        weather_context: checkIn.weather_context,
        companion_type: checkIn.companion_type,
        meal_type: checkIn.meal_type,
        transportation_method: checkIn.transportation_method,
        visit_duration: checkIn.visit_duration,
        would_return: checkIn.would_return,
        created_at: checkIn.created_at,
        updated_at: checkIn.updated_at,
        place: place as EnrichedPlace
      };

    } catch (error) {
      console.error('Error getting user last check-in at place:', error);
      return null;
    }
  }
}

// Check-in utility functions
export const checkInUtils = {
  /**
   * Format a date string for display
   */
  formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Format dates for comparison in local timezone (YYYY-MM-DD)
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const dateStr = formatDate(date);
    const todayStr = formatDate(today);
    const yesterdayStr = formatDate(yesterday);

    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      // For other dates, show in a nice format
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  },

  /**
   * Format a thumbs rating for display
   */
  formatRating(rating: ThumbsRating | null | undefined): string {
    switch (rating) {
      case 'thumbs_up':
        return '👍';
      case 'thumbs_down':
        return '👎';
      case 'neutral':
        return '👌';
      default:
        return '—';
    }
  },

  /**
   * Get category icon for a place
   */
  getCategoryIcon(placeType?: string, types?: string[], placeName?: string): string {
    // If we have explicit place types from Google Places
    if (types && types.length > 0) {
      for (const type of types) {
        switch (type.toLowerCase()) {
          case 'restaurant':
          case 'food':
          case 'meal_takeaway':
          case 'meal_delivery':
            return '🍽️';
          case 'cafe':
          case 'bakery':
            return '☕';
          case 'bar':
          case 'night_club':
            return '🍺';
          case 'shopping_mall':
          case 'store':
          case 'clothing_store':
          case 'department_store':
            return '🛍️';
          case 'gym':
          case 'spa':
          case 'beauty_salon':
            return '💪';
          case 'hospital':
          case 'pharmacy':
          case 'doctor':
            return '🏥';
          case 'school':
          case 'university':
          case 'library':
            return '🎓';
          case 'bank':
          case 'atm':
          case 'finance':
            return '🏦';
          case 'gas_station':
          case 'car_repair':
            return '⛽';
          case 'lodging':
          case 'hotel':
            return '🏨';
          case 'tourist_attraction':
          case 'museum':
          case 'amusement_park':
            return '🎯';
          case 'park':
          case 'zoo':
            return '🌳';
          case 'church':
          case 'hindu_temple':
          case 'mosque':
          case 'synagogue':
            return '⛪';
          case 'movie_theater':
          case 'bowling_alley':
            return '🎬';
          case 'transit_station':
          case 'subway_station':
          case 'bus_station':
            return '🚇';
        }
      }
    }

    // Fall back to placeType if available
    if (placeType) {
      switch (placeType.toLowerCase()) {
        case 'restaurant':
        case 'food':
          return '🍽️';
        case 'cafe':
          return '☕';
        case 'bar':
          return '🍺';
        case 'shopping':
          return '🛍️';
        case 'fitness':
          return '💪';
        case 'healthcare':
          return '🏥';
        case 'education':
          return '🎓';
        case 'finance':
          return '🏦';
        case 'automotive':
          return '⛽';
        case 'lodging':
          return '🏨';
        case 'attraction':
          return '🎯';
        case 'park':
          return '🌳';
        case 'religious':
          return '⛪';
        case 'entertainment':
          return '🎬';
        case 'transit':
          return '🚇';
      }
    }

    // Default icon - no specific icon for unknown place types
    return '';
  },

  /**
   * Get color for a thumbs rating
   */
  getRatingColor(rating: ThumbsRating | null | undefined): string {
    switch (rating) {
      case 'thumbs_up':
        return '#10B981'; // Green
      case 'thumbs_down':
        return '#EF4444'; // Red
      case 'neutral':
      default:
        return '#6B7280'; // Gray
    }
  }
};

// Export singleton instance
export const checkInsService = new CheckInsService();