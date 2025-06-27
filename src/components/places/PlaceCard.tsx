import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Star, Coffee, ShoppingBag, Building, TreePine, Camera, Utensils } from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';
import { LocationBadge } from '../ui';
import { EnrichedPlace } from '../../types';

// Enhanced props interface that can accept either individual props or an EnrichedPlace object
export interface PlaceCardProps {
  // Google Place ID (primary identifier)
  googlePlaceId: string;
  
  // Core place data (can be provided individually or via place object)
  name: string;
  type?: 'restaurant' | 'cafe' | 'shopping' | 'temple' | 'park' | 'hotel' | 'attraction';
  description?: string;
  address: string;
  distance?: string;
  rating?: number;
  priceLevel?: 1 | 2 | 3 | 4;
  isOpen?: boolean;
  btsStation?: string;
  
  // Alternative: accept full place object
  place?: EnrichedPlace;
  
  // Event handlers
  onCheckIn: (googlePlaceId: string, placeName: string) => void;
  onPress?: () => void;
  
  // UI options
  showCheckInButton?: boolean;
  
  // Optional styling
  style?: any;
}

const getTypeIcon = (type: PlaceCardProps['type']) => {
  switch (type) {
    case 'restaurant':
      return Utensils;
    case 'cafe':
      return Coffee;
    case 'shopping':
      return ShoppingBag;
    case 'temple':
      return Building;
    case 'park':
      return TreePine;
    case 'hotel':
      return Building;
    case 'attraction':
      return Star;
    default:
      return MapPin;
  }
};

const getTypeColor = (type: PlaceCardProps['type']) => {
  switch (type) {
    case 'restaurant':
      return DarkTheme.colors.bangkok.market;
    case 'cafe':
      return DarkTheme.colors.bangkok.saffron;
    case 'shopping':
      return DarkTheme.colors.accent.purple;
    case 'temple':
      return DarkTheme.colors.bangkok.temple;
    case 'park':
      return DarkTheme.colors.accent.green;
    case 'hotel':
      return DarkTheme.colors.accent.blue;
    case 'attraction':
      return DarkTheme.colors.bangkok.gold;
    default:
      return DarkTheme.colors.semantic.secondaryLabel;
  }
};

// Helper function to infer place type from Google Places API types
const inferPlaceTypeFromGoogleTypes = (types: string[]): PlaceCardProps['type'] => {
  if (!types || !Array.isArray(types) || types.length === 0) {
    return 'restaurant'; // Default fallback
  }
  
  const typeMap: { [key: string]: PlaceCardProps['type'] } = {
    restaurant: 'restaurant',
    food: 'restaurant',
    meal_takeaway: 'restaurant',
    meal_delivery: 'restaurant',
    cafe: 'cafe',
    shopping_mall: 'shopping',
    store: 'shopping',
    clothing_store: 'shopping',
    hindu_temple: 'temple',
    buddhist_temple: 'temple',
    place_of_worship: 'temple',
    park: 'park',
    lodging: 'hotel',
    tourist_attraction: 'attraction',
    point_of_interest: 'attraction'
  };

  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }
  
  return 'attraction'; // Default fallback
};

export default function PlaceCard({
  googlePlaceId,
  name,
  type,
  description,
  address,
  distance,
  rating,
  priceLevel,
  isOpen,
  btsStation,
  place,
  onCheckIn,
  onPress,
  showCheckInButton = true,
  style,
}: PlaceCardProps) {
  // Use place object data if provided, otherwise use individual props
  const placeData = place ? {
    googlePlaceId: place.google_place_id,
    name: place.name,
    type: place.types ? inferPlaceTypeFromGoogleTypes(place.types) : 'restaurant',
    description: place.display_description || '',
    address: place.formatted_address,
    distance: distance || '',
    rating: place.rating,
    priceLevel: place.price_level,
    isOpen: place.opening_hours?.open_now,
    btsStation: btsStation // BTS station would come from Bangkok context
  } : {
    googlePlaceId,
    name,
    type: type || 'attraction',
    description: description || '',
    address,
    distance: distance || '',
    rating,
    priceLevel,
    isOpen,
    btsStation
  };

  const TypeIcon = getTypeIcon(placeData.type);
  const typeColor = getTypeColor(placeData.type);

  const handleCheckIn = () => {
    onCheckIn(placeData.googlePlaceId, placeData.name);
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        {
          backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
          borderColor: DarkTheme.colors.semantic.separator,
          borderWidth: 1,
          borderRadius: DarkTheme.borderRadius.md,
          padding: DarkTheme.spacing.md,
          marginBottom: DarkTheme.spacing.sm,
          ...DarkTheme.shadows.small,
        },
        style
      ]}
    >
      {/* Header Row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: DarkTheme.spacing.sm,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        }}>
          <View 
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: DarkTheme.spacing.sm,
              backgroundColor: `${typeColor}20`,
            }}
          >
            <TypeIcon 
              size={20} 
              color={typeColor}
              strokeWidth={2}
            />
          </View>
          
          <View style={{ flex: 1 }}>
            <Text 
              style={[
                DarkTheme.typography.headline,
                { 
                  color: DarkTheme.colors.semantic.label,
                  marginBottom: DarkTheme.spacing.xs 
                }
              ]}
              numberOfLines={1}
            >
              {placeData.name}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text 
                style={[
                  DarkTheme.typography.caption1,
                  { 
                    color: typeColor,
                    textTransform: 'capitalize',
                    fontWeight: '600' 
                  }
                ]}
              >
                {placeData.type}
              </Text>
              
              {placeData.isOpen !== undefined && (
                <>
                  <View 
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      marginHorizontal: DarkTheme.spacing.xs,
                      backgroundColor: DarkTheme.colors.semantic.separator,
                    }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View 
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        marginRight: 4,
                        backgroundColor: placeData.isOpen 
                          ? DarkTheme.colors.status.success 
                          : DarkTheme.colors.status.error,
                      }}
                    />
                    <Text 
                      style={[
                        DarkTheme.typography.caption1,
                        { 
                          color: placeData.isOpen 
                            ? DarkTheme.colors.status.success 
                            : DarkTheme.colors.status.error 
                        }
                      ]}
                    >
                      {placeData.isOpen ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 4 
          }}>
            <MapPin 
              size={12} 
              color={DarkTheme.colors.semantic.tertiaryLabel}
            />
            <Text 
              style={[
                DarkTheme.typography.caption2,
                { 
                  color: DarkTheme.colors.semantic.tertiaryLabel,
                  marginLeft: DarkTheme.spacing.xs 
                }
              ]}
            >
              {placeData.distance}
            </Text>
          </View>
          
          {placeData.rating && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Star 
                size={12} 
                color={DarkTheme.colors.accent.yellow}
                fill={DarkTheme.colors.accent.yellow}
              />
              <Text 
                style={[
                  DarkTheme.typography.caption2,
                  { 
                    color: DarkTheme.colors.semantic.tertiaryLabel,
                    marginLeft: DarkTheme.spacing.xs 
                  }
                ]}
              >
                {placeData.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      <Text 
        style={[
          DarkTheme.typography.subhead,
          { 
            color: DarkTheme.colors.semantic.secondaryLabel,
            marginBottom: DarkTheme.spacing.sm 
          }
        ]}
        numberOfLines={2}
      >
        {placeData.description}
      </Text>

      {/* Address */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: DarkTheme.spacing.sm 
      }}>
        <MapPin 
          size={14} 
          color={DarkTheme.colors.semantic.tertiaryLabel}
        />
        <Text 
          style={[
            DarkTheme.typography.caption1,
            { 
              color: DarkTheme.colors.semantic.tertiaryLabel,
              marginLeft: DarkTheme.spacing.xs,
              flex: 1 
            }
          ]}
          numberOfLines={1}
        >
          {placeData.address}
        </Text>
      </View>

      {/* Badges and Check-in Button */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: showCheckInButton ? 'space-between' : 'flex-start'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {placeData.btsStation && (
            <LocationBadge 
              type="bts" 
              value={placeData.btsStation} 
              size="small" 
              style={{ marginRight: DarkTheme.spacing.sm }}
            />
          )}
          
          {placeData.priceLevel && (
            <LocationBadge 
              type="price" 
              value={placeData.priceLevel} 
              size="small" 
            />
          )}
        </View>
        
        {showCheckInButton && (
          <TouchableOpacity
            onPress={handleCheckIn}
            style={{
              backgroundColor: DarkTheme.colors.bangkok.gold,
              paddingHorizontal: DarkTheme.spacing.md,
              paddingVertical: DarkTheme.spacing.sm,
              borderRadius: DarkTheme.borderRadius.sm,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            activeOpacity={0.8}
          >
            <Camera 
              size={16} 
              color={DarkTheme.colors.system.black}
              strokeWidth={2}
            />
            <Text 
              style={[
                DarkTheme.typography.callout,
                { 
                  color: DarkTheme.colors.system.black,
                  fontWeight: '600',
                  marginLeft: DarkTheme.spacing.xs 
                }
              ]}
            >
              Check In
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}