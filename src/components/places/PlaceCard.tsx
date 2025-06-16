import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Star, Coffee, ShoppingBag, Building, TreePine, Camera, Utensils } from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';
import { LocationBadge } from '../ui';

export interface PlaceCardProps {
  id: string;
  name: string;
  type: 'restaurant' | 'cafe' | 'shopping' | 'temple' | 'park' | 'hotel' | 'attraction';
  description: string;
  address: string;
  distance: string;
  rating?: number;
  priceLevel?: 1 | 2 | 3 | 4;
  isOpen?: boolean;
  btsStation?: string;
  onCheckIn: (placeId: string, placeName: string) => void;
  onPress?: () => void;
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

export default function PlaceCard({
  id,
  name,
  type,
  description,
  address,
  distance,
  rating,
  priceLevel,
  isOpen,
  btsStation,
  onCheckIn,
  onPress,
}: PlaceCardProps) {
  const TypeIcon = getTypeIcon(type);
  const typeColor = getTypeColor(type);

  const handleCheckIn = () => {
    onCheckIn(id, name);
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
        borderColor: DarkTheme.colors.semantic.separator,
        borderWidth: 1,
        borderRadius: DarkTheme.borderRadius.md,
        padding: DarkTheme.spacing.md,
        marginBottom: DarkTheme.spacing.sm,
        ...DarkTheme.shadows.small,
      }}
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
              {name}
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
                {type}
              </Text>
              
              {isOpen !== undefined && (
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
                        backgroundColor: isOpen 
                          ? DarkTheme.colors.status.success 
                          : DarkTheme.colors.status.error,
                      }}
                    />
                    <Text 
                      style={[
                        DarkTheme.typography.caption1,
                        { 
                          color: isOpen 
                            ? DarkTheme.colors.status.success 
                            : DarkTheme.colors.status.error 
                        }
                      ]}
                    >
                      {isOpen ? 'Open' : 'Closed'}
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
              {distance}
            </Text>
          </View>
          
          {rating && (
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
                {rating.toFixed(1)}
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
        {description}
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
          {address}
        </Text>
      </View>

      {/* Badges and Check-in Button */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {btsStation && (
            <LocationBadge 
              type="bts" 
              value={btsStation} 
              size="small" 
              style={{ marginRight: DarkTheme.spacing.sm }}
            />
          )}
          
          {priceLevel && (
            <LocationBadge 
              type="price" 
              value={priceLevel} 
              size="small" 
            />
          )}
        </View>
        
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
      </View>
    </TouchableOpacity>
  );
} 