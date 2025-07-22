import { supabase } from './supabase';
import { UserPlacePhoto } from '../types';
import { cacheManager } from './cacheManager';
import * as ImageManipulator from 'expo-image-manipulator';

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

      // Generate optimized versions of the image
      const timestamp = Date.now();
      const baseFileName = `${googlePlaceId}-${timestamp}`;
      
      // Get original image info
      const originalImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Generate thumbnail (200x200)
      const thumbnail = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Generate display size (800x800)
      const displaySize = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 800, height: 800 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Upload all three versions
      const uploads = await Promise.all([
        // Original
        this.uploadImage(
          originalImage.uri,
          `${userId}/places/${baseFileName}-original.jpeg`,
          'image/jpeg'
        ),
        // Thumbnail
        this.uploadImage(
          thumbnail.uri,
          `${userId}/places/${baseFileName}-thumb.jpeg`,
          'image/jpeg'
        ),
        // Display
        this.uploadImage(
          displaySize.uri,
          `${userId}/places/${baseFileName}-display.jpeg`,
          'image/jpeg'
        ),
      ]);

      // Check if any uploads failed
      const failedUpload = uploads.find(result => result.error);
      if (failedUpload) {
        // Clean up any successful uploads
        const successfulPaths = uploads
          .filter(result => !result.error && result.path)
          .map(result => result.path!);
        if (successfulPaths.length > 0) {
          await supabase.storage.from('place-photos').remove(successfulPaths);
        }
        return { data: null, error: failedUpload.error };
      }

      // Get public URLs for all versions
      const [originalUrl, thumbnailUrl, displayUrl] = uploads.map(upload => {
        const { data } = supabase.storage
          .from('place-photos')
          .getPublicUrl(upload.path!);
        return data.publicUrl;
      });

      // Get original image dimensions (from the first manipulated image)
      const originalWidth = originalImage.width || 0;
      const originalHeight = originalImage.height || 0;

      // Create database record
      const { data: photoRecord, error: dbError } = await supabase
        .from('user_place_photos')
        .insert({
          user_id: userId,
          google_place_id: googlePlaceId,
          photo_url: originalUrl,
          thumbnail_url: thumbnailUrl,
          display_url: displayUrl,
          caption: caption,
          is_primary: isPrimary,
          original_width: originalWidth,
          original_height: originalHeight,
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded files if database insert fails
        const pathsToRemove = uploads.map(u => u.path!).filter(Boolean);
        await supabase.storage.from('place-photos').remove(pathsToRemove);
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
   * Get primary photos for multiple places efficiently
   * Used for displaying photos in list views
   */
  async getPrimaryPhotosForPlaces(googlePlaceIds: string[]): Promise<{ data: Map<string, UserPlacePhoto>; error: any }> {
    try {
      if (!googlePlaceIds.length) {
        return { data: new Map(), error: null };
      }

      // Fetch only primary photos or the most recent photo per place
      const { data, error } = await supabase
        .from('user_place_photos')
        .select('*')
        .in('google_place_id', googlePlaceIds)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching primary photos:', error);
        return { data: new Map(), error };
      }

      // Create a map of place ID to primary photo
      const photoMap = new Map<string, UserPlacePhoto>();
      
      if (data) {
        // Group by place ID and take the first (best) photo for each
        data.forEach(photo => {
          if (!photoMap.has(photo.google_place_id)) {
            photoMap.set(photo.google_place_id, photo);
          }
        });
      }

      return { data: photoMap, error: null };
    } catch (error: any) {
      console.error('Error in getPrimaryPhotosForPlaces:', error);
      return { data: new Map(), error };
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

      // Extract file paths from URLs and delete all versions from storage
      const urlsToDelete = [
        photo.photo_url,
        photo.thumbnail_url,
        photo.display_url
      ].filter(Boolean);

      const pathsToDelete: string[] = [];
      
      for (const photoUrl of urlsToDelete) {
        try {
          const url = new URL(photoUrl);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.indexOf('place-photos');
          if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            pathsToDelete.push(filePath);
          }
        } catch (urlError) {
          console.error('Failed to parse photo URL for deletion:', photoUrl, urlError);
        }
      }

      // Delete all file versions from storage
      if (pathsToDelete.length > 0) {
        try {
          const { error: storageError } = await supabase.storage
            .from('place-photos')
            .remove(pathsToDelete);

          if (storageError) {
            console.error('Failed to delete photos from storage:', storageError);
            // Don't throw - photo record is already deleted
          }
        } catch (error) {
          console.error('Failed to delete from storage:', error);
        }
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

  /**
   * Helper method to upload a single image file
   */
  private async uploadImage(
    uri: string,
    path: string,
    contentType: string
  ): Promise<{ path?: string; error?: any }> {
    try {
      // Create file object for React Native
      const file = {
        uri,
        type: contentType,
        name: path.split('/').pop() || 'photo.jpg',
      };

      const { data, error } = await supabase.storage
        .from('place-photos')
        .upload(path, file as any, {
          contentType,
          upsert: false,
        });

      if (error) {
        return { error };
      }

      return { path };
    } catch (error) {
      return { error };
    }
  }
}

// Export singleton instance
export const photoService = new PhotoService();