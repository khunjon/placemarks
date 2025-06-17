import { supabase } from './supabase';
import { User } from '../types';

export class ProfileService {
  /**
   * Get user profile with preferences
   */
  async getUserProfile(userId: string): Promise<{ data: User | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('getUserProfile error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('getUserProfile exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: any): Promise<{ error: any }> {
    try {
      // Build update object with only defined values
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.full_name !== undefined) {
        updateData.full_name = updates.full_name;
      }
      
      if (updates.avatar_url !== undefined) {
        updateData.avatar_url = updates.avatar_url;
      }
      
      if (updates.preferences !== undefined) {
        updateData.preferences = updates.preferences;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Profile update error:', error);
      }

      return { error };
    } catch (error) {
      console.error('Profile update exception:', error);
      return { error };
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: any): Promise<{ error: any }> {
    try {
      // Get current preferences first
      const { data: currentUser } = await this.getUserProfile(userId);
      
      const updatedPreferences = {
        ...currentUser?.preferences,
        ...preferences,
      };

      const { error } = await supabase
        .from('users')
        .update({
          preferences: updatedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Upload avatar image to Supabase Storage
   */
  async uploadAvatar(userId: string, imageUri: string): Promise<{ data: string | null; error: any }> {
    try {
      // Check current auth state
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth check failed:', authError);
        return { data: null, error: new Error('User not authenticated') };
      }
      
      // For React Native, we need to handle file uploads correctly
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExt === 'jpg' ? 'image/jpeg' : `image/${fileExt}`;
      const fileName = `${userId}-${Date.now()}.jpeg`; // Always use .jpeg extension
      const filePath = `avatars/${fileName}`;

      // Create a file object for React Native
      const file = {
        uri: imageUri,
        type: mimeType,
        name: fileName,
      };

      // Upload to Supabase Storage using the file object
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-content')
        .upload(filePath, file as any, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { data: null, error: uploadError };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(filePath);

      return { data: urlData.publicUrl, error: null };
    } catch (error) {
      console.error('Avatar upload exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete avatar from storage
   */
  async deleteAvatar(avatarUrl: string): Promise<{ error: any }> {
    try {
      // Extract file path from URL
      const urlParts = avatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `avatars/${fileName}`;

      const { error } = await supabase.storage
        .from('user-content')
        .remove([filePath]);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Get default preferences for Bangkok users
   */
  getDefaultPreferences(): any {
    return {
      preferred_districts: ['sukhumvit', 'siam', 'silom'],
      cuisine_preferences: ['thai', 'japanese', 'street_food'],
      dietary_restrictions: [],
      price_range: 'moderate',
      transportation_methods: ['bts', 'grab', 'walking'],
      activity_types: ['dining', 'shopping', 'culture'],
      typical_group_size: 'couple',
      notifications: {
        recommendations: true,
        check_in_reminders: true,
        social_updates: false,
        marketing: false,
      },
      privacy: {
        profile_visibility: 'friends',
        location_sharing: true,
        check_in_visibility: 'friends',
        list_sharing_default: 'friends',
      },
    };
  }

  /**
   * Initialize user preferences with defaults
   */
  async initializeUserPreferences(userId: string): Promise<{ error: any }> {
    const defaultPreferences = this.getDefaultPreferences();
    return this.updatePreferences(userId, defaultPreferences);
  }

  /**
   * Export user data (for GDPR compliance)
   */
  async exportUserData(userId: string): Promise<{ data: any | null; error: any }> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await this.getUserProfile(userId);
      if (profileError) return { data: null, error: profileError };

      // Get user's check-ins
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', userId);

      if (checkInsError) return { data: null, error: checkInsError };

      // Get user's lists
      const { data: lists, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', userId);

      if (listsError) return { data: null, error: listsError };

      // Get user's places
      const { data: places, error: placesError } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', userId);

      if (placesError) return { data: null, error: placesError };

      const exportData = {
        profile,
        checkIns,
        lists,
        places,
        exportedAt: new Date().toISOString(),
      };

      return { data: exportData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Delete user account and all associated data
   */
  async deleteUserAccount(userId: string): Promise<{ error: any }> {
    try {
      // Delete user's avatar if exists
      const { data: profile } = await this.getUserProfile(userId);
      if (profile?.avatar_url) {
        await this.deleteAvatar(profile.avatar_url);
      }

      // Delete user record (cascading deletes will handle related data)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      return { error };
    } catch (error) {
      return { error };
    }
  }
}

export const profileService = new ProfileService(); 