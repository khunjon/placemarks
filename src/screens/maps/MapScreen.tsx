import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MapsService, MapMarkerData, MapRegion } from '../../services/maps';
import { ALL_TRANSIT_STATIONS } from '../../data/btsStations';
import { PlacesService } from '../../services/places';
import { Place, RootStackParamList } from '../../types';

type MapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Map'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const MapScreen: React.FC = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);

  // State
  const [region, setRegion] = useState<Region | null>(null); // Start with null, will be set based on location
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTransit, setShowTransit] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<MapMarkerData[] | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(10);
  const [mapReady, setMapReady] = useState(false);
  const [initialLocationLoaded, setInitialLocationLoaded] = useState(false);

  // Load initial data
  useEffect(() => {
    loadUserLocationWithTimeout();
    loadNearbyPlaces();
  }, []);

  const loadUserLocationWithTimeout = async () => {
    // Set a timeout to fallback to Bangkok if location takes too long
    const locationTimeout = setTimeout(() => {
      if (!initialLocationLoaded) {
        console.log('Location timeout, falling back to Bangkok');
        setRegion(MapsService.getBangkokRegion());
        setInitialLocationLoaded(true);
      }
    }, 2000); // 2 second timeout

    try {
      await loadUserLocation();
      clearTimeout(locationTimeout);
    } catch (error) {
      clearTimeout(locationTimeout);
      console.error('Error in location loading:', error);
    }
  };

  const loadUserLocation = async () => {
    try {
      const location = await MapsService.getCurrentLocationFast();
      if (location) {
        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(userCoords);
        
        // Set initial region based on user location
        if (!initialLocationLoaded) {
          let newRegion;
          if (isInBangkok(userCoords.latitude, userCoords.longitude)) {
            // If user is in Bangkok, center on their location
            newRegion = MapsService.createRegion(
              userCoords.latitude,
              userCoords.longitude,
              'medium'
            );
          } else {
            // If user is outside Bangkok, show Bangkok but with user location visible
            newRegion = MapsService.getBangkokRegion();
          }
          setRegion(newRegion);
          setInitialLocationLoaded(true);
        }
      } else {
        // If no location permission, default to Bangkok
        if (!initialLocationLoaded) {
          setRegion(MapsService.getBangkokRegion());
          setInitialLocationLoaded(true);
        }
      }
    } catch (error) {
      console.error('Error loading user location:', error);
      // If location fails, default to Bangkok
      if (!initialLocationLoaded) {
        setRegion(MapsService.getBangkokRegion());
        setInitialLocationLoaded(true);
      }
    }
  };

  const loadNearbyPlaces = async () => {
    setLoading(true);
    try {
      // In a real app, you'd load places from your database
      // For now, we'll use mock data or cached places
      const mockPlaces: Place[] = [
        {
          id: '1',
          name: 'Chatuchak Weekend Market',
          latitude: 13.7998,
          longitude: 100.5501,
          address: 'Chatuchak, Bangkok',
          category: 'Market',
          user_id: 'user1',
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Siam Paragon',
          latitude: 13.7460,
          longitude: 100.5348,
          address: 'Pathum Wan, Bangkok',
          category: 'Shopping Mall',
          user_id: 'user1',
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Lumpini Park',
          latitude: 13.7307,
          longitude: 100.5418,
          address: 'Pathum Wan, Bangkok',
          category: 'Park',
          user_id: 'user1',
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setPlaces(mockPlaces);
    } catch (error) {
      console.error('Error loading places:', error);
      Alert.alert('Error', 'Failed to load places');
    } finally {
      setLoading(false);
    }
  };

  const isInBangkok = (latitude: number, longitude: number): boolean => {
    // Simple bounding box for Bangkok area
    return (
      latitude >= 13.5 && latitude <= 14.0 &&
      longitude >= 100.3 && longitude <= 100.9
    );
  };

  const handleRegionChange = (newRegion: Region) => {
    // Only update region if map is ready to prevent initial scrolling issues
    if (mapReady) {
      setRegion(newRegion);
      
      // Calculate approximate zoom level
      const zoom = Math.round(Math.log(360 / newRegion.longitudeDelta) / Math.LN2);
      setZoomLevel(zoom);
    }
  };

  const handleMapReady = () => {
    setMapReady(true);
    // No need to animate to region here since we set it based on user location
  };

  const handleMarkerPress = (marker: MapMarkerData) => {
    if (marker.type === 'place') {
      const place = marker.data as Place;
      navigation.navigate('PlaceDetails', { placeId: place.id });
    } else if (marker.type === 'transit') {
      // Show transit station info
      Alert.alert(
        marker.title,
        marker.description,
        [
          { text: 'Get Directions', onPress: () => getDirectionsToMarker(marker) },
          { text: 'Close', style: 'cancel' },
        ]
      );
    }
  };

  const getDirectionsToPlace = async (place: Place) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services to get directions');
      return;
    }

    try {
      await MapsService.openExternalMaps(
        [place.longitude, place.latitude],
        place.name,
        'driving'
      );
    } catch (error) {
      console.error('Error opening directions:', error);
      Alert.alert('Error', 'Failed to open directions');
    }
  };

  const getDirectionsToMarker = async (marker: MapMarkerData) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services to get directions');
      return;
    }

    try {
      await MapsService.openExternalMaps(
        [marker.coordinate.longitude, marker.coordinate.latitude],
        marker.title,
        'transit'
      );
    } catch (error) {
      console.error('Error opening directions:', error);
      Alert.alert('Error', 'Failed to open directions');
    }
  };

  const centerOnUserLocation = async () => {
    if (userLocation && mapReady) {
      const newRegion = MapsService.createRegion(
        userLocation.latitude,
        userLocation.longitude,
        'close'
      );
      mapRef.current?.animateToRegion(newRegion, 1000);
    } else if (!userLocation) {
      // Try to get location again
      await loadUserLocation();
    }
  };

  const toggleTransitStations = () => {
    setShowTransit(!showTransit);
  };

  const toggleClustering = () => {
    setShowClusters(!showClusters);
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'place':
        return '#FF6B6B';
      case 'checkin':
        return '#4ECDC4';
      case 'transit':
        return '#4A90E2';
      case 'user':
        return '#8B5CF6';
      default:
        return '#666';
    }
  };

  const renderMarkers = () => {
    const allMarkers: MapMarkerData[] = [];

    // Add place markers
    places.forEach(place => {
      allMarkers.push({
        id: place.id,
        coordinate: {
          latitude: place.latitude,
          longitude: place.longitude,
        },
        title: place.name,
        description: place.address || place.category,
        type: 'place',
        data: place,
      });
    });

    // Add transit station markers if enabled
    if (showTransit) {
      ALL_TRANSIT_STATIONS.forEach(station => {
        allMarkers.push({
          id: `transit-${station.id}`,
          coordinate: {
            latitude: station.coordinates[1], // coordinates are [longitude, latitude]
            longitude: station.coordinates[0],
          },
          title: station.nameEn,
          description: `${station.line} Line`,
          type: 'transit',
          data: station,
        });
      });
    }

    // Add user location marker
    if (userLocation) {
      allMarkers.push({
        id: 'user-location',
        coordinate: userLocation,
        title: 'Your Location',
        description: 'Current location',
        type: 'user',
      });
    }

    // Render markers
    return allMarkers.map(marker => (
      <Marker
        key={marker.id}
        coordinate={marker.coordinate}
        title={marker.title}
        description={marker.description}
        pinColor={getMarkerColor(marker.type)}
        onPress={() => handleMarkerPress(marker)}
      />
    ));
  };

  const renderClusterModal = () => {
    if (!selectedCluster) return null;

    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCluster(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedCluster.length} Locations
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedCluster(null)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={selectedCluster}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.clusterItem}
                onPress={() => {
                  setSelectedCluster(null);
                  handleMarkerPress(item);
                }}
              >
                <View style={styles.clusterItemContent}>
                  <Text style={styles.clusterItemTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.clusterItemDescription}>{item.description}</Text>
                  )}
                  <Text style={styles.clusterItemType}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChange}
          onMapReady={handleMapReady}
          showsUserLocation={false} // We'll use custom marker
          showsMyLocationButton={false}
          moveOnMarkerPress={false}
          pitchEnabled={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {renderMarkers()}
        </MapView>
      )}

      {/* Control buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={centerOnUserLocation}
        >
          <Ionicons name="locate" size={24} color="#4A90E2" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, showTransit && styles.activeButton]}
          onPress={toggleTransitStations}
        >
          <Ionicons name="train" size={24} color={showTransit ? "white" : "#4A90E2"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, showClusters && styles.activeButton]}
          onPress={toggleClustering}
        >
          <Ionicons name="apps" size={24} color={showClusters ? "white" : "#4A90E2"} />
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {(loading || !mapReady || !region) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>
            {loading ? 'Loading places...' : !region ? 'Getting your location...' : 'Initializing map...'}
          </Text>
        </View>
      )}

      {renderClusterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activeButton: {
    backgroundColor: '#4A90E2',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  clusterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  clusterItemContent: {
    flex: 1,
  },
  clusterItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clusterItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clusterItemType: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
}); 