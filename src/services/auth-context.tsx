import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { authService } from './auth';
import { AuthProvider as AuthProviderType, UserUpdate as ProfileUpdate, User as AppUser } from '../types';
import { networkService } from './networkService';
import { ErrorFactory, ErrorLogger } from '../utils/errorHandling';

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
      // Check network before attempting operation
      if (!networkService.isConnected()) {
        console.log('No network connection, waiting for connection...');
        const connected = await networkService.waitForConnection(5000);
        if (!connected) {
          throw ErrorFactory.network(
            'No network connection available',
            { service: 'auth', operation: 'retry' }
          );
        }
      }
      
      return await operation();
    } catch (error: any) {
      // Check if this is a network error
      const isNetworkError = 
        error.name === 'AuthRetryableFetchError' || 
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.type === 'NETWORK_ERROR';
      
      if (attempt === maxRetries || !isNetworkError) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Auth operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
      
      // Log the error for monitoring
      ErrorLogger.log(
        ErrorFactory.network(
          `Auth retry attempt ${attempt + 1}/${maxRetries + 1}`,
          { 
            service: 'auth', 
            operation: 'retry',
            metadata: { attempt, maxRetries, delay }
          },
          error
        )
      );
      
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
  refreshSession: () => Promise<void>;
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
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(true);
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

    // Set up network monitoring
    const removeNetworkListener = networkService.addListener((isConnected) => {
      setIsNetworkAvailable(isConnected);
      if (isConnected && session?.user && !user) {
        // Try to reload user profile when network comes back
        loadUserProfile(session.user.id).catch(console.error);
      }
    });

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
        
        // Enhanced error logging
        const isNetworkError = 
          error.name === 'AuthRetryableFetchError' || 
          error.message?.includes('Network request failed');
        
        if (isNetworkError) {
          console.warn('Auth session check failed due to network error:', error.message);
          ErrorLogger.log(
            ErrorFactory.network(
              'Failed to check authentication status due to network error',
              { 
                service: 'auth', 
                operation: 'initialize',
                metadata: { 
                  errorName: error.name,
                  errorMessage: error.message 
                }
              },
              error
            )
          );
        } else {
          console.warn('Auth session check failed after retries:', error);
        }
        
        setSession(null);
        setUser(null);
        clearFailsafeAndSetLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('Auth state change event:', event);
      
      // Update session state
      setSession(session);
      
      if (session?.user) {
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            try {
              await loadUserProfile(session.user.id);
            } catch (error) {
              console.warn('Failed to load user profile during auth state change:', error);
              clearFailsafeAndSetLoading(false);
            }
            break;
          case 'SIGNED_OUT':
            setUser(null);
            clearFailsafeAndSetLoading(false);
            break;
          default:
            // For other events, just ensure loading is false
            if (loading) {
              clearFailsafeAndSetLoading(false);
            }
        }
      } else if (event === 'SIGNED_OUT') {
        // Only clear user on explicit sign out
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
      removeNetworkListener();
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
      // Check network before sign in
      if (!isNetworkAvailable) {
        const connected = await networkService.waitForConnection(5000);
        if (!connected) {
          return { 
            error: ErrorFactory.network(
              'No network connection. Please check your internet and try again.',
              { service: 'auth', operation: 'signIn' }
            )
          };
        }
      }
      
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
      // Enhanced error handling for network issues
      if (error.name === 'AuthRetryableFetchError' || 
          error.message?.includes('Network request failed')) {
        return { 
          error: ErrorFactory.network(
            'Sign in failed due to network error. Please try again.',
            { service: 'auth', operation: 'signIn' },
            error
          )
        };
      }
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

  const refreshSession = async () => {
    try {
      console.log('Attempting to refresh session...');
      
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        
        // If refresh fails, try to get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          console.error('Failed to recover session:', sessionError);
          // Don't automatically sign out - let the user continue using the app
          // The auth state change listener will handle sign out if truly necessary
          return;
        }
        
        // Update session if we recovered it
        setSession(sessionData.session);
        if (sessionData.session?.user) {
          await loadUserProfile(sessionData.session.user.id);
        }
      } else if (data.session) {
        console.log('Session refreshed successfully');
        setSession(data.session);
        
        // Update user profile if needed
        if (data.session.user && (!user || user.id !== data.session.user.id)) {
          await loadUserProfile(data.session.user.id);
        }
      }
    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
      // Don't throw - gracefully handle the error and let the user continue
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
    refreshSession,
    resetPassword,
    resendEmailVerification,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 