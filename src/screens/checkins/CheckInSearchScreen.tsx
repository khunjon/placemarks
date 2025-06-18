import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { 
  Typography, 
  Body, 
  SecondaryText,
  ElevatedCard,
  EmptyState,
  LoadingState,
} from '../../components/common';
import { MapsService } from '../../services/maps';
import { placesService } from '../../services/places';
import { checkInUtils } from '../../services/checkInsService';
import { checkInSearchCache } from '../../services/checkInSearchCache';
import type { CheckInStackScreenProps } from '../../navigation/types';

type CheckInSearchScreenProps = CheckInStackScreenProps<'CheckInSearch'>;

// Interface for nearby place with distance
interface NearbyPlaceResult {
  google_place_id: string;
  name: string;
  address: string;
  types: string[];
  distance: number; // in meters
  coordinates: [number, number]; // [longitude, latitude]
  business_status?: string; // Add business status
}

export default function CheckInSearchScreen({ navigation }: CheckInSearchScreenProps) {
  const [loading, setLoading] = useState(true);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceResult[]>([]);
  const [searchResults, setSearchResults] = useState<NearbyPlaceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'nearby' | 'search'>('nearby');
  const [showCacheStats, setShowCacheStats] = useState(false);



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

  // Search for nearby places using Google Places API with optimized single search call
  // OPTIMIZATION: Removed expensive text searches and business status checks to reduce API calls from 17-37 to just 1
  const searchNearbyPlaces = async (location: Location.LocationObject) => {
    try {
      setError(null);
      console.log('Searching for places near:', location.coords.latitude, location.coords.longitude);

      const radius = 500; // Fixed 500m radius

      // Check cache first
      const cachedResults = await checkInSearchCache.getCachedNearbySearch(location, radius);
      if (cachedResults) {
        setNearbyPlaces(cachedResults);
        return;
      }

      // Use Google Places API directly for nearby search
      const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      
      if (!GOOGLE_PLACES_API_KEY) {
        throw new Error('Google Places API key not configured');
      }

      // Step 1: Nearby Search (for businesses and commercial establishments)
      console.log('Running nearby search...');
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
      const nearbyParams = new URLSearchParams({
        location: `${location.coords.latitude},${location.coords.longitude}`,
        radius: radius.toString(),
        key: GOOGLE_PLACES_API_KEY,
      });

      console.log('🔍 GOOGLE PLACES API CALL: Nearby Search', {
        url: `${nearbyUrl}?${nearbyParams}`,
        location: `${location.coords.latitude},${location.coords.longitude}`,
        radius: radius
      });
      
      const nearbyResponse = await fetch(`${nearbyUrl}?${nearbyParams}`);
      const nearbyData = await nearbyResponse.json();
      
      console.log('✅ GOOGLE PLACES API RESPONSE: Nearby Search', {
        status: nearbyData.status,
        resultCount: nearbyData.results?.length || 0,
        cost: '$0.032 per 1000 calls'
      });

      if (nearbyData.status !== 'OK') {
        throw new Error(`Google Places API error: ${nearbyData.status}`);
      }

      const places: NearbyPlaceResult[] = [];
      
      if (nearbyData.results) {
        for (const place of nearbyData.results) {
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          // Only include places within our radius
          if (distance <= radius) {
            places.push({
              google_place_id: place.place_id,
              name: place.name,
              address: getStreetAddress(place.vicinity || place.formatted_address || ''),
              types: place.types || [],
              distance: Math.round(distance),
              coordinates: [place.geometry.location.lng, place.geometry.location.lat],
              business_status: 'OPERATIONAL', // Assume operational to avoid extra API calls
            });
          }
        }
      }

      // Sort by distance
      const finalPlaces = places.sort((a, b) => a.distance - b.distance);

      console.log(`Found ${finalPlaces.length} places within 500m`);
      
      // Cache the results
      await checkInSearchCache.cacheNearbySearch(location, radius, finalPlaces);
      
      setNearbyPlaces(finalPlaces);

    } catch (err) {
      console.error('Error searching nearby places:', err);
      setError('Failed to find nearby places');
    }
  };

  // Get user location and search for places
  const loadNearbyPlaces = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request location permission and get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find nearby places');
        return;
      }

      console.log('Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('Location obtained:', location.coords.latitude, location.coords.longitude);
      setUserLocation(location);

      // Search for nearby places
      await searchNearbyPlaces(location);

    } catch (err) {
      console.error('Error loading nearby places:', err);
      setError('Failed to get your location');
    } finally {
      setLoading(false);
    }
  };

  // Load places on screen mount
  useEffect(() => {
    loadNearbyPlaces();
  }, []);

  // Handle place selection
  const handlePlacePress = (place: NearbyPlaceResult) => {
    // Navigate to check-in form with the selected place
    navigation.navigate('CheckInForm', {
      placeId: place.google_place_id,
      placeName: place.name,
      placeType: place.types[0] || 'establishment',
    });
  };

  // Handle retry
  const handleRetry = () => {
    loadNearbyPlaces();
  };

  // Clear cache and retry
  const handleClearCacheAndRetry = async () => {
    try {
      await checkInSearchCache.clearCache();
      loadNearbyPlaces();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  // Show cache stats (for debugging)
  const showCacheStatsInfo = async () => {
    try {
      const stats = await checkInSearchCache.getCacheStats();
      Alert.alert(
        'Cache Statistics',
        `Nearby searches: ${stats.nearbySearches}\nText searches: ${stats.textSearches}\nTotal size: ${stats.totalSizeKB}KB\nOldest: ${stats.oldestEntry?.toLocaleString() || 'None'}\nNewest: ${stats.newestEntry?.toLocaleString() || 'None'}`,
        [
          { text: 'Clear Cache', onPress: handleClearCacheAndRetry, style: 'destructive' },
          { text: 'OK', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Error getting cache stats:', error);
    }
  };

  // Manual search for places with caching
  const searchPlaces = async (query: string) => {
    if (!query.trim() || !userLocation) return;

    setIsSearching(true);
    try {
      // Check cache first
      const cachedResults = await checkInSearchCache.getCachedTextSearch(query, userLocation);
      if (cachedResults) {
        setSearchResults(cachedResults);
        setIsSearching(false);
        return;
      }

      const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      
      if (!GOOGLE_PLACES_API_KEY) {
        throw new Error('Google Places API key not configured');
      }

      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
      const textSearchParams = new URLSearchParams({
        query: query.trim(),
        location: `${userLocation.coords.latitude},${userLocation.coords.longitude}`,
        radius: '1000', // Expand radius for manual search
        key: GOOGLE_PLACES_API_KEY,
      });

      console.log('🔍 GOOGLE PLACES API CALL: Text Search', {
        url: `${textSearchUrl}?${textSearchParams}`,
        query: query.trim(),
        location: `${userLocation.coords.latitude},${userLocation.coords.longitude}`,
        radius: '1000m'
      });
      
      const response = await fetch(`${textSearchUrl}?${textSearchParams}`);
      const data = await response.json();
      
      console.log('✅ GOOGLE PLACES API RESPONSE: Text Search', {
        status: data.status,
        resultCount: data.results?.length || 0,
        query: query.trim(),
        cost: '$0.032 per 1000 calls'
      });

      if (data.status === 'OK' && data.results) {
        const results: NearbyPlaceResult[] = data.results.map((place: any) => {
          const distance = calculateDistance(
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          return {
            google_place_id: place.place_id,
            name: place.name,
            address: getStreetAddress(place.formatted_address || ''),
            types: place.types || [],
            distance: Math.round(distance),
            coordinates: [place.geometry.location.lng, place.geometry.location.lat],
            business_status: 'OPERATIONAL',
          };
        }).sort((a: NearbyPlaceResult, b: NearbyPlaceResult) => a.distance - b.distance);

        // Cache the results
        await checkInSearchCache.cacheTextSearch(query, userLocation, results);
        
        setSearchResults(results);
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
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim().length >= 3) {
      const timeoutId = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  // Render place item
  const renderPlaceItem = (place: NearbyPlaceResult) => (
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
            <SecondaryText style={{ fontSize: 12 }}>
              {formatDistance(place.distance)}
            </SecondaryText>
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
          <TouchableOpacity 
            onLongPress={showCacheStatsInfo}
            style={{ flex: 1 }}
            activeOpacity={1}
          >
            <Typography variant="title2" style={{ fontWeight: 'bold' }}>
              Find Places
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: Colors.semantic.backgroundSecondary,
          borderRadius: 8,
          padding: 2,
        }}>
          <TouchableOpacity
            onPress={() => setActiveTab('nearby')}
            style={{
              flex: 1,
              paddingVertical: Spacing.sm,
              paddingHorizontal: Spacing.md,
              borderRadius: 6,
              backgroundColor: activeTab === 'nearby' ? Colors.semantic.backgroundPrimary : 'transparent',
            }}
          >
            <Typography 
              variant="body" 
              style={{ 
                textAlign: 'center', 
                fontWeight: activeTab === 'nearby' ? '600' : '400',
                color: activeTab === 'nearby' ? Colors.semantic.textPrimary : Colors.semantic.textSecondary,
              }}
            >
              Nearby
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('search')}
            style={{
              flex: 1,
              paddingVertical: Spacing.sm,
              paddingHorizontal: Spacing.md,
              borderRadius: 6,
              backgroundColor: activeTab === 'search' ? Colors.semantic.backgroundPrimary : 'transparent',
            }}
          >
            <Typography 
              variant="body" 
              style={{ 
                textAlign: 'center', 
                fontWeight: activeTab === 'search' ? '600' : '400',
                color: activeTab === 'search' ? Colors.semantic.textPrimary : Colors.semantic.textSecondary,
              }}
            >
              Search
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Search Input (only visible on search tab) */}
        {activeTab === 'search' && (
          <View style={{ marginTop: Spacing.md }}>
            <TextInput
              style={{
                backgroundColor: Colors.semantic.backgroundSecondary,
                borderRadius: 8,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                fontSize: 16,
                color: Colors.semantic.textPrimary,
              }}
              placeholder="Search for a place..."
              placeholderTextColor={Colors.semantic.textSecondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        )}
      </View>

      {/* Loading State */}
      {loading && (
        <LoadingState message="Finding places near you..." />
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={{ 
          flex: 1, 
          paddingHorizontal: Spacing.layout.screenPadding,
          justifyContent: 'center',
        }}>
          <EmptyState
            title="Couldn't find places"
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
          {activeTab === 'nearby' ? (
            // Nearby Places Tab
            nearbyPlaces.length > 0 ? (
              <>
                <View style={{ marginBottom: Spacing.lg }}>
                  <SecondaryText style={{ textAlign: 'center' }}>
                    {nearbyPlaces.length} place{nearbyPlaces.length !== 1 ? 's' : ''} within 500m
                  </SecondaryText>
                </View>
                
                {nearbyPlaces.map(renderPlaceItem)}
              </>
            ) : (
              <View style={{ 
                flex: 1, 
                justifyContent: 'center',
                minHeight: 400,
              }}>
                <EmptyState
                  title="No places nearby?"
                  description="Try the Search tab to find specific places like condos or apartments!"
                  primaryAction={{
                    title: "Switch to Search",
                    onPress: () => setActiveTab('search'),
                  }}
                  secondaryAction={{
                    title: "Try Again",
                    onPress: handleRetry,
                  }}
                />
              </View>
            )
          ) : (
            // Search Results Tab
            <>
              {searchQuery.length > 0 && searchQuery.length < 3 && (
                <View style={{ marginBottom: Spacing.lg }}>
                  <SecondaryText style={{ textAlign: 'center' }}>
                    Type at least 3 characters to search
                  </SecondaryText>
                </View>
              )}
              
              {isSearching && (
                <LoadingState message="Searching places..." />
              )}
              
              {!isSearching && searchQuery.length >= 3 && (
                searchResults.length > 0 ? (
                  <>
                    <View style={{ marginBottom: Spacing.lg }}>
                      <SecondaryText style={{ textAlign: 'center' }}>
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                      </SecondaryText>
                    </View>
                    
                    {searchResults.map(renderPlaceItem)}
                  </>
                ) : searchQuery.length >= 3 ? (
                  <View style={{ 
                    flex: 1, 
                    justifyContent: 'center',
                    minHeight: 400,
                  }}>
                    <EmptyState
                      title="No results found"
                      description={`Try searching for "${searchQuery.split(' ')[0]}" or a different term`}
                    />
                  </View>
                ) : null
              )}
              
              {searchQuery.length === 0 && (
                <View style={{ 
                  flex: 1, 
                  justifyContent: 'center',
                  minHeight: 400,
                }}>
                  <EmptyState
                    title="Search for a place"
                    description="Type the name of a specific place you're looking for"
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