import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  MapPin,
  Star,
  Plus,
  Check,
} from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import {
  Typography,
  Title3,
  Body,
  SecondaryText,
  Card,
  EmptyState,
} from '../../components/common';
import { useAuth } from '../../services/auth-context';
import {
  enhancedListsService,
  PlaceError,
  PlaceSearchResult,
} from '../../services/listsService';
import { ListsCache } from '../../services/listsCache';
import { ListDetailsCache } from '../../services/listDetailsCache';
import { checkInUtils } from '../../services/checkInsService';
import Toast from '../../components/ui/Toast';
import type { ListsStackScreenProps } from '../../navigation/types';

type AddPlaceToListScreenProps = ListsStackScreenProps<'AddPlaceToList'>;

interface SearchResult extends PlaceSearchResult {
  isAdding?: boolean;
  isAdded?: boolean;
}

export default function AddPlaceToListScreen({
  navigation,
  route,
}: AddPlaceToListScreenProps) {
  const { listId, listName } = route.params;
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addedPlaces, setAddedPlaces] = useState<Set<string>>(new Set());
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Refs
  const searchInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmedQuery = searchQuery.trim();
    
    // Require at least 3 characters and increase debounce time
    if (trimmedQuery.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(trimmedQuery);
      }, 800); // Increased from 300ms to 800ms for better debouncing
    } else if (trimmedQuery.length === 0) {
      // Clear results immediately when query is empty
      setSearchResults([]);
      setHasSearched(false);
    }
    // Don't search for queries with 1-2 characters

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Toast helper functions
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Utility function to abbreviate Bangkok addresses
  const abbreviateAddress = (address: string): string => {
    if (!address) return '';
    
    // Common Bangkok abbreviations
    let abbreviated = address
      .replace(/Bangkok \d{5}, Thailand$/, 'Bangkok') // Remove postal code and Thailand
      .replace(/, Bangkok Metropolis,.*$/, ', Bangkok') // Remove "Bangkok Metropolis" suffix
      .replace(/, Krung Thep Maha Nakhon.*$/, ', Bangkok') // Replace Thai name with Bangkok
      .replace(/\bRoad\b/g, 'Rd') // Abbreviate Road
      .replace(/\bStreet\b/g, 'St') // Abbreviate Street
      .replace(/\bSubdistrict\b/g, '') // Remove Subdistrict
      .replace(/\bDistrict\b/g, '') // Remove District
      .replace(/\bBangkok \d{5}\b/g, 'Bangkok') // Remove postal codes
      .replace(/,\s*,/g, ',') // Remove double commas
      .replace(/^,\s*|,\s*$/g, ''); // Remove leading/trailing commas
    
    // If still too long, take first part + last part
    if (abbreviated.length > 50) {
      const parts = abbreviated.split(',').map(p => p.trim());
      if (parts.length > 2) {
        abbreviated = `${parts[0]}, ${parts[parts.length - 1]}`;
      }
    }
    
    return abbreviated;
  };

  const performSearch = async (query: string) => {
    if (!user?.id) return;

    // Skip search if query is too similar to the last searched query
    if (lastSearchedQuery && query.length >= lastSearchedQuery.length && 
        query.startsWith(lastSearchedQuery) && query.length - lastSearchedQuery.length <= 2) {
      console.log('⏭️ SEARCH SKIPPED: Query too similar to previous search', {
        previousQuery: lastSearchedQuery,
        currentQuery: query,
        reason: 'Likely same results - avoiding unnecessary API call'
      });
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      setLastSearchedQuery(query);

      const results = await enhancedListsService.searchPlacesForList(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      showToast('Failed to search for places. Please try again.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddPlace = async (place: SearchResult) => {
    if (!user?.id || !listId) return;

    // Dismiss keyboard when adding a place
    Keyboard.dismiss();

    try {
      setSearchResults(prev => 
        prev.map(p => 
          p.google_place_id === place.google_place_id 
            ? { ...p, isAdding: true }
            : p
        )
      );

      // Fetch detailed place information only when adding to list
      console.log('🔍 FETCHING DETAILS: Getting full place details for list addition', {
        placeId: place.google_place_id.substring(0, 20) + '...',
        name: place.name,
        reason: 'Adding to list - details required'
      });

      const detailedPlace = await enhancedListsService.getPlaceDetailsForList(place.google_place_id);

      await enhancedListsService.addPlaceToList(listId, {
        google_place_id: detailedPlace.google_place_id,
        name: detailedPlace.name,
        address: detailedPlace.address,
        place_type: detailedPlace.types?.[0] || 'establishment',
        google_types: detailedPlace.types || [],
        google_rating: detailedPlace.rating,
        price_level: detailedPlace.price_level,
        photos_urls: detailedPlace.photos,
      });

      setSearchResults(prev => 
        prev.map(p => 
          p.google_place_id === place.google_place_id 
            ? { ...p, isAdding: false, isAdded: true }
            : p
        )
      );

      setAddedPlaces(prev => new Set([...prev, place.google_place_id]));
      
      // Invalidate caches since a place was added to a list
      if (user?.id) {
        await ListsCache.invalidateCache();
        await ListDetailsCache.invalidateListCache(listId);
      }
      
      showToast(`"${place.name}" added to ${listName}!`, 'success');

    } catch (error) {
      console.error('Error adding place:', error);
      
      setSearchResults(prev => 
        prev.map(p => 
          p.google_place_id === place.google_place_id 
            ? { ...p, isAdding: false, isAdded: false }
            : p
        )
      );

      if (error instanceof PlaceError) {
        if (error.message.includes('already exists')) {
          showToast(`"${place.name}" is already in this list.`, 'error');
        } else {
          showToast(error.message, 'error');
        }
      } else {
        showToast('Failed to add place. Please try again.', 'error');
      }
    }
  };

  const renderSearchResult = (place: SearchResult) => {
    const isAdded = place.isAdded || addedPlaces.has(place.google_place_id);
    const isAdding = place.isAdding;

    // Get category icon based on place types
    const categoryIcon = checkInUtils.getCategoryIcon(undefined, place.types, place.name);

    return (
      <Card key={place.google_place_id} padding="md" style={{ marginBottom: Spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Category Icon */}
          <View style={{
            marginRight: Spacing.sm,
            marginTop: 2, // Slight offset to align with text
          }}>
            <Typography variant="body" style={{ fontSize: 18 }}>
              {categoryIcon || '📍'}
            </Typography>
          </View>

          <View style={{ flex: 1, marginRight: Spacing.sm }}>
            <Typography variant="headline" style={{
              fontWeight: '600',
              marginBottom: Spacing.xs,
              lineHeight: 20,
            }}>
              {place.name || 'Unknown Place'}
            </Typography>

            <View style={{
              marginBottom: Spacing.xs,
            }}>
              <SecondaryText style={{
                fontSize: 13,
                lineHeight: 18,
              }}>
                {abbreviateAddress(place.address) || 'No address available'}
              </SecondaryText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {place.rating ? (
                <>
                  <Star size={14} color={Colors.accent.yellow} fill={Colors.accent.yellow} />
                  <SecondaryText style={{
                    marginLeft: 4,
                    fontSize: 13,
                    fontWeight: '500',
                  }}>
                    {place.rating?.toFixed(1) || '0.0'}
                  </SecondaryText>
                </>
              ) : (
                <SecondaryText style={{
                  fontSize: 13,
                  color: Colors.neutral[400],
                  fontStyle: 'italic',
                }}>
                  Tap to see details
                </SecondaryText>
              )}
              {place.price_level && (
                <SecondaryText style={{
                  marginLeft: Spacing.sm,
                  fontSize: 13,
                  color: Colors.accent.green,
                  fontWeight: '500',
                }}>
                  {'$'.repeat(place.price_level)}
                </SecondaryText>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => handleAddPlace(place)}
            disabled={isAdding || isAdded}
            style={{
              backgroundColor: isAdded 
                ? Colors.accent.green 
                : isAdding 
                  ? Colors.neutral[200] 
                  : Colors.accent.yellow,
              paddingHorizontal: Spacing.sm,
              paddingVertical: Spacing.xs,
              borderRadius: 6,
              minWidth: 60,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={Colors.neutral[600]} />
            ) : isAdded ? (
              <Check size={14} color="white" strokeWidth={2} />
            ) : (
              <Plus size={14} color="black" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: Colors.semantic.backgroundPrimary,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            marginRight: Spacing.md,
            padding: Spacing.xs,
          }}
        >
          <ArrowLeft size={24} color={Colors.semantic.textPrimary} />
        </TouchableOpacity>
        
        <View style={{ flex: 1 }}>
          <Typography variant="title1" style={{ fontWeight: 'bold' }}>
            Add Places
          </Typography>
          <SecondaryText>to {listName || 'list'}</SecondaryText>
        </View>
      </View>

      <View style={{
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.semantic.backgroundPrimary,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: Colors.semantic.backgroundSecondary,
          borderRadius: 12,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
        }}>
          <Search size={20} color={Colors.neutral[500]} />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for places..."
            placeholderTextColor={Colors.semantic.textTertiary}
            style={{
              flex: 1,
              marginLeft: Spacing.sm,
              fontSize: 16,
              color: Colors.semantic.textPrimary,
            }}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {isSearching && (
            <ActivityIndicator size="small" color={Colors.primary[500]} />
          )}
        </View>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.layout.screenPadding,
            paddingBottom: Spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
        {isSearching && searchResults.length === 0 && (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: Spacing.xl,
          }}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Body color="secondary" style={{ marginTop: Spacing.md }}>
              Searching for places...
            </Body>
          </View>
        )}

        {!isSearching && hasSearched && searchResults.length === 0 && (
          <EmptyState
            title="No Places Found"
            description={`No places found for "${searchQuery || ''}". Try adjusting your search terms.`}
            icon={Search}
          />
        )}

        {!hasSearched && (
          <View style={{
            alignItems: 'center',
            paddingVertical: Spacing.xl,
          }}>
            <Search size={48} color={Colors.neutral[300]} />
            <Title3 style={{
              marginTop: Spacing.md,
              color: Colors.neutral[500],
            }}>
              {searchQuery.length === 0 
                ? 'Search for Places' 
                : searchQuery.length < 3 
                  ? `Type ${3 - searchQuery.length} more character${3 - searchQuery.length > 1 ? 's' : ''}...`
                  : 'Searching...'
              }
            </Title3>
          </View>
        )}

        {searchResults.length > 0 && (
          <>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: Spacing.md,
            }}>
              <Body color="secondary">
                {searchResults.length || 0} places found
              </Body>
              {addedPlaces.size > 0 && (
                <Body color="secondary">
                  {addedPlaces.size || 0} added to list
                </Body>
              )}
            </View>
            
            {searchResults.map(renderSearchResult)}
          </>
        )}
      </ScrollView>
      </TouchableWithoutFeedback>

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
} 