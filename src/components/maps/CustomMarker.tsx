import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { MapMarkerData } from '../../services/maps';
import { TransitStation } from '../../data/btsStations';
import { Place } from '../../types';

interface CustomMarkerProps {
  marker: MapMarkerData;
  onPress?: (marker: MapMarkerData) => void;
  onCalloutPress?: (marker: MapMarkerData) => void;
}

export const CustomMarker: React.FC<CustomMarkerProps> = ({
  marker,
  onPress,
  onCalloutPress,
}) => {
  const getMarkerIcon = () => {
    switch (marker.type) {
      case 'place':
        return 'location';
      case 'checkin':
        return 'checkmark-circle';
      case 'transit':
        const station = marker.data as TransitStation;
        return station.type === 'BTS' ? 'train' : 'subway';
      case 'user':
        return 'person-circle';
      default:
        return 'location';
    }
  };

  const getMarkerColor = () => {
    switch (marker.type) {
      case 'place':
        return '#FF6B6B';
      case 'checkin':
        return '#4ECDC4';
      case 'transit':
        const station = marker.data as TransitStation;
        return station.lineColor || '#666';
      case 'user':
        return '#4A90E2';
      default:
        return '#666';
    }
  };

  const getMarkerSize = () => {
    switch (marker.type) {
      case 'transit':
        return 20;
      case 'user':
        return 25;
      default:
        return 22;
    }
  };

  const renderCustomMarker = () => {
    const iconName = getMarkerIcon();
    const color = getMarkerColor();
    const size = getMarkerSize();

    if (marker.type === 'transit') {
      const station = marker.data as TransitStation;
      return (
        <View style={[styles.transitMarker, { backgroundColor: color }]}>
          <Text style={styles.transitText}>
            {station.type}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.markerContainer, { backgroundColor: color }]}>
        <Ionicons 
          name={iconName as any} 
          size={size} 
          color="white" 
        />
      </View>
    );
  };

  const renderCallout = () => {
    if (marker.type === 'transit') {
      const station = marker.data as TransitStation;
      return (
        <Callout onPress={() => onCalloutPress?.(marker)}>
          <View style={styles.calloutContainer}>
            <Text style={styles.calloutTitle}>{station.nameEn}</Text>
            <Text style={styles.calloutSubtitle}>
              {station.type} {station.line} Line
            </Text>
            {station.nameTh && (
              <Text style={styles.calloutThai}>{station.nameTh}</Text>
            )}
            {station.interchanges && station.interchanges.length > 0 && (
              <Text style={styles.calloutInterchange}>
                Interchange: {station.interchanges.join(', ')}
              </Text>
            )}
          </View>
        </Callout>
      );
    }

    if (marker.type === 'place') {
      const place = marker.data as Place;
      return (
        <Callout onPress={() => onCalloutPress?.(marker)}>
          <View style={styles.calloutContainer}>
            <Text style={styles.calloutTitle}>{place.name}</Text>
            {place.address && (
              <Text style={styles.calloutSubtitle}>{place.address}</Text>
            )}
            {place.category && (
              <Text style={styles.calloutCategory}>{place.category}</Text>
            )}
          </View>
        </Callout>
      );
    }

    return (
      <Callout onPress={() => onCalloutPress?.(marker)}>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{marker.title}</Text>
          {marker.description && (
            <Text style={styles.calloutSubtitle}>{marker.description}</Text>
          )}
        </View>
      </Callout>
    );
  };

  return (
    <Marker
      coordinate={marker.coordinate}
      onPress={() => onPress?.(marker)}
      tracksViewChanges={false} // Performance optimization
    >
      {renderCustomMarker()}
      {renderCallout()}
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transitMarker: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transitText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  calloutContainer: {
    minWidth: 150,
    maxWidth: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  calloutSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  calloutThai: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  calloutCategory: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  calloutInterchange: {
    fontSize: 11,
    color: '#FF6B6B',
    fontStyle: 'italic',
    marginTop: 2,
  },
}); 