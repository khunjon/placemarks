import { supabase } from './supabase';
import { placesService } from './places';
import { EnrichedPlace, List, User, CheckIn, PlaceSuggestion, PlaceDetails, Location } from '../types';
import { AppError, ErrorType, ErrorSeverity, ErrorFactory, ErrorLogger, safeAsync, ErrorContext } from '../utils/errorHandling';

// Enhanced type definitions for the new schema
export interface EnhancedList extends List {
  is_default?: boolean;
  description?: string;
  list_type?: string;
  icon?: string;
  color?: string;
  type?: 'user' | 'auto' | 'curated';
  default_list_type?: string;
}

export interface ListPlace {
  list_id: string;
  place_id: string; // Google Place ID
  added_at: string;
  notes?: string;
  personal_rating?: number;
  visit_count?: number;
  sort_order?: number;
}

export interface EnrichedListPlace extends ListPlace {
  place: EnrichedPlace;
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
  generator: (userId: string) => Promise<string[]>; // Returns Google Place IDs
}

// Error classes extending AppError for standardization
export class ListError extends AppError {
  constructor(
    message: string, 
    code: string, 
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(
      message,
      ErrorType.DATABASE_ERROR,
      code,
      severity,
      { service: 'lists', ...context },
      originalError,
      true
    );
    this.name = 'ListError';
  }
}

export class PlaceError extends AppError {
  constructor(
    message: string, 
    code: string, 
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Partial<ErrorContext>,
    originalError?: Error
  ) {
    super(
      message,
      ErrorType.DATABASE_ERROR,
      code,
      severity,
      { service: 'lists', ...context },
      originalError,
      true
    );
    this.name = 'PlaceError';
  }
}

export class ListsService {
  // 1. LIST MANAGEMENT

  /**
   * Get all lists for a user with place counts
   */
  async getUserLists(userId: string): Promise<EnhancedList[]> {
    return safeAsync(async () => {
      const { data: lists, error } = await supabase
        .from('user_lists_with_counts')
        .select('*')
        .eq('user_id', userId)
        // Note: is_curated column doesn't exist in user_lists_with_counts view
        // This view should only contain user lists, not curated lists
        .order('created_at', { ascending: false });

      if (error) {
        throw ErrorFactory.database(
          `Failed to get user lists: ${error.message}`,
          { service: 'lists', operation: 'getUserLists', userId },
          error
        );
      }
      
      return lists || [];
    }, { service: 'lists', operation: 'getUserLists', userId });
  }

  /**
   * Get lists with their places for a user
   */
  async getUserListsWithPlaces(userId: string): Promise<ListWithPlaces[]> {
    return safeAsync(async () => {
      const { data: listData, error } = await supabase
        .from('lists')
        .select(`
          id,
          user_id,
          name,
          auto_generated,
          visibility,
          description,
          list_type,
          icon,
          color,
          type,
          is_default,
          default_list_type,
          is_curated,
          publisher_name,
          publisher_logo_url,
          external_link,
          location_scope,
          curator_priority,
          created_at,
          list_places (
            list_id,
            place_id,
            added_at,
            notes,
            personal_rating,
            visit_count,
            sort_order,
            enriched_places (
              google_place_id,
              name,
              formatted_address,
              geometry,
              types,
              rating,
              price_level,
              formatted_phone_number,
              website,
              opening_hours,
              photo_urls,
              primary_image_url,
              display_description,
              is_featured,
              has_editorial_content,
              business_status
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_curated', false)
        .order('created_at', { ascending: false });

      if (error) {
        throw ErrorFactory.database(
          `Failed to get user lists with places: ${error.message}`,
          { service: 'lists', operation: 'getUserListsWithPlaces', userId },
          error
        );
      }

      const result: ListWithPlaces[] = [];

      for (const list of listData || []) {
        // Get places for this list separately with manual join
        const { data: listPlacesData, error: placesError } = await supabase
          .from('list_places')
          .select(`
            list_id,
            place_id,
            added_at,
            notes,
            personal_rating,
            visit_count,
            sort_order
          `)
          .eq('list_id', list.id)
          .order('sort_order', { ascending: true });

        if (placesError) {
          console.error(`Error fetching places for list ${list.name}:`, placesError);
          continue;
        }

        const places: EnrichedListPlace[] = [];
        
        // For each list place, get the enriched place data
        for (const listPlace of listPlacesData || []) {
          const { data: enrichedPlace, error: enrichedError } = await supabase
            .from('enriched_places')
            .select('*')
            .eq('google_place_id', listPlace.place_id)
            .single();

          if (enrichedError) {
            console.warn(`Could not find enriched place for ${listPlace.place_id}:`, enrichedError);
            continue;
          }

          // Include places that are operational or have unknown status (null)
          if (enrichedPlace && (enrichedPlace.business_status === 'OPERATIONAL' || enrichedPlace.business_status === null)) {
            places.push({
              list_id: listPlace.list_id,
              place_id: listPlace.place_id,
              added_at: listPlace.added_at,
              notes: listPlace.notes,
              personal_rating: listPlace.personal_rating,
              visit_count: listPlace.visit_count,
              sort_order: listPlace.sort_order,
              place: enrichedPlace as EnrichedPlace
            });
          }
        }

        result.push({
          id: list.id,
          user_id: list.user_id,
          name: list.name,
          auto_generated: list.auto_generated,
          visibility: list.visibility,
          description: list.description,
          list_type: list.list_type,
          icon: list.icon,
          color: list.color,
          type: list.type,
          is_default: list.is_default,
          default_list_type: list.default_list_type,
          is_curated: list.is_curated,
          publisher_name: list.publisher_name,
          publisher_logo_url: list.publisher_logo_url,
          external_link: list.external_link,
          location_scope: list.location_scope,
          curator_priority: list.curator_priority,
          created_at: list.created_at,
          places,
          place_count: places.length
        });
      }

      return result;
    }, { service: 'lists', operation: 'getUserListsWithPlaces', userId });
  }

  /**
   * Get default lists (Favorites and Want to Go) for a user
   */
  async getDefaultLists(userId: string): Promise<ListWithPlaces[]> {
    const allLists = await this.getUserListsWithPlaces(userId);
    return allLists.filter(list => list.is_default);
  }

  /**
   * Get custom (non-default) lists for a user
   */
  async getCustomLists(userId: string): Promise<ListWithPlaces[]> {
    const allLists = await this.getUserListsWithPlaces(userId);
    return allLists.filter(list => !list.is_default);
  }

  /**
   * Get favorites list for a user
   */
  async getFavoritesList(userId: string): Promise<ListWithPlaces | null> {
    const allLists = await this.getUserListsWithPlaces(userId);
    return allLists.find(list => list.is_default && list.default_list_type === 'favorites') || null;
  }

  /**
   * Get want to go list for a user
   */
  async getWantToGoList(userId: string): Promise<ListWithPlaces | null> {
    const allLists = await this.getUserListsWithPlaces(userId);
    return allLists.find(list => list.is_default && list.default_list_type === 'want_to_go') || null;
  }

  /**
   * Create a new list
   */
  async createList(
    userId: string,
    name: string,
    options?: {
      description?: string;
      list_type?: string;
      icon?: string;
      color?: string;
      visibility?: 'private' | 'friends' | 'public' | 'curated';
      is_default?: boolean;
    }
  ): Promise<EnhancedList> {
    return safeAsync(async () => {
      // Validate input
      if (!name || name.trim().length === 0) {
        throw ErrorFactory.validation(
          'List name is required',
          { service: 'lists', operation: 'createList', userId }
        );
      }

      const { data: list, error } = await supabase
        .from('lists')
        .insert({
          user_id: userId,
          name,
          auto_generated: false,
          visibility: options?.visibility || 'private',
          description: options?.description,
          list_type: options?.list_type,
          icon: options?.icon,
          color: options?.color,
          type: 'user',
          is_default: options?.is_default || false,
          is_curated: false
        })
        .select()
        .single();

      if (error) {
        throw ErrorFactory.database(
          `Failed to create list: ${error.message}`,
          { service: 'lists', operation: 'createList', userId, metadata: { listName: name } },
          error
        );
      }
      
      return list;
    }, { service: 'lists', operation: 'createList', userId });
  }

  /**
   * Update a list
   */
  async updateList(
    listId: string,
    updates: {
      name?: string;
      description?: string;
      visibility?: 'private' | 'friends' | 'public' | 'curated';
      icon?: string;
      color?: string;
    }
  ): Promise<void> {
    return safeAsync(async () => {
      const { error } = await supabase
        .from('lists')
        .update(updates)
        .eq('id', listId);

      if (error) {
        throw ErrorFactory.database(
          `Failed to update list: ${error.message}`,
          { service: 'lists', operation: 'updateList', metadata: { listId, updates } },
          error
        );
      }
    }, { service: 'lists', operation: 'updateList', metadata: { listId } });
  }

  /**
   * Delete a list
   */
  async deleteList(listId: string): Promise<void> {
    return safeAsync(async () => {
      // Check if it's a default list
      const { data: list, error: fetchError } = await supabase
        .from('lists')
        .select('is_default')
        .eq('id', listId)
        .single();

      if (fetchError) {
        throw ErrorFactory.database(
          `Failed to fetch list for deletion: ${fetchError.message}`,
          { service: 'lists', operation: 'deleteList', metadata: { listId } },
          fetchError
        );
      }

      if (list?.is_default) {
        throw new ListError(
          'Cannot delete default favorites list', 
          'DELETE_DEFAULT_ERROR', 
          ErrorSeverity.LOW,
          { operation: 'deleteList', metadata: { listId } }
        );
      }

      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId);

      if (error) {
        throw ErrorFactory.database(
          `Failed to delete list: ${error.message}`,
          { service: 'lists', operation: 'deleteList', metadata: { listId } },
          error
        );
      }
    }, { service: 'lists', operation: 'deleteList', metadata: { listId } });
  }

  // 2. PLACE MANAGEMENT IN LISTS

  /**
   * Add a place to a list using Google Place ID
   */
  async addPlaceToList(
    listId: string,
    googlePlaceId: string,
    options?: {
      notes?: string;
      personal_rating?: number;
      sort_order?: number;
    }
  ): Promise<void> {
    return safeAsync(async () => {
      // Verify the place exists in google_places_cache
      const { data: existingPlace, error: cacheCheckError } = await supabase
        .from('google_places_cache')
        .select('google_place_id')
        .eq('google_place_id', googlePlaceId)
        .single();

      if (cacheCheckError && cacheCheckError.code !== 'PGRST116') {
        throw ErrorFactory.database(
          `Failed to check place cache: ${cacheCheckError.message}`,
          { service: 'lists', operation: 'addPlaceToList', metadata: { listId, googlePlaceId } },
          cacheCheckError
        );
      }

      if (!existingPlace) {
        throw new PlaceError(
          'Place not found in cache. Please ensure place is cached first.', 
          'PLACE_NOT_CACHED', 
          ErrorSeverity.LOW,
          { operation: 'addPlaceToList', metadata: { listId, googlePlaceId } }
        );
      }

      // Check if place is already in list
      const { data: existing, error: listCheckError } = await supabase
        .from('list_places')
        .select('list_id')
        .eq('list_id', listId)
        .eq('place_id', googlePlaceId)
        .single();

      if (listCheckError && listCheckError.code !== 'PGRST116') {
        throw ErrorFactory.database(
          `Failed to check if place exists in list: ${listCheckError.message}`,
          { service: 'lists', operation: 'addPlaceToList', metadata: { listId, googlePlaceId } },
          listCheckError
        );
      }

      if (existing) {
        // Place already in list, update metadata
        const { error: updateError } = await supabase
          .from('list_places')
          .update({
            notes: options?.notes,
            personal_rating: options?.personal_rating,
            sort_order: options?.sort_order
          })
          .eq('list_id', listId)
          .eq('place_id', googlePlaceId);

        if (updateError) {
          throw ErrorFactory.database(
            `Failed to update place in list: ${updateError.message}`,
            { service: 'lists', operation: 'addPlaceToList', metadata: { listId, googlePlaceId, updating: true } },
            updateError
          );
        }
      } else {
        // Add place to list
        const { error: insertError } = await supabase
          .from('list_places')
          .insert({
            list_id: listId,
            place_id: googlePlaceId,
            notes: options?.notes,
            personal_rating: options?.personal_rating,
            sort_order: options?.sort_order || 0
          });

        if (insertError) {
          throw ErrorFactory.database(
            `Failed to add place to list: ${insertError.message}`,
            { service: 'lists', operation: 'addPlaceToList', metadata: { listId, googlePlaceId } },
            insertError
          );
        }
      }
    }, { service: 'lists', operation: 'addPlaceToList', metadata: { listId, googlePlaceId } });
  }

  /**
   * Remove a place from a list
   */
  async removePlaceFromList(listId: string, googlePlaceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('list_places')
        .delete()
        .eq('list_id', listId)
        .eq('place_id', googlePlaceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing place from list:', error);
      throw new PlaceError('Failed to remove place from list', 'REMOVE_PLACE_ERROR');
    }
  }

  /**
   * Update place metadata in a list
   */
  async updatePlaceInList(
    listId: string,
    googlePlaceId: string,
    updates: {
      notes?: string;
      personal_rating?: number;
      sort_order?: number;
      visit_count?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('list_places')
        .update(updates)
        .eq('list_id', listId)
        .eq('place_id', googlePlaceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating place in list:', error);
      throw new PlaceError('Failed to update place in list', 'UPDATE_PLACE_ERROR');
    }
  }

  /**
   * Reorder places in a list
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
      throw new PlaceError('Failed to reorder places in list', 'REORDER_ERROR');
    }
  }

  /**
   * Get places for a specific list
   */
  async getListPlaces(listId: string): Promise<EnrichedListPlace[]> {
    try {
      const { data: listPlaces, error } = await supabase
        .from('list_places')
        .select(`
          list_id,
          place_id,
          added_at,
          notes,
          personal_rating,
          visit_count,
          sort_order,
          enriched_places (
            google_place_id,
            name,
            formatted_address,
            geometry,
            types,
            rating,
            price_level,
            formatted_phone_number,
            website,
            opening_hours,
            photo_urls,
            primary_image_url,
            display_description,
            is_featured,
            has_editorial_content,
            business_status
          )
        `)
        .eq('list_id', listId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const result: EnrichedListPlace[] = [];
      
      for (const listPlace of listPlaces || []) {
        if (listPlace.enriched_places) {
          const place = Array.isArray(listPlace.enriched_places) 
            ? listPlace.enriched_places[0] 
            : listPlace.enriched_places;
          
          if (place && place.business_status === 'OPERATIONAL') {
            result.push({
              list_id: listPlace.list_id,
              place_id: listPlace.place_id,
              added_at: listPlace.added_at,
              notes: listPlace.notes,
              personal_rating: listPlace.personal_rating,
              visit_count: listPlace.visit_count,
              sort_order: listPlace.sort_order,
              place: place as EnrichedPlace
            });
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting list places:', error);
      throw new ListError('Failed to get list places', 'GET_LIST_PLACES_ERROR');
    }
  }

  // 3. SMART LIST GENERATION

  /**
   * Generate auto lists based on user's check-ins
   */
  async generateSmartLists(userId: string): Promise<EnhancedList[]> {
    try {
      const smartListConfigs: SmartListConfig[] = [
        {
          name: 'Recent Check-ins',
          description: 'Places you\'ve visited recently',
          icon: '🕒',
          color: '#4A90E2',
          generator: (userId: string) => this.getRecentCheckInPlaces(userId, 30)
        },
        {
          name: 'Top Rated',
          description: 'Your highest rated places',
          icon: '⭐',
          color: '#F5A623',
          generator: (userId: string) => this.getTopRatedPlaces(userId)
        },
        {
          name: 'Frequently Visited',
          description: 'Places you visit often',
          icon: '🔄',
          color: '#7ED321',
          generator: (userId: string) => this.getFrequentlyVisitedPlaces(userId)
        }
      ];

      const generatedLists: EnhancedList[] = [];

      for (const config of smartListConfigs) {
        try {
          const placeIds = await config.generator(userId);
          
          if (placeIds.length > 0) {
            // Check if smart list already exists
            const { data: existingList, error: checkError } = await supabase
              .from('lists')
              .select('id')
              .eq('user_id', userId)
              .eq('name', config.name)
              .eq('auto_generated', true)
              .single();

            if (checkError && checkError.code !== 'PGRST116') {
              throw checkError;
            }

            let listId: string;

            if (existingList) {
              // Update existing list
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
                  icon: config.icon,
                  color: config.color,
                  auto_generated: true,
                  visibility: 'private',
                  type: 'auto',
                  is_curated: false
                })
                .select()
                .single();

              if (createError) throw createError;
              listId = newList.id;
            }

            // Add places to list
            const listPlaceInserts = placeIds.map((placeId, index) => ({
              list_id: listId,
              place_id: placeId,
              sort_order: index
            }));

            await supabase
              .from('list_places')
              .insert(listPlaceInserts);

            // Get the updated list
            const { data: updatedList, error: fetchError } = await supabase
              .from('lists')
              .select('*')
              .eq('id', listId)
              .single();

            if (fetchError) throw fetchError;
            if (updatedList) generatedLists.push(updatedList);
          }
        } catch (error) {
          console.error(`Error generating smart list "${config.name}":`, error);
          // Continue with other lists even if one fails
        }
      }

      return generatedLists;
    } catch (error) {
      console.error('Error generating smart lists:', error);
      throw new ListError('Failed to generate smart lists', 'SMART_LIST_ERROR');
    }
  }

  // 4. HELPER METHODS FOR SMART LISTS

  /**
   * Get recent check-in places for a user
   */
  private async getRecentCheckInPlaces(userId: string, days: number = 30): Promise<string[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('place_id')
        .eq('user_id', userId)
        .gte('timestamp', cutoffDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Remove duplicates and return place IDs
      const uniquePlaceIds = new Set(checkIns?.map(c => c.place_id));
      return Array.from(uniquePlaceIds).slice(0, 20);
    } catch (error) {
      console.error('Error getting recent check-in places:', error);
      return [];
    }
  }

  /**
   * Get top rated places for a user
   */
  private async getTopRatedPlaces(userId: string): Promise<string[]> {
    try {
      const { data: ratings, error } = await supabase
        .from('user_place_ratings')
        .select('place_id')
        .eq('user_id', userId)
        .eq('rating_type', 'thumbs_up')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return ratings?.map(r => r.place_id) || [];
    } catch (error) {
      console.error('Error getting top rated places:', error);
      return [];
    }
  }

  /**
   * Get frequently visited places for a user
   */
  private async getFrequentlyVisitedPlaces(userId: string): Promise<string[]> {
    try {
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('place_id')
        .eq('user_id', userId);

      if (error) throw error;

      // Count visits per place
      const visitCounts = new Map<string, number>();
      checkIns?.forEach(checkIn => {
        const count = visitCounts.get(checkIn.place_id) || 0;
        visitCounts.set(checkIn.place_id, count + 1);
      });

      // Sort by visit count and return top places
      return Array.from(visitCounts.entries())
        .filter(([_, count]) => count > 1) // Only places visited more than once
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([placeId, _]) => placeId);
    } catch (error) {
      console.error('Error getting frequently visited places:', error);
      return [];
    }
  }

  // 5. PLACE SUGGESTIONS AND DISCOVERY

  /**
   * Add places from suggestions (autocomplete results)
   */
  async addPlaceFromSuggestion(
    listId: string,
    suggestion: PlaceSuggestion,
    options?: {
      notes?: string;
      personal_rating?: number;
    }
  ): Promise<void> {
    try {
      // Ensure the place is cached with complete details by forcing a refresh if data is incomplete
      // This guarantees we have all metadata (phone, website, hours) when adding to lists
      console.log('📝 LIST ADD: Ensuring complete place data before adding to list', {
        place_id: suggestion.place_id,
        main_text: suggestion.main_text
      });
      
      const placeDetails = await placesService.getPlaceDetails(suggestion.place_id, false);
      
      // Check if place details were successfully fetched
      if (!placeDetails) {
        console.error('❌ PLACE FETCH FAILED: Could not retrieve place details from Google Places API', {
          place_id: suggestion.place_id,
          main_text: suggestion.main_text,
          possible_causes: [
            'Google Places API returned non-OK status',
            'Place ID is invalid or outdated',
            'API key permissions issue',
            'Rate limiting or quota exceeded'
          ]
        });
        throw new PlaceError(
          `Could not retrieve details for "${suggestion.main_text}". This may be due to an invalid place ID or Google Places API issues.`,
          'PLACE_DETAILS_FAILED'
        );
      }
      
      // Then add to list
      await this.addPlaceToList(listId, suggestion.place_id, options);
      
      console.log('✅ LIST ADD: Successfully added place to list with complete metadata', {
        place_id: suggestion.place_id,
        list_id: listId,
        place_name: placeDetails.name
      });
    } catch (error) {
      console.error('Error adding place from suggestion:', error);
      if (error instanceof PlaceError) {
        throw error; // Re-throw our custom errors with better messages
      }
      throw new PlaceError('Failed to add place from suggestion', 'ADD_SUGGESTION_ERROR');
    }
  }

  /**
   * Add places from location search
   */
  async addPlacesFromLocationSearch(
    listId: string,
    location: Location,
    radius: number,
    placeType?: string
  ): Promise<number> {
    try {
      const places = await placesService.searchNearbyPlaces(location, radius, placeType);
      let addedCount = 0;

      for (const place of places) {
        try {
          await this.addPlaceToList(listId, place.google_place_id);
          addedCount++;
        } catch (error) {
          // Continue adding other places even if one fails
          console.warn('Failed to add place to list:', place.google_place_id, error);
        }
      }

      return addedCount;
    } catch (error) {
      console.error('Error adding places from location search:', error);
      throw new PlaceError('Failed to add places from location search', 'ADD_LOCATION_PLACES_ERROR');
    }
  }

  // 6. LIST STATISTICS

  /**
   * Get statistics for a list
   */
  async getListStats(listId: string): Promise<{
    totalPlaces: number;
    averageRating: number;
    mostRecentlyAdded: string;
    topCategories: string[];
  }> {
    try {
      const { data: listPlaces, error } = await supabase
        .from('list_places')
        .select('personal_rating, added_at, enriched_places(types)')
        .eq('list_id', listId);

      if (error) throw error;

      const stats = {
        totalPlaces: listPlaces?.length || 0,
        averageRating: 0,
        mostRecentlyAdded: '',
        topCategories: [] as string[]
      };

      if (listPlaces && listPlaces.length > 0) {
        // Calculate average rating
        const ratings = listPlaces
          .map(lp => lp.personal_rating)
          .filter(rating => rating !== null);
        
        if (ratings.length > 0) {
          stats.averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        }

        // Most recently added
        const mostRecent = listPlaces
          .sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime())[0];
        stats.mostRecentlyAdded = mostRecent.added_at;

        // Top categories
        const categoryCount = new Map<string, number>();
        listPlaces.forEach(lp => {
          const place = Array.isArray(lp.enriched_places) 
            ? lp.enriched_places[0] 
            : lp.enriched_places;
          if (place?.types && Array.isArray(place.types)) {
            place.types.forEach((type: string) => {
              categoryCount.set(type, (categoryCount.get(type) || 0) + 1);
            });
          }
        });

        stats.topCategories = Array.from(categoryCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([category]) => category);
      }

      return stats;
    } catch (error) {
      console.error('Error getting list stats:', error);
      return {
        totalPlaces: 0,
        averageRating: 0,
        mostRecentlyAdded: '',
        topCategories: []
      };
    }
  }

  // 7. CURATED LISTS METHODS

  /**
   * Get curated lists (admin-managed lists)
   */
  async getCuratedLists(): Promise<ListWithPlaces[]> {
    try {
      // Get lists with their places in a single query
      const { data: listData, error } = await supabase
        .from('lists')
        .select(`
          id,
          user_id,
          name,
          auto_generated,
          visibility,
          description,
          list_type,
          icon,
          color,
          type,
          is_default,
          is_curated,
          publisher_name,
          publisher_logo_url,
          external_link,
          location_scope,
          curator_priority,
          created_at,
          list_places (
            list_id,
            place_id,
            added_at,
            notes,
            personal_rating,
            visit_count,
            sort_order,
            enriched_places (*)
          )
        `)
        .eq('is_curated', true)
        .in('visibility', ['public', 'curated'])
        .order('curator_priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('🗄️ Loaded curated lists from database');

      const result: ListWithPlaces[] = [];

      for (const list of listData || []) {
        const places: EnrichedListPlace[] = [];
        
        // Processing list silently
        
        // Process places for this list
        if (list.list_places && list.list_places.length > 0) {
          for (const listPlace of list.list_places) {
            // Processing place silently
            
            if (listPlace.enriched_places) {
              const place = Array.isArray(listPlace.enriched_places) 
                ? listPlace.enriched_places[0] 
                : listPlace.enriched_places;
              
                                // Place data loaded
              
              if (place && place.name) {
                // Checking business status
                
                // Include places that are operational or have unknown status (null)
                if (place.business_status === 'OPERATIONAL' || place.business_status === null) {
                  const enrichedListPlace: EnrichedListPlace = {
                    list_id: listPlace.list_id,
                    place_id: listPlace.place_id,
                    added_at: listPlace.added_at,
                    notes: listPlace.notes,
                    personal_rating: listPlace.personal_rating,
                    visit_count: listPlace.visit_count,
                    sort_order: listPlace.sort_order,
                    place: place as EnrichedPlace // Use complete data from enriched_places view
                  };
                  
                  places.push(enrichedListPlace);
                  // Added place to list
                } else {
                  // Place filtered due to business status
                }
              } else {
                console.log(`Place data is missing name or is invalid:`, place);
              }
            } else {
                              // Place not found in enriched_places
            }
          }
        }

        // Sort places by sort_order
        places.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        // List processing complete

        result.push({
          id: list.id,
          user_id: list.user_id,
          name: list.name,
          auto_generated: list.auto_generated,
          visibility: list.visibility,
          description: list.description,
          list_type: list.list_type,
          icon: list.icon,
          color: list.color,
          type: list.type,
          is_default: list.is_default,
          is_curated: list.is_curated,
          publisher_name: list.publisher_name,
          publisher_logo_url: list.publisher_logo_url,
          external_link: list.external_link,
          location_scope: list.location_scope,
          curator_priority: list.curator_priority,
          created_at: list.created_at,
          places,
          place_count: places.length
        });
      }

      console.log(`🗄️ Found ${result.length} curated lists`);
      return result;

    } catch (error) {
      console.error('Error getting curated lists:', error);
      throw new ListError('Failed to get curated lists', 'GET_CURATED_LISTS_ERROR');
    }
  }

  /**
   * Get a specific curated list with places
   */
  async getCuratedListDetails(listId: string): Promise<ListWithPlaces | null> {
    try {
      const { data: listData, error } = await supabase
        .from('lists')
        .select(`
          id,
          user_id,
          name,
          auto_generated,
          visibility,
          description,
          list_type,
          icon,
          color,
          type,
          is_default,
          is_curated,
          publisher_name,
          publisher_logo_url,
          external_link,
          location_scope,
          curator_priority,
          created_at,
          list_places (
            list_id,
            place_id,
            added_at,
            notes,
            personal_rating,
            visit_count,
            sort_order,
            enriched_places (
              google_place_id,
              name,
              formatted_address,
              geometry,
              types,
              rating,
              price_level,
              formatted_phone_number,
              website,
              opening_hours,
              photo_urls,
              primary_image_url,
              display_description,
              is_featured,
              has_editorial_content,
              business_status
            )
          )
        `)
        .eq('id', listId)
        .eq('is_curated', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      const places: EnrichedListPlace[] = [];
      
      // Process places for this list
      if (listData.list_places && listData.list_places.length > 0) {
        for (const listPlace of listData.list_places) {
          if (listPlace.enriched_places) {
            const place = Array.isArray(listPlace.enriched_places) 
              ? listPlace.enriched_places[0] 
              : listPlace.enriched_places;
            
            // Include places that are operational or have unknown status (null)
            if (place && (place.business_status === 'OPERATIONAL' || place.business_status === null)) {
              places.push({
                list_id: listPlace.list_id,
                place_id: listPlace.place_id,
                added_at: listPlace.added_at,
                notes: listPlace.notes,
                personal_rating: listPlace.personal_rating,
                visit_count: listPlace.visit_count,
                sort_order: listPlace.sort_order,
                place: place as EnrichedPlace
              });
            }
          }
        }
      }

      // Sort places by sort_order
      places.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      return {
        id: listData.id,
        user_id: listData.user_id,
        name: listData.name,
        auto_generated: listData.auto_generated,
        visibility: listData.visibility,
        description: listData.description,
        list_type: listData.list_type,
        icon: listData.icon,
        color: listData.color,
        type: listData.type,
        is_default: listData.is_default,
        is_curated: listData.is_curated,
        publisher_name: listData.publisher_name,
        publisher_logo_url: listData.publisher_logo_url,
        external_link: listData.external_link,
        location_scope: listData.location_scope,
        curator_priority: listData.curator_priority,
        created_at: listData.created_at,
        places,
        place_count: places.length
      };

    } catch (error) {
      console.error('Error getting curated list details:', error);
      throw new ListError('Failed to get curated list details', 'GET_CURATED_LIST_DETAILS_ERROR');
    }
  }
}

// Export singleton instance
export const listsService = new ListsService();