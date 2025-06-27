import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { authService } from './auth';
import { AuthProvider as AuthProviderType, UserUpdate as ProfileUpdate, User as AppUser } from '../types';

// Utility function to add timeout to promises
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Utility function with exponential backoff for retries
const withRetry = async <T,>(
  operation: () => Promise<T>, 
  maxRetries: number = 2, 
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Auth operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (provider: AuthProviderType | 'email', email?: string, password?: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: Partial<AppUser>) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: any }>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  resendEmailVerification: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const failsafeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Helper function to clear failsafe timeout and set loading to false
  const clearFailsafeAndSetLoading = (value: boolean) => {
    if (failsafeTimeoutRef.current) {
      clearTimeout(failsafeTimeoutRef.current);
      failsafeTimeoutRef.current = null;
    }
    setLoading(value);
  };

  useEffect(() => {
    let isMounted = true;

    // Maximum loading time failsafe - increased to 10 seconds to allow for retries
    failsafeTimeoutRef.current = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth initialization timed out, proceeding without auth');
        setLoading(false);
        setSession(null);
        setUser(null);
      }
    }, 10000);

    // Get initial session with timeout and retry logic
    withRetry(
      () => withTimeout(supabase.auth.getSession(), 5000), // Increased timeout to 5 seconds
      2, // Retry up to 2 times
      1000 // Start with 1 second delay
    )
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        
        setSession(session);
        if (session?.user) {
          loadUserProfile(session.user.id);
        } else {
          setUser(null);
          clearFailsafeAndSetLoading(false);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        
        console.warn('Auth session check failed after retries:', error);
        setSession(null);
        setUser(null);
        clearFailsafeAndSetLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
              // Auth state change handled
      setSession(session);
      
      if (session?.user) {
        // Only load profile if it's a new user or sign in event
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          try {
            await loadUserProfile(session.user.id);
          } catch (error) {
            console.warn('Failed to load user profile during auth state change:', error);
            clearFailsafeAndSetLoading(false);
          }
        }
      } else {
        setUser(null);
        clearFailsafeAndSetLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (failsafeTimeoutRef.current) {
        clearTimeout(failsafeTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      // Loading user profile with timeout and retry logic
      const userProfile = await withRetry(
        () => withTimeout(authService.getCurrentUser(), 5000), // Increased timeout to 5 seconds
        2, // Retry up to 2 times
        1000 // Start with 1 second delay
      );
      setUser(userProfile);
    } catch (error) {
      console.warn('Error loading user profile after retries:', error);
      // Don't set user to null immediately - they might still be authenticated
      // Just proceed without the profile data for now
      setUser(null);
    } finally {
      clearFailsafeAndSetLoading(false);
    }
  };

  const signIn = async (provider: AuthProviderType | 'email', email?: string, password?: string) => {
    setLoading(true);
    try {
      let result;
      
      switch (provider) {
        case 'google':
          result = await authService.signInWithGoogle();
          break;
        case 'facebook':
          result = await authService.signInWithFacebook();
          break;
        case 'apple':
          result = await authService.signInWithApple();
          break;
        case 'email':
          if (!email || !password) {
            return { error: new Error('Email and password are required') };
          }
          result = await authService.signInWithEmail(email, password);
          break;
        default:
          return { error: new Error('Invalid provider') };
      }
      
      return { error: result.error };
    } catch (error: any) {
      return { error };
    } finally {
      clearFailsafeAndSetLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData?: Partial<AppUser>) => {
    setLoading(true);
    try {
      const { error } = await authService.signUpWithEmail(email, password, userData);
      return { error };
    } catch (error: any) {
      return { error };
    } finally {
      clearFailsafeAndSetLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      clearFailsafeAndSetLoading(false);
    }
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) return { error: new Error('No user logged in') };
    
    try {
      // Starting profile update
      await authService.updateProfile(updates);
      // Profile updated successfully
      
      // Update local user state immediately instead of reloading
      setUser(prevUser => {
        if (!prevUser) return prevUser;
        return {
          ...prevUser,
          full_name: updates.full_name ?? prevUser.full_name,
          avatar_url: updates.avatar_url ?? prevUser.avatar_url,
          preferences: updates.preferences ? { ...prevUser.preferences, ...updates.preferences } : prevUser.preferences,
        };
      });
      
      // Profile update complete
      return { error: null };
    } catch (error: any) {
      console.error('Auth context: Profile update error:', error);
      return { error };
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      await loadUserProfile(user.id);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      return await authService.resetPassword(email);
    } catch (error: any) {
      return { error };
    }
  };

  const resendEmailVerification = async () => {
    try {
      return await authService.resendEmailVerification();
    } catch (error: any) {
      return { error };
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
    resetPassword,
    resendEmailVerification,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 