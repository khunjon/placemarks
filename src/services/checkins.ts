import { supabase } from './supabase';
import { CheckIn, CheckInCreate, CheckInUpdate } from '../types/checkins';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export class CheckInsService {
  /**
   * Create a new check-in
   */
  async createCheckIn(checkInData: CheckInCreate): Promise<CheckIn> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload photos if provided
      let photoUrls: string[] = [];
      if (checkInData.photos && checkInData.photos.length > 0) {
        photoUrls = await this.uploadPhotos(checkInData.photos);
      }

      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          user_id: user.id,
          place_id: checkInData.place_id,
          rating: checkInData.rating,
          aspect_ratings: checkInData.aspect_ratings || {},
          tags: checkInData.tags || [],
          context: checkInData.context,
          photos: photoUrls,
          notes: checkInData.notes,
          weather_context: checkInData.weather_context,
          companion_type: checkInData.companion_type,
          meal_type: checkInData.meal_type,
          transportation_method: checkInData.transportation_method,
          visit_duration: checkInData.visit_duration,
          would_return: checkInData.would_return,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as CheckIn;
    } catch (error) {
      console.error('Error creating check-in:', error);
      throw error;
    }
  }

  /**
   * Update an existing check-in
   */
  async updateCheckIn(checkInId: string, updates: CheckInUpdate): Promise<CheckIn> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Handle photo updates if provided
      let photoUrls: string[] | undefined;
      if (updates.photos) {
        photoUrls = await this.uploadPhotos(updates.photos);
      }

      const updateData = {
        ...updates,
        ...(photoUrls && { photos: photoUrls }),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('check_ins')
        .update(updateData)
        .eq('id', checkInId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as CheckIn;
    } catch (error) {
      console.error('Error updating check-in:', error);
      throw error;
    }
  }

  /**
   * Get user's check-ins with pagination
   */
  async getUserCheckIns(limit: number = 20, offset: number = 0): Promise<CheckIn[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          *,
          places (
            id,
            name,
            address,
            google_place_id
          )
        `)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data as CheckIn[];
    } catch (error) {
      console.error('Error fetching user check-ins:', error);
      throw error;
    }
  }

  /**
   * Get check-ins for a specific place
   */
  async getPlaceCheckIns(placeId: string, limit: number = 10): Promise<CheckIn[]> {
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          *,
          users (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('place_id', placeId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as CheckIn[];
    } catch (error) {
      console.error('Error fetching place check-ins:', error);
      throw error;
    }
  }

  /**
   * Get a specific check-in by ID
   */
  async getCheckIn(checkInId: string): Promise<CheckIn | null> {
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          *,
          places (
            id,
            name,
            address,
            google_place_id
          )
        `)
        .eq('id', checkInId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as CheckIn;
    } catch (error) {
      console.error('Error fetching check-in:', error);
      throw error;
    }
  }

  /**
   * Delete a check-in
   */
  async deleteCheckIn(checkInId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get check-in to delete associated photos
      const checkIn = await this.getCheckIn(checkInId);
      if (checkIn && checkIn.photos.length > 0) {
        await this.deletePhotos(checkIn.photos);
      }

      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', checkInId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting check-in:', error);
      throw error;
    }
  }

  /**
   * Get check-in statistics for a user
   */
  async getUserCheckInStats(): Promise<{
    totalCheckIns: number;
    averageRating: number;
    favoritePlace: string | null;
    mostUsedTags: string[];
    checkInsByMonth: { month: string; count: number }[];
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get total check-ins and average rating
      const { data: statsData, error: statsError } = await supabase
        .from('check_ins')
        .select('rating, place_id, tags, timestamp')
        .eq('user_id', user.id);

      if (statsError) throw statsError;

      const totalCheckIns = statsData.length;
      const averageRating = totalCheckIns > 0 
        ? statsData.reduce((sum, checkIn) => sum + checkIn.rating, 0) / totalCheckIns 
        : 0;

      // Find most visited place
      const placeCounts = statsData.reduce((acc, checkIn) => {
        acc[checkIn.place_id] = (acc[checkIn.place_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const favoritePlace = Object.keys(placeCounts).length > 0
        ? Object.keys(placeCounts).reduce((a, b) => placeCounts[a] > placeCounts[b] ? a : b)
        : null;

      // Get most used tags
      const allTags = statsData.flatMap(checkIn => checkIn.tags || []);
      const tagCounts = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([tag]) => tag);

      // Check-ins by month (last 12 months)
      const checkInsByMonth = this.groupCheckInsByMonth(statsData);

      return {
        totalCheckIns,
        averageRating: Math.round(averageRating * 10) / 10,
        favoritePlace,
        mostUsedTags,
        checkInsByMonth,
      };
    } catch (error) {
      console.error('Error fetching check-in stats:', error);
      throw error;
    }
  }

  /**
   * Upload photos to Supabase Storage
   */
  private async uploadPhotos(photoUris: string[]): Promise<string[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const uploadPromises = photoUris.map(async (uri, index) => {
        // Compress and resize image
        const compressedImage = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Convert to blob
        const response = await fetch(compressedImage.uri);
        const blob = await response.blob();

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${user.id}/${timestamp}_${index}.jpg`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('check-in-photos')
          .upload(filename, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('check-in-photos')
          .getPublicUrl(data.path);

        return publicUrl;
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading photos:', error);
      throw error;
    }
  }

  /**
   * Delete photos from Supabase Storage
   */
  private async deletePhotos(photoUrls: string[]): Promise<void> {
    try {
      const filePaths = photoUrls.map(url => {
        const urlParts = url.split('/');
        return urlParts.slice(-2).join('/'); // Get user_id/filename.jpg
      });

      const { error } = await supabase.storage
        .from('check-in-photos')
        .remove(filePaths);

      if (error) {
        console.warn('Error deleting photos:', error);
        // Don't throw error for photo deletion failures
      }
    } catch (error) {
      console.warn('Error deleting photos:', error);
    }
  }

  /**
   * Group check-ins by month for statistics
   */
  private groupCheckInsByMonth(checkIns: any[]): { month: string; count: number }[] {
    const monthCounts = checkIns.reduce((acc, checkIn) => {
      const date = new Date(checkIn.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get last 12 months
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthCounts[monthKey] || 0,
      });
    }

    return months;
  }

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
}

// Export singleton instance
export const checkInsService = new CheckInsService(); 