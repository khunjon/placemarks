import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, authService } from './supabase';
import { AuthState } from '../types';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{ error: any }>;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await authService.signIn(email, password);
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(true);
    const { error } = await authService.signUp(email, password, userData);
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    await authService.signOut();
    setLoading(false);
  };

  const updateProfile = async (updates: any) => {
    if (!user) return { error: new Error('No user logged in') };
    
    setLoading(true);
    const { error } = await authService.updateProfile(user.id, updates);
    setLoading(false);
    return { error };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 