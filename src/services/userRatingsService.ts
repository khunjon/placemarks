import { supabase } from './supabase';
import { EnrichedPlace } from '../types';

// Thumbs rating system type (matching checkInsService)
export type UserRatingType = 'thumbs_up' | 'thumbs_down' | 'neutral';

// User rating interface with Google Place ID
export interface UserPlaceRating {
  id: string;
  user_id: string;
  place_id: string; // Google Place ID
  rating_type: UserRatingType;
  rating_value?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Enriched user rating with place details
export interface EnrichedUserRating extends UserPlaceRating {
  place?: EnrichedPlace;
}

// Rating statistics interface
export interface UserRatingStats {
  totalRatings: number;
  thumbsUp: number;
  thumbsDown: number;
  neutral: number;
  averageScore: number; // 0-1 scale where thumbs_up = 1, neutral = 0.5, thumbs_down = 0
  topRatedPlaces: EnrichedPlace[];
}

// Error class for rating operations
export class RatingError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'RatingError';
    this.code = code;
  }
}

export class UserRatingsService {
  /**
   * Get user's rating for a specific place (using Google Place ID)
   */
  async getUserRating(userId: string, googlePlaceId: string): Promise<UserPlaceRating | null> {
    try {
      if (!googlePlaceId) {
        throw new RatingError('Google Place ID must be provided', 'INVALID_INPUT');
      }

      const { data: rating, error } = await supabase
        .from('user_place_ratings')
        .select('*')
        .eq('user_id', userId)
        .eq('place_id', googlePlaceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return rating || null;
    } catch (error) {
      console.error('Error getting user rating:', error);
      if (error instanceof RatingError) throw error;
      return null;
    }
  }

  /**
   * Set or update user's rating for a place (using Google Place ID)
   */
  async setUserRating(
    userId: string,
    googlePlaceId: string,
    ratingType: UserRatingType,
    options?: {
      ratingValue?: number;
      notes?: string;
    }
  ): Promise<UserPlaceRating> {
    try {
      if (!googlePlaceId) {
        throw new RatingError('Google Place ID must be provided', 'INVALID_INPUT');
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
        throw new RatingError('Place not found in cache. Please ensure place is cached first.', 'PLACE_NOT_FOUND');
      }

      const { data: rating, error } = await supabase
        .from('user_place_ratings')
        .upsert({
          user_id: userId,
          place_id: googlePlaceId,
          rating_type: ratingType,
          rating_value: options?.ratingValue || null,
          notes: options?.notes || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,place_id'
        })
        .select()
        .single();

      if (error) throw error;
      return rating;
    } catch (error) {
      console.error('Error setting user rating:', error);
      if (error instanceof RatingError) throw error;
      throw new RatingError('Failed to set user rating', 'SET_RATING_ERROR');
    }
  }

  /**
   * Remove user's rating for a place (using Google Place ID)
   */
  async removeUserRating(userId: string, googlePlaceId: string): Promise<void> {
    try {
      if (!googlePlaceId) {
        throw new RatingError('Google Place ID must be provided', 'INVALID_INPUT');
      }

      const { error } = await supabase
        .from('user_place_ratings')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', googlePlaceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing user rating:', error);
      if (error instanceof RatingError) throw error;
      throw new RatingError('Failed to remove user rating', 'REMOVE_RATING_ERROR');
    }
  }

  /**
   * Get all user ratings with enriched place data
   */
  async getUserRatings(userId: string, limit = 100): Promise<EnrichedUserRating[]> {
    try {
      const { data: ratings, error } = await supabase
        .from('user_place_ratings')
        .select(`
          id,
          user_id,
          place_id,
          rating_type,
          rating_value,
          notes,
          created_at,
          updated_at,
          enriched_places (
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
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const enrichedRatings: EnrichedUserRating[] = [];

      for (const rating of ratings || []) {
        const enrichedRating: EnrichedUserRating = {
          id: rating.id,
          user_id: rating.user_id,
          place_id: rating.place_id,
          rating_type: rating.rating_type as UserRatingType,
          rating_value: rating.rating_value,
          notes: rating.notes,
          created_at: rating.created_at,
          updated_at: rating.updated_at
        };

        // Add place data if available and operational
        if (rating.enriched_places) {
          const place = Array.isArray(rating.enriched_places)
            ? rating.enriched_places[0]
            : rating.enriched_places;

          if (place && place.business_status === 'OPERATIONAL') {
            enrichedRating.place = place as EnrichedPlace;
          }
        }

        enrichedRatings.push(enrichedRating);
      }

      return enrichedRatings;
    } catch (error) {
      console.error('Error getting user ratings:', error);
      throw new RatingError('Failed to get user ratings', 'GET_RATINGS_ERROR');
    }
  }

  /**
   * Get user rating statistics with enhanced analytics
   */
  async getUserRatingStats(userId: string): Promise<UserRatingStats> {
    try {
      const ratings = await this.getUserRatings(userId);
      
      const stats: UserRatingStats = {
        totalRatings: ratings.length,
        thumbsUp: 0,
        thumbsDown: 0,
        neutral: 0,
        averageScore: 0,
        topRatedPlaces: []
      };

      if (ratings.length > 0) {
        // Count rating types
        stats.thumbsUp = ratings.filter(r => r.rating_type === 'thumbs_up').length;
        stats.thumbsDown = ratings.filter(r => r.rating_type === 'thumbs_down').length;
        stats.neutral = ratings.filter(r => r.rating_type === 'neutral').length;

        // Calculate average score (0-1 scale)
        const scoreSum = ratings.reduce((sum, rating) => {
          switch (rating.rating_type) {
            case 'thumbs_up': return sum + 1;
            case 'neutral': return sum + 0.5;
            case 'thumbs_down': return sum + 0;
            default: return sum;
          }
        }, 0);
        stats.averageScore = scoreSum / ratings.length;

        // Get top rated places (thumbs up only)
        stats.topRatedPlaces = ratings
          .filter(r => r.rating_type === 'thumbs_up' && r.place)
          .slice(0, 10)
          .map(r => r.place!)
          .filter((place, index, self) => 
            // Remove duplicates by Google Place ID
            self.findIndex(p => p.google_place_id === place.google_place_id) === index
          );
      }

      return stats;
    } catch (error) {
      console.error('Error getting rating stats:', error);
      return {
        totalRatings: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        neutral: 0,
        averageScore: 0,
        topRatedPlaces: []
      };
    }
  }

  /**
   * Get ratings for multiple places (for recommendation system)
   */
  async getUserRatingsForPlaces(userId: string, googlePlaceIds: string[]): Promise<Map<string, UserRatingType>> {
    try {
      if (googlePlaceIds.length === 0) {
        return new Map();
      }

      const { data: ratings, error } = await supabase
        .from('user_place_ratings')
        .select('place_id, rating_type')
        .eq('user_id', userId)
        .in('place_id', googlePlaceIds);

      if (error) throw error;

      const ratingsMap = new Map<string, UserRatingType>();
      ratings?.forEach(rating => {
        ratingsMap.set(rating.place_id, rating.rating_type as UserRatingType);
      });

      return ratingsMap;
    } catch (error) {
      console.error('Error getting user ratings for places:', error);
      return new Map();
    }
  }

  /**
   * Get places rated by user with specific rating type
   */
  async getPlacesByRatingType(userId: string, ratingType: UserRatingType): Promise<string[]> {
    try {
      const { data: ratings, error } = await supabase
        .from('user_place_ratings')
        .select('place_id')
        .eq('user_id', userId)
        .eq('rating_type', ratingType)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return ratings?.map(r => r.place_id) || [];
    } catch (error) {
      console.error('Error getting places by rating type:', error);
      return [];
    }
  }

  /**
   * Bulk update ratings (for migration or bulk operations)
   */
  async bulkUpdateRatings(userId: string, ratings: Array<{
    googlePlaceId: string;
    ratingType: UserRatingType;
    notes?: string;
  }>): Promise<number> {
    try {
      let successCount = 0;

      for (const rating of ratings) {
        try {
          await this.setUserRating(userId, rating.googlePlaceId, rating.ratingType, {
            notes: rating.notes
          });
          successCount++;
        } catch (error) {
          console.warn('Failed to set rating for place:', rating.googlePlaceId, error);
          // Continue with other ratings
        }
      }

      return successCount;
    } catch (error) {
      console.error('Error in bulk update ratings:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const userRatingsService = new UserRatingsService(); 