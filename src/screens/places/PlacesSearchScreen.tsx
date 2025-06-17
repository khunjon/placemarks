import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Place, PlaceSuggestion, Location as LocationType } from '../../types';
import { placesService } from '../../services/places';
import { placesCacheService } from '../../services/placesCache';
import PlaceCard from '../../components/places/PlaceCard';
import PlaceAutocomplete from '../../components/places/PlaceAutocomplete';

export default function PlacesSearchScreen() {
  const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'nearby' | 'search' | 'cache'>('nearby');

  useEffect(() => {
    getCurrentLocation();
    loadCacheStats();
  }, []);

  useEffect(() => {
    if (currentLocation && activeTab === 'nearby') {
      loadNearbyPlaces();
    }
  }, [currentLocation, activeTab]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby places.');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Failed to get your current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const loadNearbyPlaces = async () => {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const places = await placesService.searchNearbyPlaces(
        currentLocation,
        1000, // 1km radius
        'restaurant' // Focus on restaurants for demo
      );
      setNearbyPlaces(places);
    } catch (error) {
      console.error('Error loading nearby places:', error);
      Alert.alert('Error', 'Failed to load nearby places. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadCacheStats = async () => {
    try {
      const stats = await placesCacheService.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const handlePlaceSelect = async (suggestion: PlaceSuggestion) => {
    setLoading(true);
    try {
      const placeDetails = await placesService.getPlaceDetails(suggestion.place_id);
      setSearchResults([placeDetails as any]); // Convert PlaceDetails to Place for display
      setActiveTab('search');
    } catch (error) {
      console.error('Error getting place details:', error);
      Alert.alert('Error', 'Failed to get place details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlacePress = (place: Place) => {
    Alert.alert(
      place.name,
      `${place.address}\n\nBangkok Context:\n• Environment: ${place.bangkok_context.environment}\n• BTS: ${place.bangkok_context.bts_proximity}\n• Price: ${place.bangkok_context.price_tier}\n• AC: ${place.bangkok_context.air_conditioning ? 'Yes' : 'No'}\n• Noise: ${place.bangkok_context.noise_level}`,
      [{ text: 'OK' }]
    );
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached places?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const cleared = await placesCacheService.clearExpiredCache();
              Alert.alert('Success', `Cleared ${cleared} cached places`);
              loadCacheStats();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const calculateDistance = (place: Place): number => {
    if (!currentLocation) return 0;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (place.coordinates[1] - currentLocation.latitude) * Math.PI / 180;
    const dLng = (place.coordinates[0] - currentLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(currentLocation.latitude * Math.PI / 180) * Math.cos(place.coordinates[1] * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const renderPlace = ({ item }: { item: Place }) => (
    <PlaceCard
      id={item.id}
      name={item.name}
      type={item.primary_type as any || 'restaurant'}
      description={item.place_type || ''}
      address={item.address}
      distance={currentLocation ? `${calculateDistance(item).toFixed(1)}km away` : ''}
      rating={item.price_level}
      onCheckIn={(placeId, placeName) => {
        // Handle check-in if needed
        console.log('Check-in at:', placeName);
      }}
      onPress={() => handlePlacePress(item)}
    />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'nearby':
        if (locationLoading) {
          return (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          );
        }

        if (!currentLocation) {
          return (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>Location permission required</Text>
              <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Restaurants</Text>
              <TouchableOpacity onPress={loadNearbyPlaces} disabled={loading}>
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Finding nearby places...</Text>
              </View>
            ) : (
              <FlatList
                data={nearbyPlaces}
                renderItem={renderPlace}
                keyExtractor={(item) => item.google_place_id}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>No nearby places found</Text>
                    <Text style={styles.emptySubtext}>Try expanding your search radius</Text>
                  </View>
                }
              />
            )}
          </View>
        );

      case 'search':
        return (
          <View style={styles.tabContent}>
            <PlaceAutocomplete
              onPlaceSelect={handlePlaceSelect}
              location={currentLocation || undefined}
              style={styles.searchInput}
            />
            
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Loading place details...</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderPlace}
                keyExtractor={(item) => item.google_place_id}
                showsVerticalScrollIndicator={false}
                style={styles.searchResults}
                ListEmptyComponent={
                  <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Search for places above</Text>
                    <Text style={styles.emptySubtext}>Try searching for restaurants, cafes, or attractions</Text>
                  </View>
                }
              />
            )}
          </View>
        );

      case 'cache':
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.cacheSection}>
              <Text style={styles.sectionTitle}>Cache Statistics</Text>
              
              {cacheStats ? (
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Places Cached</Text>
                    <Text style={styles.statValue}>{cacheStats.totalPlaces}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Recent Places (24h)</Text>
                    <Text style={styles.statValue}>{cacheStats.recentPlaces}</Text>
                  </View>
                  
                  {cacheStats.oldestPlace && (
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Oldest Cache Entry</Text>
                      <Text style={styles.statValue}>
                        {new Date(cacheStats.oldestPlace).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  
                  {cacheStats.newestPlace && (
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Newest Cache Entry</Text>
                      <Text style={styles.statValue}>
                        {new Date(cacheStats.newestPlace).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <ActivityIndicator size="small" color="#4A90E2" />
              )}
              
              <TouchableOpacity style={styles.clearCacheButton} onPress={clearCache}>
                <Text style={styles.clearCacheButtonText}>Clear Expired Cache</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.refreshStatsButton} onPress={loadCacheStats}>
                <Text style={styles.refreshStatsButtonText}>Refresh Stats</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Places Search Demo</Text>
        <Text style={styles.subtitle}>Google Places API with MCP Caching</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'nearby' && styles.activeTab]}
          onPress={() => setActiveTab('nearby')}
        >
          <Text style={[styles.tabText, activeTab === 'nearby' && styles.activeTabText]}>
            Nearby
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cache' && styles.activeTab]}
          onPress={() => setActiveTab('cache')}
        >
          <Text style={[styles.tabText, activeTab === 'cache' && styles.activeTabText]}>
            Cache
          </Text>
        </TouchableOpacity>
      </View>

      {renderTabContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  refreshText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    margin: 16,
  },
  searchResults: {
    flex: 1,
    marginTop: 16,
  },
  cacheSection: {
    padding: 20,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  clearCacheButton: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearCacheButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshStatsButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshStatsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 