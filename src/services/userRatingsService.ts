import { supabase } from './supabase';

export type UserRatingType = 'thumbs_up' | 'thumbs_down' | 'neutral';

export interface UserPlaceRating {
  id: string;
  user_id: string;
  place_id: string;
  rating_type: UserRatingType;
  rating_value?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class UserRatingsService {
  /**
   * Get user's rating for a specific place
   */
  async getUserRating(userId: string, placeId: string): Promise<UserPlaceRating | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_place_rating', {
        p_user_id: userId,
        p_place_id: placeId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user rating:', error);
      return null;
    }
  }

  /**
   * Set or update user's rating for a place
   */
  async setUserRating(
    userId: string, 
    placeId: string, 
    ratingType: UserRatingType,
    ratingValue?: number,
    notes?: string
  ): Promise<UserPlaceRating | null> {
    try {
      const { data, error } = await supabase.rpc('upsert_user_place_rating', {
        p_user_id: userId,
        p_place_id: placeId,
        p_rating_type: ratingType,
        p_rating_value: ratingValue,
        p_notes: notes
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error setting user rating:', error);
      throw error;
    }
  }

  /**
   * Remove user's rating for a place
   */
  async removeUserRating(userId: string, placeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_place_ratings')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing user rating:', error);
      throw error;
    }
  }

  /**
   * Get all user ratings with place details
   */
  async getUserRatings(userId: string): Promise<UserPlaceRating[]> {
    try {
      const { data, error } = await supabase
        .from('user_place_ratings')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user ratings:', error);
      return [];
    }
  }

  /**
   * Get rating statistics for a user
   */
  async getUserRatingStats(userId: string): Promise<{
    totalRatings: number;
    thumbsUp: number;
    thumbsDown: number;
    neutral: number;
  }> {
    try {
      const ratings = await this.getUserRatings(userId);
      
      return {
        totalRatings: ratings.length,
        thumbsUp: ratings.filter(r => r.rating_type === 'thumbs_up').length,
        thumbsDown: ratings.filter(r => r.rating_type === 'thumbs_down').length,
        neutral: ratings.filter(r => r.rating_type === 'neutral').length,
      };
    } catch (error) {
      console.error('Error getting rating stats:', error);
      return {
        totalRatings: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        neutral: 0,
      };
    }
  }
}

export const userRatingsService = new UserRatingsService(); 