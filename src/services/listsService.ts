import { supabase } from './supabase';
import { PlacesService } from './places';
import { Place, List, User, CheckIn, PlaceSuggestion, PlaceDetails, Location } from '../types';

// Enhanced type definitions for the new schema
export interface EnhancedPlace extends Place {
  hours?: Record<string, any>;
  phone?: string;
  website?: string;
  google_rating?: number;
  photos_urls?: string[];
  hours_open?: Record<string, any>;
}

export interface EnhancedList extends List {
  is_default?: boolean;
  description?: string;
  list_type?: string;
  icon?: string;
  color?: string;
  type?: 'user' | 'auto' | 'curated';
}

export interface ListPlace {
  list_id: string;
  place_id: string;
  added_at: string;
  notes?: string;
  personal_rating?: number;
  visit_count?: number;
  sort_order?: number;
}

export interface EnrichedListPlace extends ListPlace {
  place: EnhancedPlace;
}

export interface ListWithPlaces extends EnhancedList {
  places: EnrichedListPlace[];
  place_count: number;
}

export interface SmartListConfig {
  name: string;
  description: string;
  icon: string;
  color: string;
  generator: (userId: string) => Promise<string[]>; // Returns place IDs
}

export interface PlaceSearchResult {
  google_place_id: string;
  name: string;
  address: string;
  rating?: number;
  price_level?: number;
  photos?: string[];
  types?: string[];
  formatted_for_list: boolean;
}

// Error classes
export class ListError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ListError';
  }
}

export class PlaceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PlaceError';
  }
}

export class EnhancedListsService {
  private placesService: PlacesService;

  constructor() {
    this.placesService = new PlacesService();
  }

  // 1. LIST MANAGEMENT

  /**
   * Creates default Favorites list for new user signup
   */
  async createDefaultFavoritesList(userId: string): Promise<EnhancedList> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_favorites_list', {
        user_uuid: userId
      });

      if (error) throw error;

      // Get the created list details
      const { data: list, error: fetchError } = await supabase
        .from('lists')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      return {
        ...list,
        type: 'user'
      } as EnhancedList;
    } catch (error) {
      console.error('Error creating default favorites list:', error);
      throw new ListError('Failed to create default favorites list', 'CREATE_DEFAULT_ERROR');
    }
  }

  /**
   * Gets user's lists with proper sorting (Favorites pinned, then custom lists)
   * Updated to use optimized database function for better performance
   */
  async getUserLists(userId: string): Promise<ListWithPlaces[]> {
    try {
      // Use the optimized function to get lists with counts in a single query
      const { data: listsWithCounts, error: listsError } = await supabase.rpc(
        'get_user_lists_with_counts',
        { user_uuid: userId }
      );

      if (listsError) throw listsError;

      const result: ListWithPlaces[] = [];

      // For each list, get the places using the optimized function
      for (const list of listsWithCounts || []) {
        const { data: listData, error: placesError } = await supabase.rpc(
          'get_list_with_places_optimized',
          { 
            list_uuid: list.id,
            requesting_user_uuid: userId 
          }
        );

        if (placesError) throw placesError;

        // Group the results by list (should all be the same list)
        const places: EnrichedListPlace[] = [];
        
        if (listData && listData.length > 0) {
          // All rows should have the same list info, so take from first row
          const firstRow = listData[0];
          
          // Build places array from all rows that have place data
          for (const row of listData) {
            if (row.place_id) {
              places.push({
                list_id: row.list_id,
                place_id: row.place_id,
                added_at: row.added_at,
                notes: row.notes,
                personal_rating: row.personal_rating,
                visit_count: row.visit_count,
                sort_order: row.sort_order,
                place: {
                  id: row.place_id,
                  google_place_id: row.google_place_id,
                  name: row.place_name,
                  address: row.place_address || '',
                  coordinates: [0, 0], // PostGIS geometry parsing would go here
                  place_type: row.place_type,
                  google_types: row.google_types,
                  primary_type: row.primary_type,
                  price_level: row.price_level,
                  bangkok_context: row.bangkok_context,
                  google_rating: row.google_rating,
                  phone: row.place_phone,
                  website: row.place_website,
                  hours_open: row.hours_open,
                  photos_urls: row.place_photos
                }
              });
            }
          }
        }

        result.push({
          id: list.id,
          user_id: list.user_id,
          name: list.name,
          is_default: list.is_default,
          visibility: list.visibility || 'private', // Default to private if not set
          auto_generated: list.auto_generated,
          created_at: list.created_at,
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
          places: places,
          place_count: places.length,
        });
      }

      return result;
    } catch (error) {
      console.error('Error getting user lists:', error);
      throw new ListError('Failed to get user lists', 'GET_LISTS_ERROR');
    }
  }

  /**
   * Creates a new list
   */
  async createList(listData: {
    user_id: string;
    name: string;
    description?: string;
    visibility?: 'private' | 'public';
    icon?: string;
    color?: string;
  }): Promise<EnhancedList> {
    try {
      const { data: newList, error } = await supabase
        .from('lists')
        .insert({
          user_id: listData.user_id,
          name: listData.name,
          description: listData.description,
          visibility: listData.visibility || 'private',
          icon: listData.icon || 'list',
          color: listData.color || '#6B7280',
          auto_generated: false,
          is_default: false,
          type: 'user'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...newList,
        type: 'user'
      } as EnhancedList;
    } catch (error) {
      console.error('Error creating list:', error);
      throw new ListError('Failed to create list', 'CREATE_ERROR');
    }
  }

  /**
   * Updates an existing list
   */
  async updateList(listId: string, updates: Partial<EnhancedList>): Promise<EnhancedList> {
    try {
      const { data: updatedList, error } = await supabase
        .from('lists')
        .update({
          name: updates.name,
          description: updates.description,
          visibility: updates.visibility,
          icon: updates.icon,
          color: updates.color
        })
        .eq('id', listId)
        .select()
        .single();

      if (error) throw error;

      return {
        ...updatedList,
        ...updates
      } as EnhancedList;
    } catch (error) {
      console.error('Error updating list:', error);
      throw new ListError('Failed to update list', 'UPDATE_ERROR');
    }
  }

  /**
   * Deletes a list (cannot delete default favorites)
   */
  async deleteList(listId: string): Promise<void> {
    try {
      // Check if it's a default list
      const { data: list, error: fetchError } = await supabase
        .from('lists')
        .select('is_default')
        .eq('id', listId)
        .single();

      if (fetchError) throw fetchError;

      if (list?.is_default) {
        throw new ListError('Cannot delete default favorites list', 'DELETE_DEFAULT_ERROR');
      }

      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting list:', error);
      if (error instanceof ListError) throw error;
      throw new ListError('Failed to delete list', 'DELETE_ERROR');
    }
  }

  // 2. PLACE MANAGEMENT IN LISTS

  /**
   * Adds a place to a list with smart conflict resolution
   */
  async addPlaceToList(
    listId: string, 
    googlePlaceData: {
      google_place_id: string;
      name: string;
      address?: string;
      coordinates?: [number, number];
      place_type?: string;
      google_types?: string[]; // Full Google Places API types array
      price_level?: number;
      google_rating?: number;
      phone?: string;
      website?: string;
      hours_open?: Record<string, any>;
      photos_urls?: string[];
    },
    options?: {
      notes?: string;
      personal_rating?: number;
      sort_order?: number;
    }
  ): Promise<void> {
    try {
      // First, upsert the place using our database function
      const { data: placeId, error: upsertError } = await supabase.rpc('upsert_place_with_rich_data', {
        p_google_place_id: googlePlaceData.google_place_id,
        p_name: googlePlaceData.name,
        p_address: googlePlaceData.address,
        p_coordinates: googlePlaceData.coordinates ? 
          `POINT(${googlePlaceData.coordinates[0]} ${googlePlaceData.coordinates[1]})` : null,
        p_place_type: googlePlaceData.place_type,
        p_google_types: googlePlaceData.google_types || [],
        p_price_level: googlePlaceData.price_level,
        p_hours_open: googlePlaceData.hours_open || {},
        p_phone: googlePlaceData.phone,
        p_website: googlePlaceData.website,
        p_google_rating: googlePlaceData.google_rating,
        p_photos_urls: googlePlaceData.photos_urls || []
      });

      if (upsertError) throw upsertError;

      // Check if place is already in list
      const { data: existing, error: checkError } = await supabase
        .from('list_places')
        .select('list_id')
        .eq('list_id', listId)
        .eq('place_id', placeId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw checkError;
      }

      if (existing) {
        // Place already in list, just update the metadata
        const { error: updateError } = await supabase
          .from('list_places')
          .update({
            notes: options?.notes,
            personal_rating: options?.personal_rating,
            sort_order: options?.sort_order
          })
          .eq('list_id', listId)
          .eq('place_id', placeId);

        if (updateError) throw updateError;
      } else {
        // Add place to list
        const { error: insertError } = await supabase
          .from('list_places')
          .insert({
            list_id: listId,
            place_id: placeId,
            notes: options?.notes,
            personal_rating: options?.personal_rating,
            sort_order: options?.sort_order || 0
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error adding place to list:', error);
      throw new PlaceError('Failed to add place to list', 'ADD_PLACE_ERROR');
    }
  }

  /**
   * Removes a place from a list
   */
  async removePlaceFromList(listId: string, placeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('list_places')
        .delete()
        .eq('list_id', listId)
        .eq('place_id', placeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing place from list:', error);
      throw new PlaceError('Failed to remove place from list', 'REMOVE_PLACE_ERROR');
    }
  }

  /**
   * Reorders places in a list
   */
  async reorderPlacesInList(listId: string, placeOrders: { place_id: string; sort_order: number }[]): Promise<void> {
    try {
      // Update sort orders in batch
      const updates = placeOrders.map(({ place_id, sort_order }) => 
        supabase
          .from('list_places')
          .update({ sort_order })
          .eq('list_id', listId)
          .eq('place_id', place_id)
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering places in list:', error);
      throw new PlaceError('Failed to reorder places', 'REORDER_ERROR');
    }
  }

  /**
   * Updates place metadata in a list (notes, personal rating)
   */
  async updatePlaceInList(
    listId: string, 
    placeId: string, 
    updates: {
      notes?: string;
      personal_rating?: number;
      sort_order?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('list_places')
        .update(updates)
        .eq('list_id', listId)
        .eq('place_id', placeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating place in list:', error);
      throw new PlaceError('Failed to update place in list', 'UPDATE_PLACE_ERROR');
    }
  }

  // 3. SMART LISTS

  /**
   * Generates "Most Visited" smart list based on check-ins
   * Criteria: 3+ visits, last 3 months, recent bias
   */
  async generateMostVisitedList(userId: string): Promise<string[]> {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('place_id, timestamp')
        .eq('user_id', userId)
        .gte('timestamp', threeMonthsAgo.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Count visits per place with recency bias
      const placeVisits = new Map<string, { count: number; lastVisit: Date; score: number }>();
      
      checkIns?.forEach(checkIn => {
        const placeId = checkIn.place_id;
        const visitDate = new Date(checkIn.timestamp);
        
        if (!placeVisits.has(placeId)) {
          placeVisits.set(placeId, { count: 0, lastVisit: visitDate, score: 0 });
        }
        
        const place = placeVisits.get(placeId)!;
        place.count++;
        if (visitDate > place.lastVisit) {
          place.lastVisit = visitDate;
        }
      });

      // Calculate scores with recency bias
      const now = new Date();
      placeVisits.forEach((data, placeId) => {
        const daysSinceLastVisit = (now.getTime() - data.lastVisit.getTime()) / (1000 * 60 * 60 * 24);
        const recencyFactor = Math.max(0.1, 1 - (daysSinceLastVisit / 90)); // Decay over 90 days
        data.score = data.count * recencyFactor;
      });

      // Filter places with 3+ visits and sort by score
      return Array.from(placeVisits.entries())
        .filter(([_, data]) => data.count >= 3)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 20) // Limit to top 20
        .map(([placeId, _]) => placeId);
    } catch (error) {
      console.error('Error generating most visited list:', error);
      throw new ListError('Failed to generate most visited list', 'SMART_LIST_ERROR');
    }
  }

  /**
   * Placeholder for "Try Next" smart list
   * Logic: Places saved but never visited, prioritized by rating and recency
   */
  async generateTryNextList(userId: string): Promise<string[]> {
    // TODO: Implement based on places in lists but no check-ins
    return [];
  }

  /**
   * Placeholder for "Weekend Spots" smart list
   * Logic: Places checked in on weekends with good ratings
   */
  async generateWeekendSpotsList(userId: string): Promise<string[]> {
    // TODO: Implement based on weekend check-ins
    return [];
  }

  /**
   * Creates or updates a smart list
   */
  async createOrUpdateSmartList(userId: string, config: SmartListConfig): Promise<EnhancedList> {
    try {
      // Generate place IDs using the config's generator function
      const placeIds = await config.generator(userId);

      // Check if smart list already exists
      const { data: existingList, error: fetchError } = await supabase
        .from('lists')
        .select('id')
        .eq('user_id', userId)
        .eq('name', config.name)
        .eq('auto_generated', true)
        .single();

      let listId: string;

      if (existingList) {
        // Update existing smart list
        listId = existingList.id;
        
        // Clear existing places
        await supabase
          .from('list_places')
          .delete()
          .eq('list_id', listId);
      } else {
        // Create new smart list
        const { data: newList, error: createError } = await supabase
          .from('lists')
          .insert({
            user_id: userId,
            name: config.name,
            description: config.description,
            auto_generated: true,
            visibility: 'private',
            icon: config.icon,
            color: config.color,
            type: 'auto'
          })
          .select()
          .single();

        if (createError) throw createError;
        listId = newList.id;
      }

      // Add places to the smart list
      if (placeIds.length > 0) {
        const listPlaces = placeIds.map((placeId, index) => ({
          list_id: listId,
          place_id: placeId,
          sort_order: index
        }));

        const { error: insertError } = await supabase
          .from('list_places')
          .insert(listPlaces);

        if (insertError) throw insertError;
      }

      // Return the updated list
      const { data: list, error: finalError } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (finalError) throw finalError;

      return {
        ...list,
        type: 'auto'
      } as EnhancedList;
    } catch (error) {
      console.error('Error creating/updating smart list:', error);
      throw new ListError('Failed to create smart list', 'SMART_LIST_ERROR');
    }
  }

  // 4. PLACE SEARCH FOR LISTS

  /**
   * Searches places using Google Places API for list addition
   */
  async searchPlacesForList(
    query: string, 
    location?: Location, 
    limit: number = 10
  ): Promise<PlaceSearchResult[]> {
    try {
      // Use the existing places service for autocomplete
      const suggestions = await this.placesService.getPlaceAutocomplete(query, location);
      
      // Get detailed information for each suggestion
      const results: PlaceSearchResult[] = [];
      
      for (const suggestion of suggestions.slice(0, limit)) {
        try {
          const details = await this.placesService.getPlaceDetails(suggestion.place_id);
          
          results.push({
            google_place_id: details.google_place_id,
            name: details.name,
            address: details.address,
            rating: details.rating,
            price_level: details.price_level,
            photos: details.photos?.slice(0, 3), // Limit to 3 photos
            types: details.types,
            formatted_for_list: true
          });
        } catch (error) {
          console.warn(`Failed to get details for place ${suggestion.place_id}:`, error);
          // Still include basic info from suggestion
          results.push({
            google_place_id: suggestion.place_id,
            name: suggestion.main_text,
            address: suggestion.secondary_text,
            types: [], // No types available from suggestion
            formatted_for_list: true
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error searching places for list:', error);
      throw new PlaceError('Failed to search places', 'SEARCH_ERROR');
    }
  }

  /**
   * Gets place details by Google Place ID for list addition
   */
  async getPlaceDetailsForList(googlePlaceId: string): Promise<PlaceSearchResult> {
    try {
      const details = await this.placesService.getPlaceDetails(googlePlaceId);
      
      return {
        google_place_id: details.google_place_id,
        name: details.name,
        address: details.address,
        rating: details.rating,
        price_level: details.price_level,
        photos: details.photos?.slice(0, 5),
        types: details.types,
        formatted_for_list: true
      };
    } catch (error) {
      console.error('Error getting place details for list:', error);
      throw new PlaceError('Failed to get place details', 'DETAILS_ERROR');
    }
  }

  // 5. UTILITY METHODS

  /**
   * Gets list statistics for a user
   */
  async getListStats(userId: string): Promise<{
    totalLists: number;
    userLists: number;
    smartLists: number;
    totalPlaces: number;
    favoritesCount: number;
  }> {
    try {
      const { data: lists, error } = await supabase
        .from('lists')
        .select('id, auto_generated, is_default')
        .eq('user_id', userId);

      if (error) throw error;

      const { data: totalPlaces, error: placesError } = await supabase
        .from('list_places')
        .select('place_id', { count: 'exact' })
        .in('list_id', lists?.map(l => l.id) || []);

      if (placesError) throw placesError;

      const userLists = lists?.filter(l => !l.auto_generated).length || 0;
      const smartLists = lists?.filter(l => l.auto_generated).length || 0;
      const favoritesCount = lists?.find(l => l.is_default) ? 1 : 0;

      return {
        totalLists: lists?.length || 0,
        userLists,
        smartLists,
        totalPlaces: totalPlaces?.length || 0,
        favoritesCount
      };
    } catch (error) {
      console.error('Error getting list stats:', error);
      throw new ListError('Failed to get list statistics', 'STATS_ERROR');
    }
  }

  /**
   * Checks if a place exists in any of user's lists
   */
  async isPlaceInUserLists(userId: string, googlePlaceId: string): Promise<{
    inLists: boolean;
    listNames: string[];
  }> {
    try {
      const { data, error } = await supabase
        .from('enriched_list_places')
        .select('list_name')
        .eq('user_id', userId)
        .eq('google_place_id', googlePlaceId);

      if (error) throw error;

      const listNames = [...new Set(data?.map(d => d.list_name) || [])];

      return {
        inLists: listNames.length > 0,
        listNames
      };
    } catch (error) {
      console.error('Error checking if place is in user lists:', error);
      return { inLists: false, listNames: [] };
    }
  }
}

// Export singleton instance
export const enhancedListsService = new EnhancedListsService();
export default enhancedListsService; 