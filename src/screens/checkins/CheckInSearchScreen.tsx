import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Colors } from '../../constants/Colors';
import { CACHE_CONFIG } from '../../config/cacheConfig';
import { Spacing } from '../../constants/Spacing';
import { 
  Typography, 
  Body, 
  SecondaryText,
  ElevatedCard,
  EmptyState,
  LoadingState,
} from '../../components/common';
import { checkInUtils } from '../../services/checkInsService';
import { cacheManager } from '../../services/cacheManager';
import { placesService } from '../../services/places';
import { supabase } from '../../services/supabase';
import type { CheckInStackScreenProps } from '../../navigation/types';

type CheckInSearchScreenProps = CheckInStackScreenProps<'CheckInSearch'>;

// Interface for search result places
interface SearchPlaceResult {
  google_place_id: string;
  name: string;
  address: string;
  types: string[];
  distance: number; // in meters
  coordinates: [number, number]; // [longitude, latitude]
  business_status?: string;
}

export default function CheckInSearchScreen({ navigation }: CheckInSearchScreenProps) {
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchPlaceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');

  // Extract street address (remove city/country)
  const getStreetAddress = (fullAddress: string): string => {
    // Remove common suffixes like ", Bangkok", ", Thailand", postal codes
    const cleanAddress = fullAddress
      .replace(/, Bangkok.*$/i, '')
      .replace(/, Thailand.*$/i, '')
      .replace(/\s+\d{5}.*$/, '') // Remove postal codes
      .trim();
    
    return cleanAddress;
  };

  // Format distance in meters
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get user location for search context (without loading nearby places)
  const getUserLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request location permission and get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required for better search results');
        setLoading(false);
        return;
      }

      console.log('Getting current location for search context...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('Location obtained:', location.coords.latitude, location.coords.longitude);
      setUserLocation(location);

    } catch (err) {
      console.error('Error getting location:', err);
      setError('Failed to get your location');
    } finally {
      setLoading(false);
    }
  };

  // Handle place selection
  const handlePlacePress = (place: SearchPlaceResult) => {
    // Navigate to check-in form with the selected place
    navigation.navigate('CheckInForm', {
      placeId: place.google_place_id,
      placeName: place.name,
      placeType: place.types[0] || 'establishment',
    });
  };

  // Handle retry
  const handleRetry = () => {
    getUserLocation();
  };

  // Text search for places with caching and smart similarity detection
  const searchPlaces = async (query: string) => {
    if (!query.trim()) return;

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

    setIsSearching(true);
    setLastSearchedQuery(query);
    
    try {
      // Check cache first, but validate cached results
      const cachedResults = userLocation ? await cacheManager.search.getText(query, userLocation) : null;
      if (cachedResults) {
        // Validate that all cached places still exist in the database
        const placeIds = cachedResults.map(r => r.google_place_id);
        const { data: existingPlaces } = await supabase
          .from('google_places_cache')
          .select('google_place_id')
          .in('google_place_id', placeIds);
        
        const existingPlaceIds = new Set(existingPlaces?.map((p: any) => p.google_place_id) || []);
        const validResults = cachedResults.filter(r => existingPlaceIds.has(r.google_place_id));
        
        // If all cached results are still valid, use them
        if (validResults.length === cachedResults.length && validResults.length > 0) {
          console.log('🗄️ CACHE HIT: Retrieved text search from check-in cache', {
            query: query.trim(),
            location: userLocation ? `${userLocation.coords.latitude},${userLocation.coords.longitude}` : 'No location',
            resultCount: validResults.length,
            cost: '$0.000 - FREE!'
          });
          setSearchResults(validResults);
          setIsSearching(false);
          return;
        } else {
          // Cache is stale, clear it for this query
          console.log('🗑️ CACHE INVALIDATED: Cached results contain deleted places, fetching fresh data');
        }
      }

      const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      
      if (!GOOGLE_PLACES_API_KEY) {
        throw new Error('Google Places API key not configured');
      }

      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
      const textSearchParams = new URLSearchParams({
        query: query.trim(),
        key: GOOGLE_PLACES_API_KEY,
      });

      // Add location context if available
      if (userLocation) {
        textSearchParams.append('location', `${userLocation.coords.latitude},${userLocation.coords.longitude}`);
        textSearchParams.append('radius', '5000'); // 5km radius for search
      }

      console.log('🟢 GOOGLE API CALL: Text Search for check-in locations', {
        query: query.trim(),
        location: userLocation ? `${userLocation.coords.latitude},${userLocation.coords.longitude}` : 'No location',
        radius: userLocation ? '5000m' : 'Global',
        cost: '$0.032 per 1000 calls - PAID'
      });
      
      const response = await fetch(`${textSearchUrl}?${textSearchParams}`);
      const data = await response.json();

      if (data.status === 'OK' && data.results) {
        const results: SearchPlaceResult[] = [];
        
        // Process each place result and cache it in google_places_cache
        for (const place of data.results) {
          // Cache the place in google_places_cache for check-ins
          await placesService.cacheGooglePlace(place);
          
          const distance = userLocation ? calculateDistance(
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          ) : 0;

          results.push({
            google_place_id: place.place_id,
            name: place.name,
            address: getStreetAddress(place.formatted_address || ''),
            types: place.types || [],
            distance: Math.round(distance),
            coordinates: [place.geometry.location.lng, place.geometry.location.lat],
            business_status: place.business_status || 'OPERATIONAL',
          });
        }
        
        // Sort by distance
        const sortedResults = results.sort((a: SearchPlaceResult, b: SearchPlaceResult) => a.distance - b.distance);

        // Cache the search results if we have location
        if (userLocation) {
          await cacheManager.search.storeText(query, userLocation, sortedResults);
        }
        
        setSearchResults(sortedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 3) {
      setSearchResults([]);
      setLastSearchedQuery(''); // Reset similarity tracking when clearing
    }
  };

  // Enhanced debounced search effect
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    
    if (trimmedQuery.length >= 3) {
      const timeoutId = setTimeout(() => {
        searchPlaces(trimmedQuery);
      }, CACHE_CONFIG.DEBOUNCE.SEARCH_MS);
      return () => clearTimeout(timeoutId);
    } else if (trimmedQuery.length === 0) {
      // Clear results immediately when query is empty
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      // Cleanup timeout on unmount or query change
    };
  }, [searchQuery]);

  // Get user location on mount (for search context only)
  useEffect(() => {
    getUserLocation();
  }, []);

  // Render place item
  const renderPlaceItem = (place: SearchPlaceResult) => (
    <TouchableOpacity
      key={place.google_place_id}
      onPress={() => handlePlacePress(place)}
      style={{ marginBottom: Spacing.sm }}
    >
      <ElevatedCard padding="md">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Category Icon */}
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: Colors.semantic.backgroundTertiary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: Spacing.md,
          }}>
            <Typography variant="body" style={{ fontSize: 20 }}>
              {checkInUtils.getCategoryIcon(undefined, place.types, place.name)}
            </Typography>
          </View>

          {/* Place Info */}
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600', marginBottom: Spacing.xs }}>
              {place.name}
            </Body>
            <SecondaryText style={{ fontSize: 14, marginBottom: Spacing.xs }}>
              {getStreetAddress(place.address)}
            </SecondaryText>
            {userLocation && place.distance > 0 && (
              <SecondaryText style={{ fontSize: 12 }}>
                {formatDistance(place.distance)}
              </SecondaryText>
            )}
          </View>

          {/* Arrow indicator */}
          <View style={{ marginLeft: Spacing.sm }}>
            <Typography variant="body" color="secondary">
              →
            </Typography>
          </View>
        </View>
      </ElevatedCard>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: Spacing.md,
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: Spacing.md }}
          >
            <Typography variant="body" color="primary">
              ← Back
            </Typography>
          </TouchableOpacity>
          <Typography variant="title2" style={{ fontWeight: 'bold', flex: 1 }}>
            Search Places
          </Typography>
        </View>

        {/* Search Input */}
        <View>
          <TextInput
            style={{
              backgroundColor: Colors.semantic.backgroundSecondary,
              borderRadius: 8,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              fontSize: 16,
              color: Colors.semantic.textPrimary,
            }}
            placeholder="Search for a place to check in..."
            placeholderTextColor={Colors.semantic.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            returnKeyType="search"
            autoFocus={true}
          />
        </View>
      </View>

      {/* Loading State */}
      {loading && (
        <LoadingState message="Getting your location..." />
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={{ 
          flex: 1, 
          paddingHorizontal: Spacing.layout.screenPadding,
          justifyContent: 'center',
        }}>
          <EmptyState
            title="Location Error"
            description={error}
            primaryAction={{
              title: "Try Again",
              onPress: handleRetry,
            }}
          />
        </View>
      )}

      {/* Content Area */}
      {!loading && !error && (
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingHorizontal: Spacing.layout.screenPadding,
            paddingVertical: Spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Instruction */}
          {searchQuery.length === 0 && (
            <View style={{ 
              flex: 1, 
              justifyContent: 'center',
              minHeight: 300,
            }}>
              <EmptyState
                title="Search for Places"
                description="Type at least 3 characters to search for restaurants, cafes, shops, and more!"
              />
            </View>
          )}

          {/* Search too short */}
          {searchQuery.length > 0 && searchQuery.length < 3 && (
            <View style={{ marginBottom: Spacing.lg }}>
              <SecondaryText style={{ textAlign: 'center' }}>
                Keep typing to search...
              </SecondaryText>
            </View>
          )}

          {/* Searching indicator */}
          {isSearching && (
            <View style={{ marginBottom: Spacing.lg }}>
              <SecondaryText style={{ textAlign: 'center' }}>
                Searching...
              </SecondaryText>
            </View>
          )}

          {/* Search Results */}
          {!isSearching && searchQuery.length >= 3 && (
            <>
              {searchResults.length > 0 ? (
                <>
                  <View style={{ marginBottom: Spacing.lg }}>
                    <SecondaryText style={{ textAlign: 'center' }}>
                      Found {searchResults.length} place{searchResults.length !== 1 ? 's' : ''}
                    </SecondaryText>
                  </View>
                  
                  {searchResults.map(renderPlaceItem)}
                </>
              ) : (
                <View style={{ 
                  flex: 1, 
                  justifyContent: 'center',
                  minHeight: 300,
                }}>
                  <EmptyState
                    title="No places found"
                    description={`No results for "${searchQuery}". Try a different search term or check your spelling.`}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
} 