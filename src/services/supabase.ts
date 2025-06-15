import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Place, CheckIn, List } from '../types';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth service functions
export const authService = {
  async signUp(email: string, password: string, userData?: Partial<User>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },
};

// Places service functions
export const placesService = {
  async getPlaces(userId?: string) {
    let query = supabase.from('places').select('*');
    
    if (userId) {
      query = query.or(`user_id.eq.${userId},is_public.eq.true`);
    } else {
      query = query.eq('is_public', true);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  async getPlace(id: string) {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createPlace(place: Omit<Place, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('places')
      .insert(place)
      .select()
      .single();
    return { data, error };
  },

  async updatePlace(id: string, updates: Partial<Place>) {
    const { data, error } = await supabase
      .from('places')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deletePlace(id: string) {
    const { error } = await supabase
      .from('places')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// CheckIns service functions
export const checkInsService = {
  async getCheckIns(userId: string) {
    const { data, error } = await supabase
      .from('checkins')
      .select(`
        *,
        places (*)
      `)
      .eq('user_id', userId)
      .order('visited_at', { ascending: false });
    return { data, error };
  },

  async createCheckIn(checkIn: Omit<CheckIn, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('checkins')
      .insert(checkIn)
      .select()
      .single();
    return { data, error };
  },

  async updateCheckIn(id: string, updates: Partial<CheckIn>) {
    const { data, error } = await supabase
      .from('checkins')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteCheckIn(id: string) {
    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// Lists service functions
export const listsService = {
  async getLists(userId: string) {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getList(id: string) {
    const { data, error } = await supabase
      .from('lists')
      .select(`
        *,
        places!inner(*)
      `)
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createList(list: Omit<List, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('lists')
      .insert(list)
      .select()
      .single();
    return { data, error };
  },

  async updateList(id: string, updates: Partial<List>) {
    const { data, error } = await supabase
      .from('lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteList(id: string) {
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', id);
    return { error };
  },
}; 