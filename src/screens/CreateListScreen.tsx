import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Check, 
  Heart, 
  Coffee, 
  Trophy, 
  Briefcase, 
  Star, 
  MapPin,
  Utensils,
  ShoppingBag,
  Camera,
  Music,
  Trees,
  Plane
} from 'lucide-react-native';
import { DarkTheme } from '../constants/theme';

interface CreateListScreenProps {
  onClose: () => void;
  onSave: (listData: { name: string; description: string; icon: string; color: string }) => void;
}

const iconOptions = [
  { key: 'heart', icon: Heart, label: 'Favorites', color: DarkTheme.colors.status.error },
  { key: 'coffee', icon: Coffee, label: 'Coffee', color: DarkTheme.colors.bangkok.saffron },
  { key: 'trophy', icon: Trophy, label: 'Sports', color: DarkTheme.colors.accent.purple },
  { key: 'briefcase', icon: Briefcase, label: 'Work', color: DarkTheme.colors.accent.blue },
  { key: 'star', icon: Star, label: 'Wishlist', color: DarkTheme.colors.bangkok.gold },
  { key: 'utensils', icon: Utensils, label: 'Food', color: DarkTheme.colors.bangkok.market },
  { key: 'shopping-bag', icon: ShoppingBag, label: 'Shopping', color: DarkTheme.colors.accent.purple },
  { key: 'camera', icon: Camera, label: 'Photo Spots', color: DarkTheme.colors.accent.green },
  { key: 'music', icon: Music, label: 'Nightlife', color: DarkTheme.colors.accent.purple },
  { key: 'trees', icon: Trees, label: 'Outdoors', color: DarkTheme.colors.accent.green },
  { key: 'plane', icon: Plane, label: 'Travel', color: DarkTheme.colors.accent.blue },
  { key: 'map-pin', icon: MapPin, label: 'General', color: DarkTheme.colors.semantic.secondaryLabel },
];

export default function CreateListScreen({ onClose, onSave }: CreateListScreenProps) {
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(iconOptions[0]);

  const handleSave = () => {
    if (!listName.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    const listData = {
      name: listName.trim(),
      description: description.trim(),
      icon: selectedIcon.key,
      color: selectedIcon.color,
    };

    onSave(listData);
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: DarkTheme.colors.semantic.systemBackground 
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: DarkTheme.spacing.lg,
        paddingVertical: DarkTheme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: DarkTheme.colors.semantic.separator,
      }}>
        <TouchableOpacity
          onPress={onClose}
          style={{
            padding: DarkTheme.spacing.xs,
          }}
          activeOpacity={0.7}
        >
          <X 
            size={24} 
            color={DarkTheme.colors.semantic.label}
            strokeWidth={2}
          />
        </TouchableOpacity>

        <Text style={[
          DarkTheme.typography.headline,
          { 
            color: DarkTheme.colors.semantic.label,
            fontWeight: '600' 
          }
        ]}>
          Create New List
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: DarkTheme.colors.bangkok.gold,
            paddingHorizontal: DarkTheme.spacing.sm,
            paddingVertical: DarkTheme.spacing.xs,
            borderRadius: DarkTheme.borderRadius.sm,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          <Check 
            size={16} 
            color={DarkTheme.colors.system.black}
            strokeWidth={2}
          />
          <Text style={[
            DarkTheme.typography.callout,
            { 
              color: DarkTheme.colors.system.black,
              fontWeight: '600',
              marginLeft: DarkTheme.spacing.xs,
            }
          ]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: DarkTheme.spacing.lg,
          paddingVertical: DarkTheme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview */}
        <View style={{
          backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
          borderColor: DarkTheme.colors.semantic.separator,
          borderWidth: 1,
          borderRadius: DarkTheme.borderRadius.md,
          padding: DarkTheme.spacing.md,
          marginBottom: DarkTheme.spacing.lg,
          ...DarkTheme.shadows.small,
        }}>
          <Text style={[
            DarkTheme.typography.subhead,
            { 
              color: DarkTheme.colors.semantic.secondaryLabel,
              marginBottom: DarkTheme.spacing.sm,
              fontWeight: '600',
            }
          ]}>
            Preview
          </Text>
          
          {/* Header Row - matching ListCard format */}
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
                  backgroundColor: `${selectedIcon.color}20`,
                }}
              >
                <selectedIcon.icon 
                  size={20} 
                  color={selectedIcon.color}
                  strokeWidth={2}
                />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text 
                  style={[
                    DarkTheme.typography.headline,
                    { 
                      color: DarkTheme.colors.semantic.label,
                      marginBottom: 2,
                    }
                  ]}
                  numberOfLines={1}
                >
                  {listName || 'My New List'}
                </Text>
                
                <Text 
                  style={[
                    DarkTheme.typography.caption1,
                    { 
                      color: DarkTheme.colors.semantic.secondaryLabel,
                      fontWeight: '600' 
                    }
                  ]}
                >
                  0 places
                </Text>
              </View>
            </View>
          </View>

          {/* Description preview */}
          {description && (
            <View style={{
              backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
              borderRadius: DarkTheme.borderRadius.xs,
              padding: DarkTheme.spacing.sm,
              marginTop: DarkTheme.spacing.xs,
            }}>
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                }
              ]}>
                {description}
              </Text>
            </View>
          )}
        </View>

        {/* List Name Input */}
        <View style={{ marginBottom: DarkTheme.spacing.lg }}>
          <Text style={[
            DarkTheme.typography.headline,
            { 
              color: DarkTheme.colors.semantic.label,
              marginBottom: DarkTheme.spacing.sm,
              fontWeight: '600',
            }
          ]}>
            List Name
          </Text>
          
          <TextInput
            style={[
              DarkTheme.typography.body,
              {
                backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                borderColor: DarkTheme.colors.semantic.separator,
                borderWidth: 1,
                borderRadius: DarkTheme.borderRadius.md,
                padding: DarkTheme.spacing.md,
                color: DarkTheme.colors.semantic.label,
              }
            ]}
            placeholder="Enter list name..."
            placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
            value={listName}
            onChangeText={setListName}
            maxLength={50}
            returnKeyType="next"
          />
        </View>

        {/* Description Input */}
        <View style={{ marginBottom: DarkTheme.spacing.lg }}>
          <Text style={[
            DarkTheme.typography.headline,
            { 
              color: DarkTheme.colors.semantic.label,
              marginBottom: DarkTheme.spacing.sm,
              fontWeight: '600',
            }
          ]}>
            Description (Optional)
          </Text>
          
          <TextInput
            style={[
              DarkTheme.typography.body,
              {
                backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                borderColor: DarkTheme.colors.semantic.separator,
                borderWidth: 1,
                borderRadius: DarkTheme.borderRadius.md,
                padding: DarkTheme.spacing.md,
                color: DarkTheme.colors.semantic.label,
                minHeight: 80,
                textAlignVertical: 'top',
              }
            ]}
            placeholder="What kind of places will you save here?"
            placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
            value={description}
            onChangeText={setDescription}
            maxLength={200}
            multiline
            returnKeyType="done"
          />
        </View>

        {/* Icon Selection */}
        <View style={{ marginBottom: DarkTheme.spacing.xl }}>
          <Text style={[
            DarkTheme.typography.headline,
            { 
              color: DarkTheme.colors.semantic.label,
              marginBottom: DarkTheme.spacing.md,
              fontWeight: '600',
            }
          ]}>
            Choose an Icon
          </Text>
          
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}>
            {iconOptions.map((option) => {
              const isSelected = selectedIcon.key === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setSelectedIcon(option)}
                  style={{
                    width: '23%',
                    aspectRatio: 1,
                    backgroundColor: isSelected 
                      ? `${option.color}20` 
                      : DarkTheme.colors.semantic.secondarySystemBackground,
                    borderColor: isSelected 
                      ? option.color 
                      : DarkTheme.colors.semantic.separator,
                    borderWidth: isSelected ? 2 : 1,
                    borderRadius: DarkTheme.borderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: DarkTheme.spacing.sm,
                  }}
                  activeOpacity={0.7}
                >
                  <option.icon 
                    size={24} 
                    color={option.color}
                    strokeWidth={2}
                  />
                  <Text style={[
                    DarkTheme.typography.caption2,
                    { 
                      color: isSelected ? option.color : DarkTheme.colors.semantic.tertiaryLabel,
                      marginTop: DarkTheme.spacing.xs,
                      textAlign: 'center',
                      fontWeight: isSelected ? '600' : '400',
                    }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 