import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Place, CheckIn, List } from '../types';
import { ErrorFactory, ErrorLogger, safeAsync } from '../utils/errorHandling';

// Database type definitions for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      places: {
        Row: Place & { created_at: string };
        Insert: Omit<Place, 'id'> & { created_at?: string };
        Update: Partial<Omit<Place, 'id'>>;
      };
      check_ins: {
        Row: CheckIn & { created_at: string };
        Insert: Omit<CheckIn, 'id'> & { created_at?: string };
        Update: Partial<Omit<CheckIn, 'id'>>;
      };
      lists: {
        Row: List & { created_at: string };
        Insert: Omit<List, 'id'> & { created_at?: string };
        Update: Partial<Omit<List, 'id'>>;
      };
      list_places: {
        Row: {
          list_id: string;
          place_id: string;
          added_at: string;
          notes?: string;
        };
        Insert: {
          list_id: string;
          place_id: string;
          notes?: string;
        };
        Update: {
          notes?: string;
        };
      };
      recommendation_requests: {
        Row: {
          id: string;
          user_id: string;
          context: any;
          suggested_places: string[];
          user_feedback?: string;
          timestamp: string;
        };
        Insert: {
          user_id: string;
          context: any;
          suggested_places?: string[];
          user_feedback?: string;
        };
        Update: {
          context?: any;
          suggested_places?: string[];
          user_feedback?: string;
        };
      };
    };
  };
}

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw ErrorFactory.config(
    'Missing Supabase environment variables. Please check your .env file.',
    { service: 'supabase', operation: 'initialization' }
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache',
    },
  },
  // Add timeout configuration for better network handling
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Auth service functions
export const authService = {
  async signUp(email: string, password: string, userData?: Partial<User>) {
    return safeAsync(async () => {
      // Validate input
      if (!email || !password) {
        throw ErrorFactory.validation(
          'Email and password are required',
          { service: 'auth', operation: 'signUp' }
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      
      if (error) {
        throw ErrorFactory.database(
          `Failed to create user account: ${error.message}`,
          { service: 'auth', operation: 'signUp', userId: data.user?.id },
          error
        );
      }
      
      // Create user profile after successful signup
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: userData?.full_name,
            avatar_url: userData?.avatar_url,
            auth_provider: 'email',
            preferences: userData?.preferences || {},
          });
        
        if (profileError) {
          // Log profile creation error but don't fail the signup
          ErrorLogger.log(
            ErrorFactory.database(
              `Failed to create user profile: ${profileError.message}`,
              { service: 'auth', operation: 'createProfile', userId: data.user.id },
              profileError
            )
          );
        }
      }
      
      return { data, error: null };
    }, { service: 'auth', operation: 'signUp' });
  },

  async signIn(email: string, password: string) {
    return safeAsync(async () => {
      // Validate input
      if (!email || !password) {
        throw ErrorFactory.validation(
          'Email and password are required',
          { service: 'auth', operation: 'signIn' }
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw ErrorFactory.database(
          `Authentication failed: ${error.message}`,
          { service: 'auth', operation: 'signIn' },
          error
        );
      }
      
      return { data, error: null };
    }, { service: 'auth', operation: 'signIn' });
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

  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },
};

// Places service functions
export const placesService = {
  async getPlaces(userId?: string) {
    let query = supabase.from('places').select('*');
    
    // For now, return all public places
    // Later we can add user-specific filtering
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

  async getPlaceByGoogleId(googlePlaceId: string) {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('google_place_id', googlePlaceId)
      .single();
    return { data, error };
  },

  async createPlace(place: Omit<Place, 'id'>) {
    const { data, error } = await supabase
      .from('places')
      .insert({
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        coordinates: `POINT(${place.coordinates[1]} ${place.coordinates[0]})`,
        place_type: place.place_type,
        price_level: place.price_level,
        bangkok_context: place.bangkok_context,
      })
      .select()
      .single();
    return { data, error };
  },

  async updatePlace(id: string, updates: Partial<Place>) {
    const updateData: any = { ...updates };
    
    // Handle coordinates update for PostGIS geometry
    if (updates.coordinates) {
      updateData.coordinates = `POINT(${updates.coordinates[1]} ${updates.coordinates[0]})`;
    }
    
    const { data, error } = await supabase
      .from('places')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async searchNearbyPlaces(lat: number, lng: number, radiusMeters: number = 5000) {
    const { data, error } = await supabase
      .rpc('search_places_near_location', {
        lat,
        lng,
        radius_meters: radiusMeters,
      });
    return { data, error };
  },
};

// CheckIns service functions
export const checkInsService = {
  async getCheckIns(userId: string) {
    const { data, error } = await supabase
      .rpc('get_user_check_ins_with_places', {
        user_uuid: userId,
      });
    return { data, error };
  },

  async getCheckIn(id: string) {
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        *,
        places (*)
      `)
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createCheckIn(checkIn: Omit<CheckIn, 'id'>) {
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        user_id: checkIn.user_id,
        place_id: checkIn.place_id,
        timestamp: checkIn.timestamp,
        rating: checkIn.rating,
        tags: checkIn.tags,
        context: checkIn.context,
        photos: checkIn.photos,
        notes: checkIn.notes,
      })
      .select()
      .single();
    return { data, error };
  },

  async updateCheckIn(id: string, updates: Partial<CheckIn>) {
    const { data, error } = await supabase
      .from('check_ins')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteCheckIn(id: string) {
    const { error } = await supabase
      .from('check_ins')
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
        list_places (
          place_id,
          added_at,
          notes,
          places (*)
        )
      `)
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createList(list: Omit<List, 'id'>) {
    const { data, error } = await supabase
      .from('lists')
      .insert({
        user_id: list.user_id,
        name: list.name,
        auto_generated: list.auto_generated,
        visibility: list.visibility || 'private', // Default to private if not set
        description: list.description,
        list_type: list.list_type,
        icon: list.icon,
        color: list.color,
        type: list.type,
        is_curated: list.is_curated || false,
        publisher_name: list.publisher_name,
        publisher_logo_url: list.publisher_logo_url,
        external_link: list.external_link,
        location_scope: list.location_scope,
        curator_priority: list.curator_priority,
        created_at: list.created_at,
      })
      .select()
      .single();
    return { data, error };
  },

  async updateList(id: string, updates: Partial<List>) {
    const { data, error } = await supabase
      .from('lists')
      .update({
        name: updates.name,
        auto_generated: updates.auto_generated,

        visibility: updates.visibility,
        description: updates.description,
        list_type: updates.list_type,
        icon: updates.icon,
        color: updates.color,
        type: updates.type,
        is_curated: updates.is_curated,
        publisher_name: updates.publisher_name,
        publisher_logo_url: updates.publisher_logo_url,
        external_link: updates.external_link,
        location_scope: updates.location_scope,
        curator_priority: updates.curator_priority,
      })
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

  async addPlaceToList(listId: string, placeId: string, notes?: string) {
    const { data, error } = await supabase
      .from('list_places')
      .insert({
        list_id: listId,
        place_id: placeId,
        notes,
      })
      .select()
      .single();
    return { data, error };
  },

  async removePlaceFromList(listId: string, placeId: string) {
    const { error } = await supabase
      .from('list_places')
      .delete()
      .eq('list_id', listId)
      .eq('place_id', placeId);
    return { error };
  },
};

// Recommendation service functions
export const recommendationService = {
  async createRecommendationRequest(userId: string, context: any, suggestedPlaces: string[] = []) {
    const { data, error } = await supabase
      .from('recommendation_requests')
      .insert({
        user_id: userId,
        context,
        suggested_places: suggestedPlaces,
      })
      .select()
      .single();
    return { data, error };
  },

  async updateRecommendationFeedback(id: string, feedback: string) {
    const { data, error } = await supabase
      .from('recommendation_requests')
      .update({ user_feedback: feedback })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async getUserRecommendationHistory(userId: string) {
    const { data, error } = await supabase
      .from('recommendation_requests')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    return { data, error };
  },
}; 