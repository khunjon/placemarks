import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { MapMarkerData } from '../../services/maps';

interface PlaceClusterProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  markers: MapMarkerData[];
  onPress?: (markers: MapMarkerData[]) => void;
}

export const PlaceCluster: React.FC<PlaceClusterProps> = ({
  coordinate,
  markers,
  onPress,
}) => {
  const getClusterColor = () => {
    // Color based on cluster size
    const count = markers.length;
    if (count < 5) return '#4A90E2';
    if (count < 10) return '#FF6B6B';
    if (count < 20) return '#FF8C00';
    return '#8B0000';
  };

  const getClusterSize = () => {
    // Size based on cluster count
    const count = markers.length;
    if (count < 5) return 40;
    if (count < 10) return 50;
    if (count < 20) return 60;
    return 70;
  };

  const getClusterTextSize = () => {
    const count = markers.length;
    if (count < 10) return 14;
    if (count < 100) return 12;
    return 10;
  };

  const renderClusterContent = () => {
    const count = markers.length;
    const color = getClusterColor();
    const size = getClusterSize();
    const textSize = getClusterTextSize();

    return (
      <View 
        style={[
          styles.clusterContainer, 
          { 
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
          }
        ]}
      >
        <Text style={[styles.clusterText, { fontSize: textSize }]}>
          {count}
        </Text>
      </View>
    );
  };

  const getClusterStats = () => {
    const stats = {
      places: 0,
      checkins: 0,
      transit: 0,
      users: 0,
    };

    markers.forEach(marker => {
      switch (marker.type) {
        case 'place':
          stats.places++;
          break;
        case 'checkin':
          stats.checkins++;
          break;
        case 'transit':
          stats.transit++;
          break;
        case 'user':
          stats.users++;
          break;
      }
    });

    return stats;
  };

  const renderClusterCallout = () => {
    const stats = getClusterStats();
    const total = markers.length;

    return (
      <View style={styles.calloutContainer}>
        <Text style={styles.calloutTitle}>
          {total} Location{total > 1 ? 's' : ''}
        </Text>
        <View style={styles.statsContainer}>
          {stats.places > 0 && (
            <Text style={styles.statText}>
              📍 {stats.places} Place{stats.places > 1 ? 's' : ''}
            </Text>
          )}
          {stats.checkins > 0 && (
            <Text style={styles.statText}>
              ✅ {stats.checkins} Check-in{stats.checkins > 1 ? 's' : ''}
            </Text>
          )}
          {stats.transit > 0 && (
            <Text style={styles.statText}>
              🚇 {stats.transit} Transit Station{stats.transit > 1 ? 's' : ''}
            </Text>
          )}
          {stats.users > 0 && (
            <Text style={styles.statText}>
              👤 {stats.users} User{stats.users > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <Text style={styles.tapHint}>Tap to expand</Text>
      </View>
    );
  };

  return (
    <Marker
      coordinate={coordinate}
      onPress={() => onPress?.(markers)}
      tracksViewChanges={false}
    >
      {renderClusterContent()}
      {renderClusterCallout()}
    </Marker>
  );
};

const styles = StyleSheet.create({
  clusterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
  clusterText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  calloutContainer: {
    minWidth: 150,
    maxWidth: 200,
    padding: 12,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  statsContainer: {
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  tapHint: {
    fontSize: 11,
    color: '#4A90E2',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

// Utility functions for clustering
export const clusterMarkers = (
  markers: MapMarkerData[],
  zoomLevel: number,
  mapDimensions: { width: number; height: number }
): Array<{ coordinate: { latitude: number; longitude: number }; markers: MapMarkerData[] }> => {
  if (markers.length === 0) return [];

  // Adjust cluster distance based on zoom level
  const clusterDistance = getClusterDistance(zoomLevel);
  const clusters: Array<{ coordinate: { latitude: number; longitude: number }; markers: MapMarkerData[] }> = [];

  markers.forEach(marker => {
    let addedToCluster = false;

    // Try to add to existing cluster
    for (const cluster of clusters) {
      const distance = calculateDistance(
        marker.coordinate.latitude,
        marker.coordinate.longitude,
        cluster.coordinate.latitude,
        cluster.coordinate.longitude
      );

      if (distance < clusterDistance) {
        cluster.markers.push(marker);
        // Update cluster center (weighted average)
        const totalMarkers = cluster.markers.length;
        cluster.coordinate.latitude = 
          (cluster.coordinate.latitude * (totalMarkers - 1) + marker.coordinate.latitude) / totalMarkers;
        cluster.coordinate.longitude = 
          (cluster.coordinate.longitude * (totalMarkers - 1) + marker.coordinate.longitude) / totalMarkers;
        addedToCluster = true;
        break;
      }
    }

    // Create new cluster if not added to existing one
    if (!addedToCluster) {
      clusters.push({
        coordinate: {
          latitude: marker.coordinate.latitude,
          longitude: marker.coordinate.longitude,
        },
        markers: [marker],
      });
    }
  });

  return clusters;
};

const getClusterDistance = (zoomLevel: number): number => {
  // Distance in degrees (approximate)
  // Higher zoom = smaller distance = more clusters
  if (zoomLevel > 15) return 0.001; // Very close zoom
  if (zoomLevel > 12) return 0.005; // Close zoom
  if (zoomLevel > 10) return 0.01;  // Medium zoom
  if (zoomLevel > 8) return 0.02;   // Far zoom
  return 0.05; // Very far zoom
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}; 