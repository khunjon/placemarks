import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { authService } from './auth';
import { AuthProvider as AuthProviderType, UserUpdate as ProfileUpdate, User as AppUser } from '../types';
import { networkService } from './networkService';
import { ErrorFactory, ErrorLogger } from '../utils/errorHandling';

// Constants for session persistence
const SESSION_STORAGE_KEY = '@placemarks/session';
const USER_STORAGE_KEY = '@placemarks/user';
const SESSION_TIMEOUT = 30000; // Increased to 30 seconds

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
  const [isRecoveringSession, setIsRecoveringSession] = useState(false);
  const failsafeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidSessionRef = useRef<Session | null>(null);
  const lastValidUserRef = useRef<AppUser | null>(null);

  // Helper function to clear failsafe timeout and set loading to false
  const clearFailsafeAndSetLoading = (value: boolean) => {
    if (failsafeTimeoutRef.current) {
      clearTimeout(failsafeTimeoutRef.current);
      failsafeTimeoutRef.current = null;
    }
    setLoading(value);
  };

  // Persist session to AsyncStorage
  const persistSession = async (session: Session | null, user: AppUser | null) => {
    try {
      if (session && user) {
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        lastValidSessionRef.current = session;
        lastValidUserRef.current = user;
      } else {
        // Only clear storage on explicit sign out, not on errors
        if (!isRecoveringSession) {
          await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          lastValidSessionRef.current = null;
          lastValidUserRef.current = null;
        }
      }
    } catch (error) {
      console.warn('Failed to persist session:', error);
    }
  };

  // Recover session from AsyncStorage
  const recoverSession = async (): Promise<{ session: Session | null; user: AppUser | null }> => {
    try {
      setIsRecoveringSession(true);
      const [storedSession, storedUser] = await Promise.all([
        AsyncStorage.getItem(SESSION_STORAGE_KEY),
        AsyncStorage.getItem(USER_STORAGE_KEY)
      ]);

      if (storedSession && storedUser) {
        const session = JSON.parse(storedSession) as Session;
        const user = JSON.parse(storedUser) as AppUser;
        
        // Validate session is not expired
        const expiresAt = session.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        
        if (expiresAt > now) {
          return { session, user };
        }
      }
    } catch (error) {
      console.warn('Failed to recover session from storage:', error);
    } finally {
      setIsRecoveringSession(false);
    }
    
    return { session: null, user: null };
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

    // Try to recover session from storage first
    recoverSession().then(({ session: recoveredSession, user: recoveredUser }) => {
      if (recoveredSession && recoveredUser && isMounted) {
        setSession(recoveredSession);
        setUser(recoveredUser);
        console.log('Recovered session from storage');
      }
    });

    // Maximum loading time failsafe - increased to 30 seconds
    failsafeTimeoutRef.current = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth initialization timed out, using cached session if available');
        // Use last valid session if available instead of clearing
        if (lastValidSessionRef.current && lastValidUserRef.current) {
          setSession(lastValidSessionRef.current);
          setUser(lastValidUserRef.current);
        }
        setLoading(false);
      }
    }, SESSION_TIMEOUT);

    // Get initial session with timeout and retry logic
    withRetry(
      () => withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT),
      3, // Increased retries
      2000 // Increased delay
    )
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        
        setSession(session);
        if (session?.user) {
          loadUserProfile(session.user.id);
        } else {
          // Only clear if we don't have a cached session
          if (!lastValidSessionRef.current) {
            setUser(null);
          }
          clearFailsafeAndSetLoading(false);
        }
      })
      .catch(async (error) => {
        if (!isMounted) return;
        
        // Enhanced error handling without clearing auth state
        const isNetworkError = 
          error.name === 'AuthRetryableFetchError' || 
          error.message?.includes('Network request failed') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('timed out');
        
        if (isNetworkError) {
          console.warn('Network error during auth check, maintaining current session:', error.message);
          
          // Try to use recovered session
          const { session: recoveredSession, user: recoveredUser } = await recoverSession();
          if (recoveredSession && recoveredUser) {
            setSession(recoveredSession);
            setUser(recoveredUser);
            console.log('Using recovered session after network error');
          }
          
          // Log for monitoring but don't sign out user
          ErrorLogger.log(
            ErrorFactory.network(
              'Network error during auth check - session maintained',
              { 
                service: 'auth', 
                operation: 'initialize',
                metadata: { 
                  errorName: error.name,
                  errorMessage: error.message,
                  hasRecoveredSession: !!recoveredSession
                }
              },
              error
            )
          );
        } else {
          // For non-network errors, still try to recover
          console.warn('Auth check failed, attempting recovery:', error);
          const { session: recoveredSession, user: recoveredUser } = await recoverSession();
          if (recoveredSession && recoveredUser) {
            setSession(recoveredSession);
            setUser(recoveredUser);
          } else {
            // Only clear if recovery also failed
            setSession(null);
            setUser(null);
          }
        }
        
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
              const userProfile = await loadUserProfile(session.user.id);
              if (userProfile) {
                await persistSession(session, userProfile);
              }
            } catch (error) {
              console.warn('Failed to load user profile during auth state change:', error);
              // Don't clear user state on profile load failure
              clearFailsafeAndSetLoading(false);
            }
            break;
          case 'SIGNED_OUT':
            setUser(null);
            await persistSession(null, null);
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
        await persistSession(null, null);
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

  const loadUserProfile = async (userId: string): Promise<AppUser | null> => {
    try {
      // Loading user profile with timeout and retry logic
      const userProfile = await withRetry(
        () => withTimeout(authService.getCurrentUser(), SESSION_TIMEOUT),
        3, // Increased retries
        2000 // Increased delay
      );
      setUser(userProfile);
      return userProfile;
    } catch (error) {
      console.warn('Error loading user profile after retries:', error);
      
      // Check if it's a network error
      const isNetworkError = 
        error instanceof Error && (
          error.message?.includes('Network') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('timed out')
        );
      
      if (isNetworkError) {
        // For network errors, keep existing user state
        console.log('Maintaining existing user state due to network error');
        return user; // Return current user state
      } else {
        // For auth errors, check if we have a valid session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          // Session is valid but profile load failed, keep minimal auth
          console.log('Session valid but profile load failed, maintaining auth');
          return user || { id: userId, email: currentSession.user.email } as AppUser;
        } else {
          // No valid session, clear user
          setUser(null);
          return null;
        }
      }
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
      
      // Try to refresh the session with retry
      const { data, error } = await withRetry(
        () => withTimeout(supabase.auth.refreshSession(), SESSION_TIMEOUT),
        2,
        3000
      ).catch(async (retryError) => {
        // If refresh with retry fails, try to use stored session
        console.log('Session refresh failed, attempting recovery from storage');
        const recovered = await recoverSession();
        if (recovered.session && recovered.user) {
          return { data: { session: recovered.session, user: recovered.session.user }, error: null };
        }
        return { data: null, error: retryError };
      });
      
      if (error) {
        console.error('Session refresh error:', error);
        
        // Check if it's a network error
        const isNetworkError = 
          error.message?.includes('Network') ||
          error.message?.includes('Failed to fetch') ||
          error.name === 'AuthRetryableFetchError';
        
        if (isNetworkError) {
          // For network errors, maintain current session
          console.log('Network error during refresh, maintaining current session');
          return;
        }
        
        // For auth errors, try to get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          console.error('Session validation failed:', sessionError);
          // Still don't sign out - wait for explicit sign out or auth state change
          return;
        }
        
        // Update session if we recovered it
        setSession(sessionData.session);
        if (sessionData.session?.user) {
          const userProfile = await loadUserProfile(sessionData.session.user.id);
          if (userProfile) {
            await persistSession(sessionData.session, userProfile);
          }
        }
      } else if (data?.session) {
        console.log('Session refreshed successfully');
        setSession(data.session);
        
        // Update user profile if needed
        if (data.session.user) {
          const userProfile = await loadUserProfile(data.session.user.id);
          if (userProfile) {
            await persistSession(data.session, userProfile);
          }
        }
      }
    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
      
      // Try to recover from storage as last resort
      const { session: recoveredSession, user: recoveredUser } = await recoverSession();
      if (recoveredSession && recoveredUser) {
        setSession(recoveredSession);
        setUser(recoveredUser);
        console.log('Recovered session after refresh error');
      }
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