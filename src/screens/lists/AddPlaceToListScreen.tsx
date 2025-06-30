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
  Clock,
  Globe
} from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';
import { Spacing } from '../../constants/Spacing';
import {
  Typography,
  Title3,
  Body,
  SecondaryText,
  Card,
  EmptyState,
} from '../../components/common';
import { PlaceAutocomplete, PlaceCard } from '../../components/places';
import { useAuth } from '../../services/auth-context';
import { placesService } from '../../services/places';
import { listsService } from '../../services/listsService';
import { PlaceSuggestion, Location, EnrichedPlace } from '../../types';
import Toast from '../../components/ui/Toast';
import type { ListsStackScreenProps } from '../../navigation/types';

type AddPlaceToListScreenProps = ListsStackScreenProps<'AddPlaceToList'>;

interface SearchResult {
  googlePlaceId: string;
  name: string;
  address: string;
  types: string[];
  rating?: number;
  priceLevel?: number;
  isAdding?: boolean;
  isAdded?: boolean;
  // Keep original suggestion for proper caching
  originalSuggestion: PlaceSuggestion;
}

export default function AddPlaceToListScreen({
  navigation,
  route,
}: AddPlaceToListScreenProps) {
  const { listId, listName } = route.params;
  const { user } = useAuth();

  // State
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addedPlaces, setAddedPlaces] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<Location | undefined>();
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Refs
  const searchInputRef = useRef<TextInput>(null);

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    
    // Load recent places and user location
    loadRecentPlaces();
    loadUserLocation();
    
    return () => clearTimeout(timer);
  }, []);

  // Toast helper functions
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  /**
   * Load recent places from nearby searches or check-ins
   */
  const loadRecentPlaces = async () => {
    try {
      // For now, just show empty state. In a real app, you might:
      // - Load user's recent check-ins
      // - Load popular places nearby
      // - Load places from other lists
      setRecentPlaces([]);
    } catch (error) {
      console.error('Error loading recent places:', error);
    }
  };

  /**
   * Load user's current location for location-based searches
   */
  const loadUserLocation = async () => {
    try {
      // For now, default to Bangkok coordinates
      // In a real app, you'd request user location permission
      setUserLocation({
        latitude: 13.7563,
        longitude: 100.5018
      });
    } catch (error) {
      console.error('Error loading user location:', error);
    }
  };

  /**
   * Handle place selection from autocomplete
   */
  const handlePlaceSelect = async (suggestion: PlaceSuggestion) => {
    try {
      setIsSearching(true);
      
      // Get enriched place details
      const enrichedPlace = await placesService.getEnrichedPlace(suggestion.place_id);
      
      if (enrichedPlace) {
        const searchResult: SearchResult = {
          googlePlaceId: enrichedPlace.google_place_id,
          name: enrichedPlace.name,
          address: enrichedPlace.formatted_address,
          types: enrichedPlace.types,
          rating: enrichedPlace.rating,
          priceLevel: enrichedPlace.price_level,
          originalSuggestion: suggestion,
        };
        
        setSearchResults([searchResult]);
        setHasSearched(true);
      } else {
        // Fallback: create result from suggestion
        const searchResult: SearchResult = {
          googlePlaceId: suggestion.place_id,
          name: suggestion.main_text,
          address: suggestion.secondary_text,
          types: [],
          originalSuggestion: suggestion,
        };
        
        setSearchResults([searchResult]);
        setHasSearched(true);
      }
    } catch (error) {
      console.error('Error loading place details:', error);
      showToast('Failed to load place details', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handle adding place to list - simplified with Google Place IDs
   */
  const handleAddPlace = async (searchResult: SearchResult) => {
    if (!user?.id || addedPlaces.has(searchResult.googlePlaceId)) return;

    try {
      // Update UI optimistically
      setSearchResults(prev => 
        prev.map(result => 
          result.googlePlaceId === searchResult.googlePlaceId 
            ? { ...result, isAdding: true } 
            : result
        )
      );

      // Add place to list using suggestion (ensures proper caching)
      await listsService.addPlaceFromSuggestion(listId, searchResult.originalSuggestion);

      // Update UI
      setAddedPlaces(prev => new Set(prev).add(searchResult.googlePlaceId));
      setSearchResults(prev => 
        prev.map(result => 
          result.googlePlaceId === searchResult.googlePlaceId 
            ? { ...result, isAdding: false, isAdded: true } 
            : result
        )
      );

      showToast(`Added "${searchResult.name}" to ${listName}`);
    } catch (error) {
      console.error('Error adding place to list:', error);
      showToast('Failed to add place to list', 'error');
      
      // Revert optimistic update
      setSearchResults(prev => 
        prev.map(result => 
          result.googlePlaceId === searchResult.googlePlaceId 
            ? { ...result, isAdding: false, isAdded: false } 
            : result
        )
      );
    }
  };

  /**
   * Filter place types to show only useful ones
   */
  const getUsefulPlaceTypes = (types: string[]): string[] => {
    const typeMap: { [key: string]: string } = {
      restaurant: 'Restaurant',
      cafe: 'Cafe',
      bakery: 'Bakery',
      bar: 'Bar',
      shopping_mall: 'Shopping Mall',
      store: 'Store',
      clothing_store: 'Clothing Store',
      book_store: 'Book Store',
      grocery_or_supermarket: 'Grocery Store',
      convenience_store: 'Convenience Store',
      spa: 'Spa',
      gym: 'Gym',
      beauty_salon: 'Beauty Salon',
      hospital: 'Hospital',
      pharmacy: 'Pharmacy',
      bank: 'Bank',
      atm: 'ATM',
      gas_station: 'Gas Station',
      lodging: 'Hotel',
      tourist_attraction: 'Attraction',
      museum: 'Museum',
      art_gallery: 'Art Gallery',
      night_club: 'Night Club',
      movie_theater: 'Cinema',
      park: 'Park',
      zoo: 'Zoo',
      amusement_park: 'Amusement Park'
    };

    const usefulTypes = types
      .filter(type => typeMap[type]) // Only include types we have mapped
      .map(type => typeMap[type]) // Convert to display names
      .slice(0, 2); // Limit to 2 types

    return usefulTypes;
  };

  /**
   * Render search result item
   */
  const renderSearchResult = (result: SearchResult) => {
    const isAdded = addedPlaces.has(result.googlePlaceId) || result.isAdded;
    const isAdding = result.isAdding;
    const usefulTypes = getUsefulPlaceTypes(result.types);

    return (
      <Card
        key={result.googlePlaceId}
        padding="md"
        style={{ marginBottom: Spacing.sm }}
      >
        <View>
          {/* Place Name */}
          <Body style={{ fontWeight: '600', marginBottom: Spacing.xs }}>
            {result.name}
          </Body>
          
          {/* Address without pin icon */}
          <SecondaryText style={{ marginBottom: Spacing.xs, lineHeight: 18 }}>
            {result.address}
          </SecondaryText>

          {/* Place Types - only show useful ones */}
          {usefulTypes.length > 0 && (
            <SecondaryText style={{ 
              fontSize: 12, 
              color: DarkTheme.colors.semantic.tertiaryLabel,
              marginBottom: Spacing.sm
            }}>
              {usefulTypes.join(' • ')}
            </SecondaryText>
          )}

          {/* Add Button - now full width */}
          <TouchableOpacity
            onPress={() => handleAddPlace(result)}
            disabled={isAdded || isAdding}
            style={{
              backgroundColor: isAdded 
                ? DarkTheme.colors.accent.green 
                : DarkTheme.colors.bangkok.gold,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              borderRadius: DarkTheme.borderRadius.sm,
              opacity: isAdded || isAdding ? 0.7 : 1,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={DarkTheme.colors.semantic.systemBackground} />
            ) : isAdded ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Check size={16} color={DarkTheme.colors.semantic.systemBackground} strokeWidth={2} />
                <SecondaryText style={{ 
                  color: DarkTheme.colors.semantic.systemBackground, 
                  marginLeft: Spacing.xs,
                  fontSize: 14,
                  fontWeight: '600'
                }}>
                  Added
                </SecondaryText>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Plus size={16} color={DarkTheme.colors.semantic.systemBackground} strokeWidth={2} />
                <SecondaryText style={{ 
                  color: DarkTheme.colors.semantic.systemBackground, 
                  marginLeft: Spacing.xs,
                  fontSize: 14,
                  fontWeight: '600'
                }}>
                  Add to List
                </SecondaryText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: DarkTheme.colors.semantic.systemBackground 
      }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: DarkTheme.colors.semantic.separator,
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: Spacing.xs, marginRight: Spacing.sm }}
          >
            <ArrowLeft size={24} color={DarkTheme.colors.semantic.label} strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600', fontSize: 18 }}>Add Places</Body>
            <SecondaryText style={{ fontSize: 12 }}>to {listName}</SecondaryText>
          </View>
        </View>

        {/* Search Section */}
        <View style={{ padding: Spacing.lg }}>
          <PlaceAutocomplete
            onPlaceSelect={handlePlaceSelect}
            onGooglePlaceIdSelect={(googlePlaceId, placeName) => {
              handlePlaceSelect({
                place_id: googlePlaceId,
                description: placeName,
                main_text: placeName,
                secondary_text: '',
                types: [] // Add types field for PlaceSuggestion interface
              });
            }}
            location={userLocation}
            placeholder="Search for places in Bangkok..."
            clearOnSelect={false}
          />
        </View>

        {/* Search Results or Recent Places */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: Spacing.lg }}>
          {isSearching && (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center',
              paddingVertical: Spacing.xl 
            }}>
              <ActivityIndicator size="large" color={DarkTheme.colors.bangkok.gold} />
              <SecondaryText style={{ marginTop: Spacing.md }}>
                Loading place details...
              </SecondaryText>
            </View>
          )}

          {!isSearching && hasSearched && searchResults.length > 0 && (
            <View>
              <Title3 style={{ marginBottom: Spacing.md }}>Search Results</Title3>
              {searchResults.map(renderSearchResult)}
            </View>
          )}

          {!isSearching && hasSearched && searchResults.length === 0 && (
            <EmptyState
              title="No Places Found"
              message="Try searching with different keywords or check your spelling."
            />
          )}

          {!isSearching && !hasSearched && recentPlaces.length === 0 && (
            <EmptyState
              title="Search for Places"
              message="Start typing to search for places to add to your list. You can search by name, type, or location."
            />
          )}

          {!isSearching && !hasSearched && recentPlaces.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                <Clock size={16} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                <Title3 style={{ marginLeft: Spacing.xs }}>Recent Places</Title3>
              </View>
              {recentPlaces.map(renderSearchResult)}
            </View>
          )}
        </ScrollView>

        {/* Toast */}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}