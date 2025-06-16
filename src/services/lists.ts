// Lists Service - Mock functions for now, will connect to Supabase later
import { Database } from '../types/supabase';

// Type definitions based on Supabase schema
export type ListRow = Database['public']['Tables']['lists']['Row'];
export type ListInsert = Database['public']['Tables']['lists']['Insert'];
export type ListUpdate = Database['public']['Tables']['lists']['Update'];
export type ListPlaceRow = Database['public']['Tables']['list_places']['Row'];
export type PlaceRow = Database['public']['Tables']['places']['Row'];

export interface ListWithPlaces extends ListRow {
  places: PlaceRow[];
  place_count: number;
}

export interface ListWithPlaceCount extends ListRow {
  place_count: number;
}

// Mock data structure
const mockLists: ListWithPlaceCount[] = [
  {
    id: '1',
    user_id: 'user-1',
    name: 'Favorites',
    description: 'My favorite places in Bangkok',
    type: 'user',
    list_type: 'favorites',
    icon: 'heart',
    color: '#FF6B6B',
    is_public: false,
    place_count: 12,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    user_id: 'user-1',
    name: 'Coffee Spots',
    description: 'Best coffee places I\'ve discovered',
    type: 'user',
    list_type: 'coffee',
    icon: 'coffee',
    color: '#8B4513',
    is_public: true,
    place_count: 8,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    user_id: 'user-1',
    name: 'Date Night',
    description: 'Romantic spots for special occasions',
    type: 'user',
    list_type: 'date',
    icon: 'heart',
    color: '#FF69B4',
    is_public: false,
    place_count: 5,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'auto-1',
    user_id: 'user-1',
    name: 'Most Visited',
    description: 'Places you visit most frequently',
    type: 'auto',
    list_type: 'visited',
    icon: 'trending-up',
    color: '#4CAF50',
    is_public: false,
    place_count: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'auto-2',
    user_id: 'user-1',
    name: 'Highly Rated',
    description: 'Places with your highest ratings',
    type: 'auto',
    list_type: 'rated',
    icon: 'star',
    color: '#FFD700',
    is_public: false,
    place_count: 18,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Mock places for lists
const mockPlaces: PlaceRow[] = [
  {
    id: 'place-1',
    name: 'Chatuchak Weekend Market',
    type: 'shopping',
    description: 'Famous weekend market with thousands of stalls',
    address: 'Kamphaeng Phet 2 Rd, Chatuchak, Bangkok',
    latitude: 13.7997,
    longitude: 100.5510,
    rating: 4.5,
    price_level: 2,
    bts_station: 'Mo Chit',
    is_open: true,
    opening_hours: '9:00-18:00',
    phone: undefined,
    website: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'place-2',
    name: 'Wat Pho Temple',
    type: 'temple',
    description: 'Historic Buddhist temple with reclining Buddha',
    address: '2 Sanamchai Road, Grand Palace Subdistrict, Phra Nakhon District',
    latitude: 13.7465,
    longitude: 100.4927,
    rating: 4.8,
    price_level: 1,
    is_open: true,
    opening_hours: '8:00-17:00',
    phone: undefined,
    website: undefined,
    bts_station: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Service functions (mock implementations)
export const listService = {
  // Get user's lists
  async getUserLists(userId: string): Promise<ListWithPlaceCount[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return mockLists.filter(list => list.user_id === userId);
  },

  // Get a specific list with places
  async getListWithPlaces(listId: string): Promise<ListWithPlaces | null> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const list = mockLists.find(l => l.id === listId);
    if (!list) return null;
    
    // Mock: return first few places for the list
    const places = mockPlaces.slice(0, Math.min(list.place_count, mockPlaces.length));
    
    return {
      ...list,
      places,
    };
  },

  // Create a new list
  async createList(list: ListInsert): Promise<ListRow> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newList: ListRow = {
      id: `list-${Date.now()}`,
      user_id: list.user_id,
      name: list.name,
      description: list.description || undefined,
      type: list.type || 'user',
      list_type: list.list_type,
      icon: list.icon || undefined,
      color: list.color || undefined,
      is_public: list.is_public || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return newList;
  },

  // Update a list
  async updateList(id: string, updates: ListUpdate): Promise<ListRow> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const existingList = mockLists.find(l => l.id === id);
    if (!existingList) {
      throw new ListError('List not found', 'NOT_FOUND');
    }
    
    return {
      ...existingList,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  },

  // Delete a list
  async deleteList(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const index = mockLists.findIndex(l => l.id === id);
    if (index === -1) {
      throw new ListError('List not found', 'NOT_FOUND');
    }
    
    console.log(`List ${id} deleted`);
  },

  // Add place to list
  async addPlaceToList(listId: string, placeId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const list = mockLists.find(l => l.id === listId);
    if (!list) {
      throw new ListError('List not found', 'NOT_FOUND');
    }
    
    // In real implementation, this would add to list_places table
    list.place_count += 1;
    list.updated_at = new Date().toISOString();
    
    console.log(`Place ${placeId} added to list ${listId}`);
  },

  // Remove place from list
  async removePlaceFromList(listId: string, placeId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const list = mockLists.find(l => l.id === listId);
    if (!list) {
      throw new ListError('List not found', 'NOT_FOUND');
    }
    
    // In real implementation, this would remove from list_places table
    list.place_count = Math.max(0, list.place_count - 1);
    list.updated_at = new Date().toISOString();
    
    console.log(`Place ${placeId} removed from list ${listId}`);
  },

  // Get list statistics
  async getListStats(userId: string): Promise<{
    totalLists: number;
    userLists: number;
    autoLists: number;
    totalPlaces: number;
    publicLists: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const userLists = mockLists.filter(l => l.user_id === userId);
    const userCreatedLists = userLists.filter(l => l.type === 'user');
    const autoLists = userLists.filter(l => l.type === 'auto');
    const publicLists = userLists.filter(l => l.is_public);
    const totalPlaces = userLists.reduce((sum, l) => sum + l.place_count, 0);
    
    return {
      totalLists: userLists.length,
      userLists: userCreatedLists.length,
      autoLists: autoLists.length,
      totalPlaces,
      publicLists: publicLists.length,
    };
  },

  // Search lists
  async searchLists(query: string, userId?: string): Promise<ListWithPlaceCount[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const searchTerm = query.toLowerCase();
    let lists = mockLists;
    
    if (userId) {
      lists = lists.filter(l => l.user_id === userId);
    }
    
    return lists.filter(list => 
      list.name.toLowerCase().includes(searchTerm) ||
      (list.description && list.description.toLowerCase().includes(searchTerm))
    );
  },
};

// Error types
export class ListError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ListError';
  }
} 