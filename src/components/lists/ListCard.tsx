import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { 
  Heart, 
  Coffee, 
  MapPin, 
  Briefcase, 
  TrendingUp, 
  Star, 
  Clock, 
  ChevronRight,
  Sparkles
} from '../icons';
import { DarkTheme } from '../../constants/theme';

export interface ListCardProps {
  id: string;
  name: string;
  type: 'user' | 'smart';
  listType: 'favorites' | 'coffee' | 'date' | 'work' | 'visited' | 'rated' | 'recent';
  placeCount: number;
  previewPlaces: string[];
  onPress: () => void;
}

const getListIcon = (listType: ListCardProps['listType']) => {
  switch (listType) {
    case 'favorites':
      return Heart;
    case 'coffee':
      return Coffee;
    case 'date':
      return Sparkles;
    case 'work':
      return Briefcase;
    case 'visited':
      return TrendingUp;
    case 'rated':
      return Star;
    case 'recent':
      return Clock;
    default:
      return MapPin;
  }
};

const getListColor = (listType: ListCardProps['listType'], type: ListCardProps['type']) => {
  if (type === 'smart') {
    switch (listType) {
      case 'visited':
        return DarkTheme.colors.accent.blue;
      case 'rated':
        return DarkTheme.colors.accent.yellow;
      case 'recent':
        return DarkTheme.colors.accent.green;
      default:
        return DarkTheme.colors.semantic.secondaryLabel;
    }
  }
  
  // User lists
  switch (listType) {
    case 'favorites':
      return DarkTheme.colors.status.error;
    case 'coffee':
      return DarkTheme.colors.bangkok.saffron;
    case 'date':
      return DarkTheme.colors.accent.purple;
    case 'work':
      return DarkTheme.colors.accent.blue;
    default:
      return DarkTheme.colors.bangkok.gold;
  }
};

export default function ListCard({
  id,
  name,
  type,
  listType,
  placeCount,
  previewPlaces,
  onPress,
}: ListCardProps) {
  const ListIcon = getListIcon(listType);
  const listColor = getListColor(listType, type);
  const isSmartList = type === 'smart';

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
        borderColor: isSmartList 
          ? `${listColor}40` 
          : DarkTheme.colors.semantic.separator,
        borderWidth: 1,
        borderRadius: DarkTheme.borderRadius.md,
        padding: DarkTheme.spacing.md,
        marginBottom: DarkTheme.spacing.sm,
        ...DarkTheme.shadows.small,
        ...(isSmartList && {
          backgroundColor: `${listColor}08`,
        }),
      }}
    >
      {/* Header Row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
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
              backgroundColor: `${listColor}20`,
            }}
          >
            <ListIcon 
              size={20} 
              color={listColor}
              strokeWidth={2}
            />
          </View>
          
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text 
                style={[
                  DarkTheme.typography.headline,
                  { 
                    color: DarkTheme.colors.semantic.label,
                    marginRight: DarkTheme.spacing.xs,
                  }
                ]}
                numberOfLines={1}
              >
                {name}
              </Text>
              
              {isSmartList && (
                <View style={{
                  backgroundColor: `${listColor}20`,
                  paddingHorizontal: DarkTheme.spacing.xs,
                  paddingVertical: 2,
                  borderRadius: DarkTheme.borderRadius.xs,
                }}>
                  <Text style={[
                    DarkTheme.typography.caption2,
                    { 
                      color: listColor,
                      fontWeight: '600',
                      fontSize: 10,
                    }
                  ]}>
                    SMART
                  </Text>
                </View>
              )}
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
              {placeCount} {placeCount === 1 ? 'place' : 'places'}
            </Text>
          </View>
        </View>
        
        <ChevronRight 
          size={20} 
          color={DarkTheme.colors.semantic.tertiaryLabel}
          strokeWidth={2}
        />
      </View>

      {/* Preview Places */}
      {previewPlaces.length > 0 && (
        <View style={{
          backgroundColor: isSmartList 
            ? `${listColor}10` 
            : DarkTheme.colors.semantic.tertiarySystemBackground,
          borderRadius: DarkTheme.borderRadius.sm,
          padding: DarkTheme.spacing.sm,
        }}>
          <Text 
            style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.tertiaryLabel,
                marginBottom: DarkTheme.spacing.xs,
                fontWeight: '600',
                textTransform: 'uppercase',
                fontSize: 10,
              }
            ]}
          >
            Preview
          </Text>
          
          <View style={{ flexDirection: 'column' }}>
            {previewPlaces.slice(0, 3).map((placeName, index) => (
              <View 
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: index < Math.min(previewPlaces.length, 3) - 1 ? DarkTheme.spacing.xs : 0,
                }}
              >
                <View 
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: listColor,
                    marginRight: DarkTheme.spacing.xs,
                  }}
                />
                <Text 
                  style={[
                    DarkTheme.typography.subhead,
                    { 
                      color: DarkTheme.colors.semantic.secondaryLabel,
                      flex: 1,
                    }
                  ]}
                  numberOfLines={1}
                >
                  {placeName}
                </Text>
              </View>
            ))}
            
            {placeCount > 3 && (
              <Text 
                style={[
                  DarkTheme.typography.caption1,
                  { 
                    color: DarkTheme.colors.semantic.tertiaryLabel,
                    marginTop: DarkTheme.spacing.xs,
                    fontStyle: 'italic',
                  }
                ]}
              >
                +{placeCount - 3} more places
              </Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
} 