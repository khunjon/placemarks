import { AuthResponse, AuthProvider, SocialAuthData, ProfileUpdate } from '../types/user';
import { User } from '../types/database';

export class AuthService {
  // Google Sign In with proper scopes
  async signInWithGoogle(): Promise<AuthResponse> {
    // TODO: Implement Google OAuth with expo-auth-session
    // TODO: Request email and profile scopes
    // TODO: Handle redirect and token exchange
    throw new Error('Not implemented yet');
  }

  // Facebook Login with email and profile permissions
  async signInWithFacebook(): Promise<AuthResponse> {
    // TODO: Implement Facebook OAuth with expo-auth-session
    // TODO: Request email and public_profile permissions
    // TODO: Handle redirect and token exchange
    throw new Error('Not implemented yet');
  }

  // Apple Sign In with email and name
  async signInWithApple(): Promise<AuthResponse> {
    // TODO: Implement Apple Sign In with expo-auth-session
    // TODO: Request email and fullName scopes
    // TODO: Handle credential response
    throw new Error('Not implemented yet');
  }

  // Email/password authentication
  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    // TODO: Implement with Supabase auth
    // TODO: Handle email verification
    throw new Error('Not implemented yet');
  }

  async signUpWithEmail(email: string, password: string): Promise<AuthResponse> {
    // TODO: Implement with Supabase auth
    // TODO: Send email verification
    // TODO: Create user profile
    throw new Error('Not implemented yet');
  }

  // Profile management
  async updateProfile(data: ProfileUpdate): Promise<void> {
    // TODO: Update user profile in Supabase
    // TODO: Handle avatar upload to Supabase Storage
    throw new Error('Not implemented yet');
  }

  async uploadAvatar(imageUri: string): Promise<string> {
    // TODO: Upload image to Supabase Storage
    // TODO: Return public URL
    throw new Error('Not implemented yet');
  }

  // Session management
  async signOut(): Promise<void> {
    // TODO: Sign out from Supabase
    // TODO: Clear local storage
    throw new Error('Not implemented yet');
  }

  async getCurrentUser(): Promise<User | null> {
    // TODO: Get current user from Supabase session
    // TODO: Return user profile data
    throw new Error('Not implemented yet');
  }

  // Social auth helpers
  private async handleSocialAuth(provider: AuthProvider, authData: SocialAuthData): Promise<AuthResponse> {
    // TODO: Exchange social auth tokens with Supabase
    // TODO: Create or update user profile
    // TODO: Handle account linking
    throw new Error('Not implemented yet');
  }

  private async createUserProfile(user: any, provider: AuthProvider, socialData?: any): Promise<User> {
    // TODO: Create user profile in database
    // TODO: Set default preferences
    // TODO: Handle social profile data
    throw new Error('Not implemented yet');
  }
} 