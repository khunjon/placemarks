// Lists Service - Connected to Supabase
import { List } from '../types/database';
import { listsService } from './supabase';

// Extended types for our enhanced list functionality
export interface ExtendedList extends List {
  description?: string;
  list_type?: string;
  icon?: string;
  color?: string;
  type?: 'user' | 'auto';
}

export interface ListWithPlaces extends ExtendedList {
  places: any[];
  place_count: number;
}

export interface ListWithPlaceCount extends ExtendedList {
  place_count: number;
}

// Service functions (real Supabase implementations)
export const listService = {
  // Get user's lists with place counts
  async getUserLists(userId: string): Promise<ListWithPlaceCount[]> {
    try {
      const { data: lists, error } = await listsService.getLists(userId);
      
      if (error) throw error;
      if (!lists) return [];

      // Get place counts for each list
      const listsWithCounts = await Promise.all(
        lists.map(async (list) => {
          // Count places in this list
          const { data: listPlaces } = await listsService.getList(list.id);
          const placeCount = listPlaces?.list_places?.length || 0;
          
          return {
            ...list,
            place_count: placeCount,
            type: list.auto_generated ? 'auto' : 'user',
          } as ListWithPlaceCount;
        })
      );

      return listsWithCounts;
    } catch (error) {
      console.error('Error getting user lists:', error);
      throw new ListError('Failed to load lists', 'FETCH_ERROR');
    }
  },

  // Get a specific list with places
  async getListWithPlaces(listId: string): Promise<ListWithPlaces | null> {
    try {
      const { data: list, error } = await listsService.getList(listId);
      
      if (error) throw error;
      if (!list) return null;

      // Extract places from list_places relationship
      const places = list.list_places?.map((lp: any) => lp.places).filter(Boolean) || [];
      
      return {
        ...list,
        places,
        place_count: places.length,
        type: list.auto_generated ? 'auto' : 'user',
      } as ListWithPlaces;
    } catch (error) {
      console.error('Error getting list with places:', error);
      throw new ListError('Failed to load list', 'FETCH_ERROR');
    }
  },

  // Create a new list
  async createList(listData: {
    user_id: string;
    name: string;
    description?: string;
    type?: 'user' | 'auto';
    list_type?: string;
    icon?: string;
    color?: string;
    is_public?: boolean;
  }): Promise<ExtendedList> {
    try {
      const { data: newList, error } = await listsService.createList({
        user_id: listData.user_id,
        name: listData.name,
        auto_generated: listData.type === 'auto',
        privacy_level: listData.is_public ? 'public' : 'private',
        created_at: new Date().toISOString(),
      });
      
      if (error) throw error;
      if (!newList) throw new Error('No list returned from creation');

      return {
        ...newList,
        type: listData.type || 'user',
        description: listData.description,
        list_type: listData.list_type,
        icon: listData.icon,
        color: listData.color,
      } as ExtendedList;
    } catch (error) {
      console.error('Error creating list:', error);
      throw new ListError('Failed to create list', 'CREATE_ERROR');
    }
  },

  // Update a list
  async updateList(id: string, updates: Partial<ExtendedList>): Promise<ExtendedList> {
    try {
      const { data: updatedList, error } = await listsService.updateList(id, {
        name: updates.name,
        auto_generated: updates.type === 'auto',
        privacy_level: updates.privacy_level,
      });
      
      if (error) throw error;
      if (!updatedList) throw new Error('No list returned from update');

      return {
        ...updatedList,
        ...updates,
      } as ExtendedList;
    } catch (error) {
      console.error('Error updating list:', error);
      throw new ListError('Failed to update list', 'UPDATE_ERROR');
    }
  },

  // Delete a list
  async deleteList(id: string): Promise<void> {
    try {
      const { error } = await listsService.deleteList(id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting list:', error);
      throw new ListError('Failed to delete list', 'DELETE_ERROR');
    }
  },

  // Add a place to a list
  async addPlaceToList(listId: string, placeId: string): Promise<void> {
    try {
      const { error } = await listsService.addPlaceToList(listId, placeId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error adding place to list:', error);
      throw new ListError('Failed to add place to list', 'ADD_PLACE_ERROR');
    }
  },

  // Remove a place from a list
  async removePlaceFromList(listId: string, placeId: string): Promise<void> {
    try {
      const { error } = await listsService.removePlaceFromList(listId, placeId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error removing place from list:', error);
      throw new ListError('Failed to remove place from list', 'REMOVE_PLACE_ERROR');
    }
  },

  // Get list statistics
  async getListStats(userId: string): Promise<{
    totalLists: number;
    userLists: number;
    autoLists: number;
    totalPlaces: number;
    publicLists: number;
  }> {
    try {
      const lists = await this.getUserLists(userId);
      
      const userLists = lists.filter(l => l.type === 'user').length;
      const autoLists = lists.filter(l => l.type === 'auto').length;
      const totalPlaces = lists.reduce((sum, list) => sum + list.place_count, 0);
      const publicLists = lists.filter(l => l.privacy_level === 'public').length;

      return {
        totalLists: lists.length,
        userLists,
        autoLists,
        totalPlaces,
        publicLists,
      };
    } catch (error) {
      console.error('Error getting list stats:', error);
      throw new ListError('Failed to get list statistics', 'STATS_ERROR');
    }
  },

  // Search lists
  async searchLists(query: string, userId?: string): Promise<ListWithPlaceCount[]> {
    try {
      if (!userId) return [];
      
      const lists = await this.getUserLists(userId);
      
      // Simple text search on list names
      const filteredLists = lists.filter(list =>
        list.name.toLowerCase().includes(query.toLowerCase())
      );

      return filteredLists;
    } catch (error) {
      console.error('Error searching lists:', error);
      throw new ListError('Failed to search lists', 'SEARCH_ERROR');
    }
  },
};

// Error types
export class ListError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ListError';
  }
} 