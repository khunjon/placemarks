import { supabase } from './supabase';
import { UserPlacePhoto } from '../types';
import { cacheManager } from './cacheManager';

export class PhotoService {
  /**
   * Upload a photo for a place
   */
  async uploadPlacePhoto(
    userId: string,
    googlePlaceId: string,
    imageUri: string,
    caption?: string,
    isPrimary: boolean = false
  ): Promise<{ data: UserPlacePhoto | null; error: any }> {
    try {
      // Check auth state
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // If setting as primary, unset any existing primary photos for this place/user
      if (isPrimary) {
        await this.unsetPrimaryPhoto(userId, googlePlaceId);
      }

      // Prepare file for upload
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExt === 'jpg' ? 'image/jpeg' : `image/${fileExt}`;
      const fileName = `${googlePlaceId}-${Date.now()}.jpeg`;
      const filePath = `${userId}/places/${fileName}`;

      // Create file object for React Native
      const file = {
        uri: imageUri,
        type: mimeType,
        name: fileName,
      };

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('place-photos')
        .upload(filePath, file as any, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { data: null, error: uploadError };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('place-photos')
        .getPublicUrl(filePath);

      // Create database record
      const { data: photoRecord, error: dbError } = await supabase
        .from('user_place_photos')
        .insert({
          user_id: userId,
          google_place_id: googlePlaceId,
          photo_url: urlData.publicUrl,
          caption: caption,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('place-photos').remove([filePath]);
        console.error('Database error:', dbError);
        return { data: null, error: dbError };
      }

      // Invalidate relevant caches
      await cacheManager.placeDetails.invalidate(googlePlaceId);

      return { data: photoRecord, error: null };
    } catch (error: any) {
      console.error('Photo upload error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all photos for a place
   */
  async getPlacePhotos(googlePlaceId: string): Promise<{ data: UserPlacePhoto[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_place_photos')
        .select('*')
        .eq('google_place_id', googlePlaceId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch place photos:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (error: any) {
      console.error('Failed to fetch place photos:', error);
      return { data: [], error };
    }
  }

  /**
   * Get photos uploaded by a specific user
   */
  async getUserPhotos(userId: string): Promise<{ data: UserPlacePhoto[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_place_photos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch user photos:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (error: any) {
      console.error('Failed to fetch user photos:', error);
      return { data: [], error };
    }
  }

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string, userId: string): Promise<{ error: any }> {
    try {
      // First get the photo to verify ownership and get the URL
      const { data: photo, error: fetchError } = await supabase
        .from('user_place_photos')
        .select('*')
        .eq('id', photoId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !photo) {
        return { error: new Error('Photo not found or access denied') };
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_place_photos')
        .delete()
        .eq('id', photoId)
        .eq('user_id', userId);

      if (dbError) {
        console.error('Failed to delete photo record:', dbError);
        return { error: dbError };
      }

      // Extract file path from URL and delete from storage
      try {
        const url = new URL(photo.photo_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.indexOf('place-photos');
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          const { error: storageError } = await supabase.storage
            .from('place-photos')
            .remove([filePath]);

          if (storageError) {
            console.error('Failed to delete photo from storage:', storageError);
            // Don't throw - photo record is already deleted
          }
        }
      } catch (urlError) {
        console.error('Failed to parse photo URL for deletion:', urlError);
      }

      // Invalidate relevant caches
      await cacheManager.placeDetails.invalidate(photo.google_place_id);

      return { error: null };
    } catch (error: any) {
      console.error('Delete photo error:', error);
      return { error };
    }
  }

  /**
   * Update photo details (caption, primary status)
   */
  async updatePhoto(
    photoId: string,
    userId: string,
    updates: { caption?: string; is_primary?: boolean }
  ): Promise<{ data: UserPlacePhoto | null; error: any }> {
    try {
      // Get the photo first to check ownership and get googlePlaceId
      const { data: existingPhoto, error: fetchError } = await supabase
        .from('user_place_photos')
        .select('*')
        .eq('id', photoId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingPhoto) {
        return { data: null, error: new Error('Photo not found or access denied') };
      }

      // If setting as primary, unset other primary photos
      if (updates.is_primary === true) {
        await this.unsetPrimaryPhoto(userId, existingPhoto.google_place_id);
      }

      // Update the photo
      const { data, error } = await supabase
        .from('user_place_photos')
        .update(updates)
        .eq('id', photoId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update photo:', error);
        return { data: null, error };
      }

      // Invalidate relevant caches
      await cacheManager.placeDetails.invalidate(existingPhoto.google_place_id);

      return { data, error: null };
    } catch (error: any) {
      console.error('Update photo error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get primary photo for a place (from any user)
   */
  async getPrimaryPhoto(googlePlaceId: string): Promise<{ data: UserPlacePhoto | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_place_photos')
        .select('*')
        .eq('google_place_id', googlePlaceId)
        .eq('is_primary', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        console.error('Failed to fetch primary photo:', error);
        return { data: null, error };
      }

      return { data: data || null, error: null };
    } catch (error: any) {
      console.error('Failed to fetch primary photo:', error);
      return { data: null, error };
    }
  }

  /**
   * Helper: Unset primary status for user's photos of a place
   */
  private async unsetPrimaryPhoto(userId: string, googlePlaceId: string): Promise<void> {
    await supabase
      .from('user_place_photos')
      .update({ is_primary: false })
      .eq('user_id', userId)
      .eq('google_place_id', googlePlaceId)
      .eq('is_primary', true);
  }
}

// Export singleton instance
export const photoService = new PhotoService();