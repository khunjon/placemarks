import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Place } from '../../types/places';
import { RootStackParamList } from '../../types';

interface PlaceCardProps {
  place: Place;
  onPress: (place: Place) => void;
  showDistance?: boolean;
  distance?: number;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function PlaceCard({ 
  place, 
  onPress, 
  showDistance = false, 
  distance 
}: PlaceCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const getBTSProximityColor = (proximity: string) => {
    switch (proximity) {
      case 'walking':
        return '#4CAF50'; // Green
      case 'near':
        return '#FF9800'; // Orange
      case 'far':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const getPriceTierSymbol = (tier: string) => {
    switch (tier) {
      case 'street':
        return '฿';
      case 'casual':
        return '฿฿';
      case 'mid':
        return '฿฿฿';
      case 'upscale':
        return '฿฿฿฿';
      case 'luxury':
        return '฿฿฿฿฿';
      default:
        return '฿฿';
    }
  };

  const getEnvironmentIcon = (environment: string) => {
    switch (environment) {
      case 'indoor':
        return '🏢';
      case 'outdoor':
        return '🌳';
      case 'mixed':
        return '🏪';
      default:
        return '📍';
    }
  };

  const formatPlaceTypes = (placeType: string) => {
    if (!placeType) return 'Place';
    return placeType
      .split(',')
      .slice(0, 2) // Show only first 2 types
      .map(type => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
      .join(', ');
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(place)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {place.address || 'Address not available'}
          </Text>
        </View>
        
        {showDistance && distance && (
          <View style={styles.distanceContainer}>
            <Text style={styles.distance}>
              {distance < 1 
                ? `${Math.round(distance * 1000)}m`
                : `${distance.toFixed(1)}km`
              }
            </Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.placeTypes}>
          {formatPlaceTypes(place.place_type)}
        </Text>
        
        <View style={styles.contextRow}>
          <View style={styles.contextItem}>
            <Text style={styles.contextIcon}>
              {getEnvironmentIcon(place.bangkok_context.environment)}
            </Text>
            <Text style={styles.contextText}>
              {place.bangkok_context.environment}
            </Text>
          </View>

          <View style={styles.contextItem}>
            <View 
              style={[
                styles.btsIndicator, 
                { backgroundColor: getBTSProximityColor(place.bangkok_context.bts_proximity) }
              ]} 
            />
            <Text style={styles.contextText}>
              BTS {place.bangkok_context.bts_proximity}
            </Text>
          </View>

          <View style={styles.contextItem}>
            <Text style={styles.priceSymbol}>
              {getPriceTierSymbol(place.bangkok_context.price_tier)}
            </Text>
          </View>
        </View>

        <View style={styles.amenitiesRow}>
          {place.bangkok_context.air_conditioning && (
            <View style={styles.amenityTag}>
              <Text style={styles.amenityText}>❄️ AC</Text>
            </View>
          )}
          
          <View style={styles.amenityTag}>
            <Text style={styles.amenityText}>
              🔊 {place.bangkok_context.noise_level}
            </Text>
          </View>

          <View style={styles.amenityTag}>
            <Text style={styles.amenityText}>
              📍 {place.bangkok_context.location_type}
            </Text>
          </View>
        </View>

        {/* Check-in Button */}
        <TouchableOpacity
          style={styles.checkInButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('CheckIn', {
              placeId: place.id,
              placeName: place.name,
            });
          }}
        >
          <Text style={styles.checkInButtonText}>📍 Check In</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  address: {
    fontSize: 14,
    color: '#666666',
  },
  distanceContainer: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distance: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
  },
  details: {
    marginTop: 8,
  },
  placeTypes: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 8,
    fontWeight: '500',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  contextIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  contextText: {
    fontSize: 12,
    color: '#666666',
    textTransform: 'capitalize',
  },
  btsIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  priceSymbol: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  amenityText: {
    fontSize: 11,
    color: '#666666',
  },
  checkInButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 