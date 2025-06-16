import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { 
  Heart, 
  Coffee, 
  MapPin, 
  Briefcase, 
  TrendingUp, 
  Star, 
  Clock, 
  ChevronRight,
  MoreVertical,
  Edit3,
  Trash2,
  Sparkles,
  Lock
} from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';

export interface ListItemProps {
  id: string;
  name: string;
  type: 'user' | 'auto';
  listType: 'favorites' | 'coffee' | 'date' | 'work' | 'want_to_try' | 'visited' | 'rated' | 'recent';
  placeCount: number;
  isEditable: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getListIcon = (listType: ListItemProps['listType']) => {
  switch (listType) {
    case 'favorites':
      return Heart;
    case 'coffee':
      return Coffee;
    case 'date':
      return Sparkles;
    case 'work':
      return Briefcase;
    case 'want_to_try':
      return Star;
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

const getListColor = (listType: ListItemProps['listType'], type: ListItemProps['type']) => {
  if (type === 'auto') {
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
    case 'want_to_try':
      return DarkTheme.colors.bangkok.gold;
    default:
      return DarkTheme.colors.bangkok.gold;
  }
};

export default function ListItem({
  id,
  name,
  type,
  listType,
  placeCount,
  isEditable,
  onPress,
  onEdit,
  onDelete,
}: ListItemProps) {
  const [showOptions, setShowOptions] = useState(false);
  const ListIcon = getListIcon(listType);
  const listColor = getListColor(listType, type);
  const isAutoList = type === 'auto';

  const handleOptionsPress = () => {
    if (!isEditable) return;
    setShowOptions(!showOptions);
  };

  const handleEdit = () => {
    setShowOptions(false);
    if (onEdit) {
      onEdit();
    }
  };

  const handleDelete = () => {
    setShowOptions(false);
    if (onDelete) {
      Alert.alert(
        'Delete List',
        `Are you sure you want to delete "${name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: onDelete
          },
        ]
      );
    }
  };

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
          borderColor: isAutoList 
            ? `${listColor}40` 
            : DarkTheme.colors.semantic.separator,
          borderWidth: 1,
          borderRadius: DarkTheme.borderRadius.md,
          padding: DarkTheme.spacing.md,
          marginBottom: DarkTheme.spacing.sm,
          ...DarkTheme.shadows.small,
          ...(isAutoList && {
            backgroundColor: `${listColor}08`,
          }),
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
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
                
                {isAutoList && (
                  <View style={{
                    backgroundColor: `${listColor}20`,
                    paddingHorizontal: DarkTheme.spacing.xs,
                    paddingVertical: 2,
                    borderRadius: DarkTheme.borderRadius.xs,
                    marginRight: DarkTheme.spacing.xs,
                  }}>
                    <Text style={[
                      DarkTheme.typography.caption2,
                      { 
                        color: listColor,
                        fontWeight: '600',
                        fontSize: 10,
                      }
                    ]}>
                      AUTO
                    </Text>
                  </View>
                )}

                {!isEditable && (
                  <Lock 
                    size={14} 
                    color={DarkTheme.colors.semantic.tertiaryLabel}
                    strokeWidth={2}
                  />
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
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isEditable && (
              <TouchableOpacity
                onPress={handleOptionsPress}
                style={{
                  padding: DarkTheme.spacing.xs,
                  marginRight: DarkTheme.spacing.xs,
                }}
                activeOpacity={0.7}
              >
                <MoreVertical 
                  size={20} 
                  color={DarkTheme.colors.semantic.tertiaryLabel}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            )}
            
            <ChevronRight 
              size={20} 
              color={DarkTheme.colors.semantic.tertiaryLabel}
              strokeWidth={2}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Options Menu */}
      {showOptions && isEditable && (
        <View style={{
          position: 'absolute',
          top: 60,
          right: DarkTheme.spacing.md,
          backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
          borderColor: DarkTheme.colors.semantic.separator,
          borderWidth: 1,
          borderRadius: DarkTheme.borderRadius.md,
          ...DarkTheme.shadows.medium,
          zIndex: 1000,
          minWidth: 120,
        }}>
          {onEdit && (
            <TouchableOpacity
              onPress={handleEdit}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: DarkTheme.spacing.md,
                paddingHorizontal: DarkTheme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: DarkTheme.colors.semantic.separator,
                minHeight: 48, // Ensure minimum tap target size
              }}
              activeOpacity={0.7}
            >
              <Edit3 
                size={18} 
                color={DarkTheme.colors.semantic.label}
                strokeWidth={2}
              />
              <Text style={[
                DarkTheme.typography.subhead,
                { 
                  color: DarkTheme.colors.semantic.label,
                  marginLeft: DarkTheme.spacing.md,
                  fontSize: 16,
                }
              ]}>
                Edit
              </Text>
            </TouchableOpacity>
          )}
          
          {onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: DarkTheme.spacing.md,
                paddingHorizontal: DarkTheme.spacing.md,
                minHeight: 48, // Ensure minimum tap target size
              }}
              activeOpacity={0.7}
            >
              <Trash2 
                size={18} 
                color={DarkTheme.colors.status.error}
                strokeWidth={2}
              />
              <Text style={[
                DarkTheme.typography.subhead,
                { 
                  color: DarkTheme.colors.status.error,
                  marginLeft: DarkTheme.spacing.md,
                  fontSize: 16,
                }
              ]}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Overlay to close options menu */}
      {showOptions && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: -1000,
            right: -1000,
            bottom: -1000,
            zIndex: 999,
          }}
          onPress={() => setShowOptions(false)}
          activeOpacity={1}
        />
      )}
    </View>
  );
} 