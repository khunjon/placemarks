import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Body, 
  SecondaryText,
  ElevatedCard,
  EmptyState,
  LoadingState,
} from '../components/common';
import { MapsService } from '../services/maps';
import { placesService } from '../services/places';
import { checkInUtils } from '../services/checkInsService';
import type { CheckInStackScreenProps } from '../navigation/types';

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
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);



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

  // Search for nearby places using Google Places API
  const searchNearbyPlaces = async (location: Location.LocationObject) => {
    try {
      setError(null);
      console.log('Searching for places near:', location.coords.latitude, location.coords.longitude);

      // Use Google Places API directly for nearby search
      const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      
      if (!GOOGLE_PLACES_API_KEY) {
        throw new Error('Google Places API key not configured');
      }

      const radius = 500; // Fixed 500m radius
      
      // First, get basic place data from nearby search
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
      const nearbyParams = new URLSearchParams({
        location: `${location.coords.latitude},${location.coords.longitude}`,
        radius: radius.toString(),
        key: GOOGLE_PLACES_API_KEY,
      });

      const nearbyResponse = await fetch(`${nearbyUrl}?${nearbyParams}`);
      const nearbyData = await nearbyResponse.json();

      if (nearbyData.status !== 'OK') {
        if (nearbyData.status === 'ZERO_RESULTS') {
          setNearbyPlaces([]);
          return;
        }
        throw new Error(`Google Places API error: ${nearbyData.status}`);
      }

      // Get detailed information for each place to check business status
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
      const placePromises = nearbyData.results.map(async (place: any) => {
        try {
          const detailsParams = new URLSearchParams({
            place_id: place.place_id,
            fields: 'business_status',
            key: GOOGLE_PLACES_API_KEY,
          });

          const detailsResponse = await fetch(`${detailsUrl}?${detailsParams}`);
          const detailsData = await detailsResponse.json();

          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          return {
            google_place_id: place.place_id,
            name: place.name,
            address: place.vicinity || place.formatted_address || '',
            types: place.types || [],
            distance: Math.round(distance),
            coordinates: [place.geometry.location.lng, place.geometry.location.lat],
            business_status: detailsData.result?.business_status || 'OPERATIONAL',
          };
        } catch (error) {
          console.warn(`Failed to get details for place ${place.place_id}:`, error);
          // If we can't get business status, assume it's operational
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          return {
            google_place_id: place.place_id,
            name: place.name,
            address: place.vicinity || place.formatted_address || '',
            types: place.types || [],
            distance: Math.round(distance),
            coordinates: [place.geometry.location.lng, place.geometry.location.lat],
            business_status: 'OPERATIONAL',
          };
        }
      });

      const placesWithStatus = await Promise.all(placePromises);

      // Filter out permanently closed businesses and places beyond 500m, then sort by distance
      const nearbyPlaces = placesWithStatus
        .filter(place => 
          place.distance <= 500 && 
          place.business_status !== 'CLOSED_PERMANENTLY'
        )
        .sort((a, b) => a.distance - b.distance);

      console.log(`Found ${nearbyPlaces.length} operational places within 500m`);
      setNearbyPlaces(nearbyPlaces);

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
              {checkInUtils.getCategoryIcon(undefined, place.types)}
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
        flexDirection: 'row',
        alignItems: 'center',
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
          Nearby Places
        </Typography>
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

      {/* Places List */}
      {!loading && !error && (
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingHorizontal: Spacing.layout.screenPadding,
            paddingVertical: Spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {nearbyPlaces.length > 0 ? (
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
                description="Try exploring somewhere new!"
                primaryAction={{
                  title: "Try Again",
                  onPress: handleRetry,
                }}
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
} 