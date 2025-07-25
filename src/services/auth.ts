import { AuthProvider, SocialAuthData, UserUpdate as ProfileUpdate, User } from '../types';
import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Utility function to add timeout to promises
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export class AuthService {
  // Google Sign In with proper scopes
  async signInWithGoogle(): Promise<{ error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'email profile',
        },
      });

      if (error) throw error;

      // Open the OAuth URL in browser
      if (data?.url) {
        await WebBrowser.openAuthSessionAsync(data.url, 'placemarks://auth');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      return { error };
    }
  }

  // Facebook Login with email and profile permissions
  async signInWithFacebook(): Promise<{ error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          scopes: 'email public_profile',
        },
      });

      if (error) throw error;

      // Open the OAuth URL in browser
      if (data?.url) {
        await WebBrowser.openAuthSessionAsync(data.url, 'placemarks://auth');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Facebook sign in error:', error);
      return { error };
    }
  }

  // Apple Sign In with email and name
  async signInWithApple(): Promise<{ error: any }> {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign In is only available on iOS');
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          scopes: 'email name',
        },
      });

      if (error) throw error;

      // Open the OAuth URL in browser
      if (data?.url) {
        await WebBrowser.openAuthSessionAsync(data.url, 'placemarks://auth');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Apple sign in error:', error);
      return { error };
    }
  }

  // Email/password authentication
  async signInWithEmail(email: string, password: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      console.error('Email sign in error:', error);
      return { data: null, error };
    }
  }

  async signUpWithEmail(email: string, password: string, userData?: Partial<User>): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        options: {
          data: {
            full_name: userData?.full_name,
            avatar_url: userData?.avatar_url,
          },
        },
      });

      if (error) throw error;

      // Create user profile after successful signup
      if (data.user && !error) {
        await this.createUserProfile(data.user, 'email', userData);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Email sign up error:', error);
      return { data: null, error };
    }
  }

  // Profile management
  async updateProfile(data: ProfileUpdate): Promise<void> {
    try {
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');


      // Update user profile in database
      const updateData: any = {};
      if (data.full_name !== undefined) updateData.full_name = data.full_name;
      if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
      if (data.preferences !== undefined) updateData.preferences = data.preferences;


      const { error: profileError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }
      
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async uploadAvatar(imageUri: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create a unique filename
      const fileExt = imageUri.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Convert image to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-content')
        .upload(`avatars/${fileName}`, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-content')
        .getPublicUrl(`avatars/${fileName}`);

      return publicUrl;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  // Session management
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // Get auth user without timeout - this is usually fast
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user profile from database with longer timeout and better error handling
      const result = await withTimeout(
        Promise.resolve(supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()),
10000
      ) as { data: any; error: any };
      
      const { data: profile, error } = result;

      if (error) {
        console.warn('Get user profile error:', error);
        
        // If user exists in auth but not in database, create profile
        if (error.code === 'PGRST116') { // Row not found
          try {
            const newProfile = await this.createUserProfile(user, 'email');
            return newProfile;
          } catch (createError) {
            console.error('Failed to create user profile:', createError);
            return null;
          }
        }
        
        // For other errors (including timeout), return null silently
        return null;
      }

      return profile;
    } catch (error) {
      // Silently handle timeout errors during app startup
      if (error instanceof Error && error.message.includes('timed out')) {
        console.warn('Database query timed out during app startup, will retry later');
      } else {
        console.error('Get current user error:', error);
      }
      return null;
    }
  }


  private async createUserProfile(user: any, provider: AuthProvider, socialData?: any): Promise<User> {
    try {
      const userProfile: Partial<User> = {
        id: user.id,
        email: user.email,
        full_name: socialData?.full_name || user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: socialData?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture,
        auth_provider: provider,
                 preferences: {
           favorite_districts: [],
           dietary_restrictions: [],
           preferred_cuisines: [],
           price_range: 'mid',
           transport_preference: 'bts',
           activity_types: [],
         },
      };

      const { data, error } = await supabase
        .from('users')
        .upsert(userProfile, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Create user profile error:', error);
      throw error;
    }
  }

  // Password reset
  async resetPassword(email: string): Promise<{ error: any }> {
    try {
             const { error } = await supabase.auth.resetPasswordForEmail(email);

      return { error };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return { error };
    }
  }

  // Email verification
  async resendEmailVerification(): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: '', // Will use the current user's email
      });

      return { error };
    } catch (error: any) {
      console.error('Resend verification error:', error);
      return { error };
    }
  }
}

// Export singleton instance
export const authService = new AuthService(); 