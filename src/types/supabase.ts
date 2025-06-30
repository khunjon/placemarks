// Supabase Database Types
// Updated to reflect current schema after place_id migration
// Generated based on live database schema inspection

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      check_ins: {
        Row: {
          id: string
          user_id: string | null
          place_id: string | null
          timestamp: string | null
          tags: string[] | null
          context: Json | null
          photos: string[] | null
          notes: string | null
          created_at: string | null
          weather_context: Json | null
          companion_type: string | null
          meal_type: string | null
          transportation_method: string | null
          visit_duration: number | null
          would_return: boolean | null
          updated_at: string | null
          rating: string | null
          comment: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          place_id?: string | null
          timestamp?: string | null
          tags?: string[] | null
          context?: Json | null
          photos?: string[] | null
          notes?: string | null
          created_at?: string | null
          weather_context?: Json | null
          companion_type?: string | null
          meal_type?: string | null
          transportation_method?: string | null
          visit_duration?: number | null
          would_return?: boolean | null
          updated_at?: string | null
          rating?: string | null
          comment?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          place_id?: string | null
          timestamp?: string | null
          tags?: string[] | null
          context?: Json | null
          photos?: string[] | null
          notes?: string | null
          created_at?: string | null
          weather_context?: Json | null
          companion_type?: string | null
          meal_type?: string | null
          transportation_method?: string | null
          visit_duration?: number | null
          would_return?: boolean | null
          updated_at?: string | null
          rating?: string | null
          comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_check_ins_place_id"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "google_places_cache"
            referencedColumns: ["google_place_id"]
          },
        ]
      }
      editorial_places: {
        Row: {
          google_place_id: string
          custom_description: string | null
          featured_image_url: string | null
          pro_tips: string | null
          editorial_notes: string | null
          is_featured: boolean | null
          admin_tags: string[] | null
          priority_score: number | null
          city_context: Json | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          google_place_id: string
          custom_description?: string | null
          featured_image_url?: string | null
          pro_tips?: string | null
          editorial_notes?: string | null
          is_featured?: boolean | null
          admin_tags?: string[] | null
          priority_score?: number | null
          city_context?: Json | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          google_place_id?: string
          custom_description?: string | null
          featured_image_url?: string | null
          pro_tips?: string | null
          editorial_notes?: string | null
          is_featured?: boolean | null
          admin_tags?: string[] | null
          priority_score?: number | null
          city_context?: Json | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_editorial_places_google_place_id"
            columns: ["google_place_id"]
            isOneToOne: true
            referencedRelation: "google_places_cache"
            referencedColumns: ["google_place_id"]
          },
        ]
      }
      google_places_cache: {
        Row: {
          google_place_id: string
          name: string | null
          formatted_address: string | null
          geometry: Json | null
          types: string[] | null
          rating: number | null
          user_ratings_total: number | null
          price_level: number | null
          formatted_phone_number: string | null
          international_phone_number: string | null
          website: string | null
          opening_hours: Json | null
          current_opening_hours: Json | null
          photos: Json | null
          reviews: Json | null
          business_status: string | null
          place_id: string | null
          plus_code: Json | null
          cached_at: string | null
          expires_at: string | null
          last_accessed: string | null
          access_count: number | null
          has_basic_data: boolean | null
          has_contact_data: boolean | null
          has_hours_data: boolean | null
          has_photos_data: boolean | null
          has_reviews_data: boolean | null
          created_at: string | null
          updated_at: string | null
          photo_urls: string[] | null
        }
        Insert: {
          google_place_id: string
          name?: string | null
          formatted_address?: string | null
          geometry?: Json | null
          types?: string[] | null
          rating?: number | null
          user_ratings_total?: number | null
          price_level?: number | null
          formatted_phone_number?: string | null
          international_phone_number?: string | null
          website?: string | null
          opening_hours?: Json | null
          current_opening_hours?: Json | null
          photos?: Json | null
          reviews?: Json | null
          business_status?: string | null
          place_id?: string | null
          plus_code?: Json | null
          cached_at?: string | null
          expires_at?: string | null
          last_accessed?: string | null
          access_count?: number | null
          has_basic_data?: boolean | null
          has_contact_data?: boolean | null
          has_hours_data?: boolean | null
          has_photos_data?: boolean | null
          has_reviews_data?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          photo_urls?: string[] | null
        }
        Update: {
          google_place_id?: string
          name?: string | null
          formatted_address?: string | null
          geometry?: Json | null
          types?: string[] | null
          rating?: number | null
          user_ratings_total?: number | null
          price_level?: number | null
          formatted_phone_number?: string | null
          international_phone_number?: string | null
          website?: string | null
          opening_hours?: Json | null
          current_opening_hours?: Json | null
          photos?: Json | null
          reviews?: Json | null
          business_status?: string | null
          place_id?: string | null
          plus_code?: Json | null
          cached_at?: string | null
          expires_at?: string | null
          last_accessed?: string | null
          access_count?: number | null
          has_basic_data?: boolean | null
          has_contact_data?: boolean | null
          has_hours_data?: boolean | null
          has_photos_data?: boolean | null
          has_reviews_data?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          photo_urls?: string[] | null
        }
        Relationships: []
      }
      list_places: {
        Row: {
          list_id: string
          place_id: string | null
          added_at: string | null
          notes: string | null
          personal_rating: number | null
          visit_count: number | null
          sort_order: number | null
        }
        Insert: {
          list_id: string
          place_id?: string | null
          added_at?: string | null
          notes?: string | null
          personal_rating?: number | null
          visit_count?: number | null
          sort_order?: number | null
        }
        Update: {
          list_id?: string
          place_id?: string | null
          added_at?: string | null
          notes?: string | null
          personal_rating?: number | null
          visit_count?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "list_places_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_list_places_place_id"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "google_places_cache"
            referencedColumns: ["google_place_id"]
          },
        ]
      }
      lists: {
        Row: {
          id: string
          user_id: string | null
          name: string
          auto_generated: boolean | null
          created_at: string | null
          description: string | null
          list_type: string | null
          icon: string | null
          color: string | null
          type: string | null
          is_default: boolean | null
          visibility: string | null
          publisher_name: string | null
          publisher_logo_url: string | null
          external_link: string | null
          location_scope: string | null
          is_curated: boolean | null
          curator_priority: number | null
          updated_at: string | null
          default_list_type: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          auto_generated?: boolean | null
          created_at?: string | null
          description?: string | null
          list_type?: string | null
          icon?: string | null
          color?: string | null
          type?: string | null
          is_default?: boolean | null
          visibility?: string | null
          publisher_name?: string | null
          publisher_logo_url?: string | null
          external_link?: string | null
          location_scope?: string | null
          is_curated?: boolean | null
          curator_priority?: number | null
          updated_at?: string | null
          default_list_type?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          auto_generated?: boolean | null
          created_at?: string | null
          description?: string | null
          list_type?: string | null
          icon?: string | null
          color?: string | null
          type?: string | null
          is_default?: boolean | null
          visibility?: string | null
          publisher_name?: string | null
          publisher_logo_url?: string | null
          external_link?: string | null
          location_scope?: string | null
          is_curated?: boolean | null
          curator_priority?: number | null
          updated_at?: string | null
          default_list_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          id: string
          google_place_id: string
          name: string
          address: string | null
          place_type: string | null
          price_level: number | null
          bangkok_context: Json | null
          created_at: string | null
          coordinates: unknown | null
          hours: Json | null
          phone: string | null
          website: string | null
          google_rating: number | null
          photos_urls: string[] | null
          hours_open: Json | null
          google_types: string[]
          primary_type: string | null
          photo_references: Json | null
        }
        Insert: {
          id?: string
          google_place_id: string
          name: string
          address?: string | null
          place_type?: string | null
          price_level?: number | null
          bangkok_context?: Json | null
          created_at?: string | null
          coordinates?: unknown | null
          hours?: Json | null
          phone?: string | null
          website?: string | null
          google_rating?: number | null
          photos_urls?: string[] | null
          hours_open?: Json | null
          google_types?: string[]
          primary_type?: string | null
          photo_references?: Json | null
        }
        Update: {
          id?: string
          google_place_id?: string
          name?: string
          address?: string | null
          place_type?: string | null
          price_level?: number | null
          bangkok_context?: Json | null
          created_at?: string | null
          coordinates?: unknown | null
          hours?: Json | null
          phone?: string | null
          website?: string | null
          google_rating?: number | null
          photos_urls?: string[] | null
          hours_open?: Json | null
          google_types?: string[]
          primary_type?: string | null
          photo_references?: Json | null
        }
        Relationships: []
      }
      recommendation_requests: {
        Row: {
          id: string
          user_id: string | null
          context: Json
          suggested_places: string[] | null
          user_feedback: string | null
          timestamp: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          context: Json
          suggested_places?: string[] | null
          user_feedback?: string | null
          timestamp?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          context?: Json
          suggested_places?: string[] | null
          user_feedback?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_place_ratings: {
        Row: {
          id: string
          user_id: string
          place_id: string | null
          rating_type: string
          rating_value: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          place_id?: string | null
          rating_type: string
          rating_value?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          place_id?: string | null
          rating_type?: string
          rating_value?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_place_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_place_ratings_place_id"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "google_places_cache"
            referencedColumns: ["google_place_id"]
          },
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          auth_provider: string
          preferences: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          auth_provider?: string
          preferences?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          auth_provider?: string
          preferences?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for working with the database
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'] 