import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Star, Coffee, ShoppingBag, Building, TreePine, Camera, Utensils } from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';
import { LocationBadge } from '../ui';
import { EnrichedPlace } from '../../types';
import { PlaceType, inferPlaceTypeFromGoogleTypes } from '../../utils/placeTypeMapping';

// Enhanced props interface that can accept either individual props or an EnrichedPlace object
export interface PlaceCardProps {
  // Google Place ID (primary identifier)
  googlePlaceId: string;
  
  // Core place data (can be provided individually or via place object)
  name: string;
  type?: PlaceType;
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
  
  // Notes
  notes?: string;
  
  // Optional styling
  style?: any;
}

const getTypeIcon = (type: PlaceType) => {
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

const getTypeColor = (type: PlaceType) => {
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

// Helper function to shorten addresses
const shortenAddress = (address: string): string => {
  if (!address) return '';
  
  // Split by commas and filter out empty parts
  const parts = address.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length <= 2) return address; // Already short enough
  
  // Remove the first part (usually street number/name) and keep the rest
  // This typically gives us: District, City, Country
  return parts.slice(1).join(', ');
};

// Helper function to shorten place names
const shortenPlaceName = (name: string): string => {
  if (!name) return '';
  
  // Find the first dash and cut off everything after it
  const dashIndex = name.indexOf(' - ');
  if (dashIndex !== -1) {
    return name.substring(0, dashIndex).trim();
  }
  
  return name;
};

// Note: inferPlaceTypeFromGoogleTypes is now imported from utils/placeTypeMapping.ts

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
  notes,
  style,
}: PlaceCardProps) {
  // Use place object data if provided, otherwise use individual props
  const placeData = place ? {
    googlePlaceId: place.google_place_id,
    name: place.name,
    type: place.types ? inferPlaceTypeFromGoogleTypes(place.types) : 'restaurant',
    description: (place.has_editorial_content && place.display_description) ? place.display_description : '',
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
          padding: 6,
          marginBottom: DarkTheme.spacing.sm,
          ...DarkTheme.shadows.small,
        },
        style
      ]}
    >
      {/* Title Row */}
      <Text 
        style={[
          DarkTheme.typography.headline,
          { 
            color: DarkTheme.colors.semantic.label,
            marginBottom: 4
          }
        ]}
        numberOfLines={1}
      >
        {shortenPlaceName(placeData.name)}
      </Text>

      {/* Image and Details Row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: placeData.description && placeData.description.trim() ? 4 : 2,
      }}>
        <View 
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: DarkTheme.spacing.sm,
            backgroundColor: `${typeColor}20`,
          }}
        >
          <TypeIcon 
            size={24} 
            color={typeColor}
            strokeWidth={2}
          />
        </View>
        
        <View style={{ flex: 1 }}>
          {/* Category and Status Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text 
              style={[
                DarkTheme.typography.caption1,
                { 
                  color: typeColor,
                  textTransform: 'capitalize',
                  fontWeight: '600',
                  marginRight: DarkTheme.spacing.sm
                }
              ]}
            >
              {placeData.type}
            </Text>
            
            {placeData.isOpen !== undefined && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View 
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
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
                        : DarkTheme.colors.status.error,
                      fontSize: 11
                    }
                  ]}
                >
                  {placeData.isOpen ? 'Open' : 'Closed'}
                </Text>
              </View>
            )}
          </View>
          
          {/* Rating Row */}
          {placeData.rating && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Star 
                size={12} 
                color={DarkTheme.colors.accent.yellow}
                fill={DarkTheme.colors.accent.yellow}
              />
              <Text 
                style={[
                  DarkTheme.typography.caption1,
                  { 
                    color: DarkTheme.colors.semantic.label,
                    marginLeft: 4,
                    fontWeight: '600'
                  }
                ]}
              >
                {placeData.rating.toFixed(1)}
              </Text>
            </View>
          )}
          
          {/* Address Row */}
          <Text 
            style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.tertiaryLabel,
              }
            ]}
            numberOfLines={1}
          >
            {shortenAddress(placeData.address)}
          </Text>
        </View>
      </View>

      {/* Notes Section */}
      {notes && notes.trim() && (
        <View style={{
          backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
          marginTop: 8,
          padding: 8,
          borderRadius: 6,
        }}>
          <Text 
            style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                fontStyle: 'italic',
                fontSize: 12
              }
            ]}
          >
            "{notes}"
          </Text>
        </View>
      )}


      {/* Description - only render if has content */}
      {placeData.description && placeData.description.trim() && (
        <Text 
          style={[
            DarkTheme.typography.subhead,
            { 
              color: DarkTheme.colors.semantic.secondaryLabel,
              marginBottom: 4
            }
          ]}
          numberOfLines={2}
        >
          {placeData.description}
        </Text>
      )}


      {/* Badges and Check-in Button - only render if has content */}
      {(placeData.btsStation || showCheckInButton) && (
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
      )}
    </TouchableOpacity>
  );
}