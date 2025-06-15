import { UserPreferences } from './database';

export interface AuthResponse {
  user: User | null;
  session: any | null;
  error: Error | null;
}

export interface ProfileUpdate {
  full_name?: string;
  avatar_url?: string;
  preferences?: Partial<UserPreferences>;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider: 'email' | 'google' | 'facebook' | 'apple';
  preferences: UserPreferences;
  created_at: string;
  updated_at?: string;
}

export type AuthProvider = 'email' | 'google' | 'facebook' | 'apple';

export interface SocialAuthData {
  provider: AuthProvider;
  access_token?: string;
  id_token?: string;
  profile?: {
    name?: string;
    email?: string;
    picture?: string;
  };
} 