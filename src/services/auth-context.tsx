import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { authService } from './auth';
import { AuthProvider as AuthProviderType, UserUpdate as ProfileUpdate, User as AppUser } from '../types';
import { networkService } from './networkService';
import { ErrorFactory, ErrorLogger } from '../utils/errorHandling';
import { authMonitor } from '../utils/authMonitoring';

// Constants for session persistence
const SESSION_STORAGE_KEY = '@placemarks/session';
const USER_STORAGE_KEY = '@placemarks/user';
const SESSION_TIMEOUT = 60000; // 60 seconds for operations
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check session every 5 minutes
const SESSION_PERSIST_KEY = '@placemarks/session_persist_timestamp';

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
  const hasInitializedRef = useRef(false);

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
        await AsyncStorage.multiSet([
          [SESSION_STORAGE_KEY, JSON.stringify(session)],
          [USER_STORAGE_KEY, JSON.stringify(user)],
          [SESSION_PERSIST_KEY, Date.now().toString()]
        ]);
        lastValidSessionRef.current = session;
        lastValidUserRef.current = user;
      } else {
        // Only clear storage on explicit sign out, not on errors
        if (!isRecoveringSession) {
          await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, USER_STORAGE_KEY, SESSION_PERSIST_KEY]);
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
      // Prevent concurrent recovery attempts
      if (isRecoveringSession) {
        console.log('Session recovery already in progress, skipping');
        return { session: lastValidSessionRef.current, user: lastValidUserRef.current };
      }
      setIsRecoveringSession(true);
      const results = await AsyncStorage.multiGet([SESSION_STORAGE_KEY, USER_STORAGE_KEY, SESSION_PERSIST_KEY]);
      const storedSession = results[0][1];
      const storedUser = results[1][1];
      const lastPersistTime = results[2][1];

      if (storedSession && storedUser) {
        const session = JSON.parse(storedSession) as Session;
        const user = JSON.parse(storedUser) as AppUser;
        
        // Check if session is still valid
        const expiresAt = session.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        
        // For JWT tokens, Supabase typically uses 1 hour expiry
        // We'll accept sessions that expired up to 24 hours ago for recovery
        const gracePeriod = 24 * 60 * 60; // 24 hours in seconds
        
        if (expiresAt > now || (now - expiresAt) < gracePeriod) {
          // Store in refs for future use
          lastValidSessionRef.current = session;
          lastValidUserRef.current = user;
          
          const logDetails = {
            expired: expiresAt <= now,
            expiresIn: expiresAt > now ? `${Math.floor((expiresAt - now) / 60)} minutes` : 'expired',
            lastPersisted: lastPersistTime ? new Date(parseInt(lastPersistTime)).toISOString() : 'unknown'
          };
          console.log('Session recovered from storage', logDetails);
          authMonitor.logEvent('session_recovered', logDetails, session);
          
          return { session, user };
        } else {
          console.log('Session too old to recover', {
            expiredHoursAgo: Math.floor((now - expiresAt) / 3600)
          });
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
    
    // Prevent re-initialization
    if (hasInitializedRef.current) {
      console.log('Auth context already initialized, skipping');
      return;
    }
    hasInitializedRef.current = true;
    
    // Initialize auth monitoring
    authMonitor.loadLogs().then(() => {
      authMonitor.logEvent('auth_context_initialized', {
        hasStoredSession: !!lastValidSessionRef.current,
        hasStoredUser: !!lastValidUserRef.current
      }, lastValidSessionRef.current);
    });

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
        authMonitor.logEvent('session_initial_recovery', { source: 'startup' }, recoveredSession);
        
        // If we recovered an expired session, immediately try to refresh it
        const expiresAt = recoveredSession.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt <= now) {
          console.log('Recovered session is expired, attempting refresh');
          authMonitor.logEvent('session_expired_on_recovery', { expiresAt }, recoveredSession);
          refreshSession().catch(console.error);
        }
      }
    });

    // Maximum loading time failsafe
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
        
        // Enhanced error handling - NEVER clear auth state on network errors
        const isNetworkError = 
          error.name === 'AuthRetryableFetchError' || 
          error.message?.includes('Network request failed') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('timed out') ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('ENETUNREACH') ||
          error.message?.includes('ETIMEDOUT');
        
        if (isNetworkError) {
          console.warn('Network error during auth check, maintaining session:', error.message);
          
          // Always try to use recovered session on network errors
          const { session: recoveredSession, user: recoveredUser } = await recoverSession();
          if (recoveredSession && recoveredUser) {
            setSession(recoveredSession);
            setUser(recoveredUser);
            console.log('Using recovered session after network error');
          } else if (lastValidSessionRef.current && lastValidUserRef.current) {
            // Use last valid session if recovery fails
            setSession(lastValidSessionRef.current);
            setUser(lastValidUserRef.current);
            console.log('Using last valid session after network error');
          }
          // Never clear auth on network errors
        } else {
          // For non-network errors, still try to maintain session
          console.warn('Auth check error, attempting recovery:', error);
          const { session: recoveredSession, user: recoveredUser } = await recoverSession();
          if (recoveredSession && recoveredUser) {
            setSession(recoveredSession);
            setUser(recoveredUser);
            console.log('Recovered session after auth error');
          } else if (lastValidSessionRef.current && lastValidUserRef.current) {
            // Try last valid session before giving up
            setSession(lastValidSessionRef.current);
            setUser(lastValidUserRef.current);
            console.log('Using last valid session after auth error');
          } else {
            // Only clear if all recovery attempts failed AND it's not a network error
            console.log('All recovery attempts failed, clearing session');
            setSession(null);
            setUser(null);
          }
        }
        
        clearFailsafeAndSetLoading(false);
      });

    // Note: Session monitoring moved to separate effect

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('Auth state change event:', event);
      authMonitor.logEvent('auth_state_change', { event }, session);
      
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
  }, []); // Run only once on mount

  // Separate effect for session monitoring
  useEffect(() => {
    if (!session) return;

    const sessionCheckInterval = setInterval(() => {
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const minutesUntilExpiry = Math.floor((expiresAt - now) / 60);
      
      // Refresh if less than 10 minutes until expiry
      if (minutesUntilExpiry < 10 && minutesUntilExpiry > -5) {
        console.log(`Session expiring in ${minutesUntilExpiry} minutes, refreshing...`);
        refreshSession().catch(error => {
          console.error('Periodic session refresh failed:', error);
        });
      }
    }, SESSION_CHECK_INTERVAL);

    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [session]); // Re-run when session changes

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
        // For network errors, always keep existing user state
        console.log('Network error loading profile, maintaining existing user state');
        if (user) {
          return user;
        } else if (lastValidUserRef.current) {
          // Try to use last valid user
          setUser(lastValidUserRef.current);
          return lastValidUserRef.current;
        }
        // Create minimal user object from session if available
        if (session?.user) {
          const minimalUser = { 
            id: userId, 
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name
          } as AppUser;
          setUser(minimalUser);
          return minimalUser;
        }
        return null;
      } else {
        // For non-network errors, still try to maintain user state
        console.log('Profile load error (non-network), attempting to maintain state');
        
        // Return existing user if available
        if (user) {
          return user;
        } else if (lastValidUserRef.current) {
          return lastValidUserRef.current;
        }
        
        // Only as last resort, check session validity
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            // Session is valid but profile load failed, create minimal user
            const minimalUser = { 
              id: userId, 
              email: currentSession.user.email,
              full_name: currentSession.user.user_metadata?.full_name
            } as AppUser;
            setUser(minimalUser);
            return minimalUser;
          }
        } catch (sessionError) {
          console.error('Failed to check session validity:', sessionError);
        }
        
        // Only clear user if absolutely no recovery is possible
        return null;
      }
    } finally {
      clearFailsafeAndSetLoading(false);
    }
  };

  const signIn = async (provider: AuthProviderType | 'email', email?: string, password?: string) => {
    setLoading(true);
    authMonitor.logEvent('sign_in_started', { provider }, session);
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
      
      if (!result.error) {
        authMonitor.logEvent('sign_in_success', { provider }, session);
      } else {
        authMonitor.logEvent('sign_in_failed', { provider, error: result.error.message }, session);
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
    authMonitor.logEvent('sign_out_started', {}, session);
    try {
      await authService.signOut();
      authMonitor.logEvent('sign_out_success', {}, null);
    } catch (error) {
      console.error('Sign out error:', error);
      authMonitor.logEvent('sign_out_error', { error: error instanceof Error ? error.message : 'Unknown error' }, session);
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
      console.log('Starting session refresh...');
      authMonitor.logEvent('session_refresh_started', {}, session);
      
      // First, check if we have a session to refresh
      const currentSession = session || lastValidSessionRef.current;
      if (!currentSession) {
        console.log('No session to refresh, attempting recovery');
        const recovered = await recoverSession();
        if (recovered.session && recovered.user) {
          setSession(recovered.session);
          setUser(recovered.user);
          // Try to refresh the recovered session
          const { data, error } = await supabase.auth.refreshSession({ refresh_token: recovered.session.refresh_token });
          if (!error && data?.session) {
            setSession(data.session);
            await persistSession(data.session, recovered.user);
          }
        }
        return;
      }
      
      // Try to refresh the session with retry
      const { data, error } = await withRetry(
        async () => {
          // Use the current session's refresh token explicitly
          const refreshToken = currentSession.refresh_token;
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          return await withTimeout(
            supabase.auth.refreshSession({ refresh_token: refreshToken }), 
            SESSION_TIMEOUT
          );
        },
        3, // More retries
        2000
      ).catch(async (retryError) => {
        // If refresh with retry fails, try to use stored session
        console.log('Session refresh failed after retries, attempting recovery');
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
          error.message?.includes('timed out') ||
          error.name === 'AuthRetryableFetchError';
        
        if (isNetworkError) {
          // For network errors, absolutely maintain current session
          console.log('Network error during refresh, keeping current session active');
          // Don't change anything - just keep the current session
          return;
        }
        
        // For non-network errors, check if it's a refresh token issue
        if (error.message?.includes('refresh_token') || error.message?.includes('invalid')) {
          console.log('Refresh token invalid, attempting to recover from storage');
          const recovered = await recoverSession();
          if (recovered.session && recovered.user) {
            setSession(recovered.session);
            setUser(recovered.user);
          }
          return;
        }
        
        // For other auth errors, maintain current state
        console.log('Auth error during refresh, maintaining current state');
        return;
      } else if (data?.session) {
        console.log('Session refreshed successfully');
        authMonitor.logEvent('session_refresh_success', {
          hadToRetry: false,
          newExpiresAt: data.session.expires_at
        }, data.session);
        setSession(data.session);
        
        // Always persist the refreshed session
        const userProfile = user || (await loadUserProfile(data.session.user.id));
        if (userProfile) {
          await persistSession(data.session, userProfile);
        }
      }
    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
      
      // Always try to maintain auth state on errors
      if (!session && lastValidSessionRef.current && lastValidUserRef.current) {
        console.log('Using last valid session after refresh error');
        setSession(lastValidSessionRef.current);
        setUser(lastValidUserRef.current);
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