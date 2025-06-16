// CheckIn Service - Mock functions for now, will connect to Supabase later
import { Database } from '../types/supabase';

// Type definitions based on Supabase schema
export type CheckInRow = Database['public']['Tables']['checkins']['Row'];
export type CheckInInsert = Database['public']['Tables']['checkins']['Insert'];
export type CheckInUpdate = Database['public']['Tables']['checkins']['Update'];
export type PlaceRow = Database['public']['Tables']['places']['Row'];

export interface CheckInWithPlace extends CheckInRow {
  place: PlaceRow;
}

// Mock data structure
const mockCheckIns: CheckInWithPlace[] = [
  {
    id: '1',
    user_id: 'user-1',
    place_id: 'place-1',
    rating: 5,
    notes: 'Amazing weekend market with incredible variety!',
    photo_count: 3,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    place: {
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
  },
  {
    id: '2',
    user_id: 'user-1',
    place_id: 'place-2',
    rating: 4,
    notes: 'Beautiful temple, very peaceful atmosphere.',
    photo_count: 1,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    place: {
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
  },
];

// Service functions (mock implementations)
export const checkInService = {
  // Get user's check-ins
  async getUserCheckIns(userId: string, limit = 20, offset = 0): Promise<CheckInWithPlace[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return mockCheckIns
      .filter(checkIn => checkIn.user_id === userId)
      .slice(offset, offset + limit);
  },

  // Get recent check-ins for a place
  async getPlaceCheckIns(placeId: string, limit = 10): Promise<CheckInWithPlace[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return mockCheckIns
      .filter(checkIn => checkIn.place_id === placeId)
      .slice(0, limit);
  },

  // Create a new check-in
  async createCheckIn(checkIn: CheckInInsert): Promise<CheckInRow> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newCheckIn: CheckInRow = {
      id: `checkin-${Date.now()}`,
      user_id: checkIn.user_id,
      place_id: checkIn.place_id,
      rating: checkIn.rating || null,
      notes: checkIn.notes || null,
      photo_count: checkIn.photo_count || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return newCheckIn;
  },

  // Update a check-in
  async updateCheckIn(id: string, updates: CheckInUpdate): Promise<CheckInRow> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const existingCheckIn = mockCheckIns.find(c => c.id === id);
    if (!existingCheckIn) {
      throw new CheckInError('Check-in not found', 'NOT_FOUND');
    }
    
    return {
      ...existingCheckIn,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  },

  // Delete a check-in
  async deleteCheckIn(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const index = mockCheckIns.findIndex(c => c.id === id);
    if (index === -1) {
      throw new CheckInError('Check-in not found', 'NOT_FOUND');
    }
    
    console.log(`Check-in ${id} deleted`);
  },

  // Get check-in statistics
  async getCheckInStats(userId: string): Promise<{
    totalCheckIns: number;
    placesVisited: number;
    averageRating: number;
    thisMonth: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const userCheckIns = mockCheckIns.filter(c => c.user_id === userId);
    const uniquePlaces = new Set(userCheckIns.map(c => c.place_id)).size;
    const ratingsSum = userCheckIns.reduce((sum, c) => sum + (c.rating || 0), 0);
    const averageRating = ratingsSum / userCheckIns.length || 0;
    
    const thisMonth = userCheckIns.filter(c => {
      const checkInDate = new Date(c.created_at);
      const now = new Date();
      return checkInDate.getMonth() === now.getMonth() && 
             checkInDate.getFullYear() === now.getFullYear();
    }).length;
    
    return {
      totalCheckIns: userCheckIns.length,
      placesVisited: uniquePlaces,
      averageRating: Math.round(averageRating * 10) / 10,
      thisMonth,
    };
  },
};

// Error types
export class CheckInError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'CheckInError';
  }
} 