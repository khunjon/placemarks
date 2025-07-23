import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { DarkTheme } from '../../constants/theme';
import { LocationBadge } from '../ui';
import { EnrichedPlace } from '../../types';
import { PlaceType, inferPlaceTypeFromGoogleTypes } from '../../utils/placeTypeMapping';
import { isPlaceCurrentlyOpen } from '../../utils/operatingHours';
import { Utensils, Coffee, ShoppingCart, Building, Trees, Home, Star, MapPin, Camera } from '../icons';

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
  
  // User photo URL (for displaying in place of icon)
  photoUrl?: string;
  
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
      return ShoppingCart;
    case 'temple':
      return Building;
    case 'park':
      return Trees;
    case 'hotel':
      return Home;
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

// Helper function to shorten addresses to show only city name
const shortenAddress = (address: string): string => {
  if (!address) return '';
  
  // Split by commas and filter out empty parts
  const parts = address.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length <= 2) return address; // Already short enough
  
  // For addresses like "123 Street, District, Bangkok 10110, Thailand"
  // We want to extract just the city name (typically second to last part)
  if (parts.length >= 3) {
    let cityPart = parts[parts.length - 2];
    
    // Remove zip codes that are attached to city names (e.g., "Bangkok 10110" -> "Bangkok")
    // Handle various zip code formats: 5 digits, 5+4, postal codes with spaces
    cityPart = cityPart.replace(/\s+\d{4,6}(-\d{4})?$/, ''); // Remove trailing digits
    cityPart = cityPart.replace(/\s+[A-Z0-9]{3,8}$/, ''); // Remove postal codes
    
    return cityPart.trim();
  }
  
  // If we have 2 parts, return the first (likely the city) with zip code removed
  if (parts.length === 2) {
    let cityPart = parts[0];
    cityPart = cityPart.replace(/\s+\d{4,6}(-\d{4})?$/, '');
    cityPart = cityPart.replace(/\s+[A-Z0-9]{3,8}$/, '');
    return cityPart.trim();
  }
  
  // Fallback to existing logic if structure is unexpected
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

const PlaceCard = memo(function PlaceCard({
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
  photoUrl,
  style,
}: PlaceCardProps) {
  // Memoize the open/closed calculation to avoid recalculating on every render
  const calculatedIsOpen = useMemo(() => {
    if (!place?.opening_hours || !place?.geometry?.location) {
      return null;
    }
    
    return isPlaceCurrentlyOpen(
      place.opening_hours,
      {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      place.timezone // Use cached timezone if available
    );
  }, [place?.opening_hours, place?.geometry?.location, place?.timezone]);

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
    isOpen: calculatedIsOpen,
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
    onCheckIn(placeData.googlePlaceId, placeData.name || 'Unknown Place');
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
      {/* Image and Details Row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: placeData.description && placeData.description.trim() ? 4 : 2,
      }}>
        {photoUrl ? (
          <Image
            source={{ 
              uri: photoUrl,
              cache: 'force-cache' // iOS only, but harmless on Android
            }}
            style={{
              width: 70,
              height: 70,
              borderRadius: 8,
              marginRight: DarkTheme.spacing.sm,
              backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
            }}
            resizeMode="cover"
          />
        ) : (
          <View 
            style={{
              width: 70,
              height: 70,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: DarkTheme.spacing.sm,
              backgroundColor: `${typeColor}20`,
            }}
          >
            <TypeIcon 
              size={32} 
              color={typeColor}
            />
          </View>
        )}
        
        <View style={{ flex: 1 }}>
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
            {shortenPlaceName(placeData.name || 'Unknown Place')}
          </Text>
          
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
            
            {placeData.isOpen !== undefined && placeData.isOpen !== null && (
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
            {shortenAddress(placeData.address || 'Address not available')}
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
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if these props change
  return (
    prevProps.googlePlaceId === nextProps.googlePlaceId &&
    prevProps.name === nextProps.name &&
    prevProps.address === nextProps.address &&
    prevProps.notes === nextProps.notes &&
    prevProps.photoUrl === nextProps.photoUrl &&
    prevProps.showCheckInButton === nextProps.showCheckInButton &&
    prevProps.place?.opening_hours === nextProps.place?.opening_hours &&
    prevProps.place?.business_status === nextProps.place?.business_status
  );
});

export default PlaceCard;