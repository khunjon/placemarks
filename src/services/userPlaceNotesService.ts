import { UserPlaceNote } from '../types';
import { supabase } from './supabase';
import { safeAsync } from '../utils/errorHandling';

class UserPlaceNotesService {
  /**
   * Get a note for a specific place and user
   */
  async getNote(userId: string, placeId: string): Promise<UserPlaceNote | null> {
    return safeAsync(async () => {
      const { data, error } = await supabase
        .from('user_place_notes')
        .select('*')
        .eq('user_id', userId)
        .eq('place_id', placeId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        throw error;
      }

      return data;
    }, { service: 'userPlaceNotes', operation: 'getNote' }, null);
  }

  /**
   * Get notes for multiple places for a user
   * Used for batch fetching notes when displaying lists
   */
  async getNotesByPlaceIds(userId: string, placeIds: string[]): Promise<Record<string, UserPlaceNote>> {
    return safeAsync(async () => {
      if (placeIds.length === 0) return {};

      const { data, error } = await supabase
        .from('user_place_notes')
        .select('*')
        .eq('user_id', userId)
        .in('place_id', placeIds);

      if (error) {
        throw error;
      }

      // Convert array to a map for easy lookup
      const notesMap: Record<string, UserPlaceNote> = {};
      (data || []).forEach(note => {
        notesMap[note.place_id] = note;
      });

      return notesMap;
    }, { service: 'userPlaceNotes', operation: 'getNotesByPlaceIds' }, {}) as Promise<Record<string, UserPlaceNote>>;
  }

  /**
   * Save or update a note for a place
   */
  async saveNote(userId: string, placeId: string, noteText: string): Promise<UserPlaceNote> {
    return safeAsync(async () => {
      const trimmedNote = noteText.trim();
      
      if (!trimmedNote) {
        // If note is empty, delete it
        await this.deleteNote(userId, placeId);
        return { user_id: userId, place_id: placeId, notes: '' };
      }

      const { data, error } = await supabase
        .from('user_place_notes')
        .upsert({
          user_id: userId,
          place_id: placeId,
          notes: trimmedNote,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,place_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    }, { service: 'userPlaceNotes', operation: 'saveNote' });
  }

  /**
   * Delete a note
   */
  async deleteNote(userId: string, placeId: string): Promise<void> {
    return safeAsync(async () => {
      const { error } = await supabase
        .from('user_place_notes')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);

      if (error) {
        throw error;
      }
    }, { service: 'userPlaceNotes', operation: 'deleteNote' });
  }

  /**
   * Get all notes for a user
   */
  async getAllNotes(userId: string): Promise<UserPlaceNote[]> {
    return safeAsync(async () => {
      const { data, error } = await supabase
        .from('user_place_notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    }, { service: 'userPlaceNotes', operation: 'getAllNotes' }, []) as Promise<UserPlaceNote[]>;
  }

  /**
   * Clear cache entries for a specific place
   * This will be called when a note is updated
   */
  async invalidatePlaceCache(placeId: string): Promise<void> {
    // This method will be used by cache services to invalidate related caches
    // Implementation will be added when updating cache services
  }
}

// Export singleton instance
export const userPlaceNotesService = new UserPlaceNotesService();