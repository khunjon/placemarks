import { UserPreferences, User, AuthProvider } from './entities';

export interface AuthResponse {
  user: User | null;
  session: any | null;
  error: Error | null;
}



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