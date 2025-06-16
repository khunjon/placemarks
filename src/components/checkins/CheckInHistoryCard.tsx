import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Clock, Star, MessageCircle, Camera } from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';
import { LocationBadge } from '../ui';

export interface CheckInHistoryCardProps {
  id: string;
  placeName: string;
  placeType: 'restaurant' | 'cafe' | 'shopping' | 'temple' | 'park' | 'hotel' | 'attraction';
  checkInTime: string;
  rating?: number;
  note?: string;
  photoCount?: number;
  btsStation?: string;
  onPress?: () => void;
}

const getTypeColor = (type: CheckInHistoryCardProps['placeType']) => {
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

const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        size={14}
        color={i <= rating ? DarkTheme.colors.accent.yellow : DarkTheme.colors.semantic.quaternaryLabel}
        fill={i <= rating ? DarkTheme.colors.accent.yellow : 'transparent'}
        strokeWidth={1.5}
      />
    );
  }
  return stars;
};

export default function CheckInHistoryCard({
  id,
  placeName,
  placeType,
  checkInTime,
  rating,
  note,
  photoCount,
  btsStation,
  onPress,
}: CheckInHistoryCardProps) {
  const typeColor = getTypeColor(placeType);

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
            {placeName}
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
              {placeType}
            </Text>
            
            {btsStation && (
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
                <LocationBadge 
                  type="bts" 
                  value={btsStation} 
                  size="small" 
                />
              </>
            )}
          </View>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 4 
          }}>
            <Clock 
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
              {checkInTime}
            </Text>
          </View>
          
          {photoCount && photoCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Camera 
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
                {photoCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Rating */}
      {rating && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: DarkTheme.spacing.sm,
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
            marginRight: DarkTheme.spacing.sm,
          }}>
            {renderStars(rating)}
          </View>
          <Text 
            style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                fontWeight: '600' 
              }
            ]}
          >
            {rating}/5
          </Text>
        </View>
      )}

      {/* Note */}
      {note && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
          borderRadius: DarkTheme.borderRadius.sm,
          padding: DarkTheme.spacing.sm,
        }}>
          <MessageCircle 
            size={14} 
            color={DarkTheme.colors.semantic.tertiaryLabel}
            style={{ marginTop: 2, marginRight: DarkTheme.spacing.xs }}
          />
          <Text 
            style={[
              DarkTheme.typography.subhead,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                flex: 1,
                lineHeight: 20,
              }
            ]}
            numberOfLines={3}
          >
            {note}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
} 