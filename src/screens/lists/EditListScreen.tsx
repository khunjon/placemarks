import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
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
  Plane,
  Plus
} from '../../components/icons';
import { DarkTheme } from '../../constants/theme';
import { listsService } from '../../services/listsService';
import { useAuth } from '../../services/auth-context';
import type { ListsStackScreenProps } from '../../navigation/types';
import { Toast } from '../../components/common';

type EditListScreenProps = ListsStackScreenProps<'EditList'>;

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

export default function EditListScreen({ route, navigation }: EditListScreenProps) {
  const { listId, listName, listDescription = '', listIcon = 'heart', listType = 'general', listVisibility = 'private' } = route.params;
  const { user } = useAuth();
  
  // Check if this is the Favorites list
  const isFavoritesList = listType === 'favorites';
  
  const [name, setName] = useState(listName);
  const [description, setDescription] = useState(listDescription);
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>(listVisibility);
  
  // Find the selected icon from the options, fallback to first option if not found
  const initialIcon = iconOptions.find(option => option.key === listIcon) || iconOptions[0];
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track initial values for change detection
  const initialValues = {
    name: listName,
    description: listDescription,
    icon: listIcon,
    visibility: listVisibility
  };
  
  // Check if any changes have been made
  const hasChanges = () => {
    return name !== initialValues.name ||
           description !== initialValues.description ||
           selectedIcon.key !== initialValues.icon ||
           visibility !== initialValues.visibility;
  };
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToastMessage('Please enter a list name', 'error');
      return;
    }

    if (!user?.id) {
      showToastMessage('You must be logged in to edit lists', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      const updateData = {
        name: name.trim(),
        description: description.trim(),
        icon: selectedIcon.key,
        color: selectedIcon.color,
        visibility: visibility,
        list_type: listType, // Preserve the original list type
        type: 'user' as const,
      };

      console.log('Updating list with data:', JSON.stringify(updateData, null, 2));
      
      await listsService.updateList(listId, updateData);
      
      // Note: List updated - navigation will refresh when going back
      
      showToastMessage(`"${name}" updated successfully!`, 'success');
      
      // Navigate back after a short delay to let user see the toast
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error updating list:', error);
      showToastMessage('Failed to update list. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // If this is the Favorites list, show a simplified interface
  if (isFavoritesList) {
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
            onPress={() => navigation.goBack()}
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
            Favorites
          </Text>

          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingHorizontal: DarkTheme.spacing.lg,
            paddingVertical: DarkTheme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Favorites Info */}
          <View style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderColor: DarkTheme.colors.semantic.separator,
            borderWidth: 1,
            borderRadius: DarkTheme.borderRadius.md,
            padding: DarkTheme.spacing.lg,
            marginBottom: DarkTheme.spacing.xl,
            alignItems: 'center',
          }}>
            <Heart 
              size={48} 
              color={DarkTheme.colors.status.error}
              strokeWidth={2}
              style={{ marginBottom: DarkTheme.spacing.md }}
            />
            
            <Text style={[
              DarkTheme.typography.title3,
              { 
                color: DarkTheme.colors.semantic.label,
                marginBottom: DarkTheme.spacing.sm,
                fontWeight: '600',
                textAlign: 'center',
              }
            ]}>
              Your Favorites List
            </Text>
            
            <Text style={[
              DarkTheme.typography.body,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                textAlign: 'center',
                lineHeight: 22,
              }
            ]}>
              This is your special Favorites list. The name and icon cannot be changed, but you can add all your favorite places here.
            </Text>
          </View>

          {/* Add Places Section */}
          <View style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderColor: DarkTheme.colors.semantic.separator,
            borderWidth: 1,
            borderRadius: DarkTheme.borderRadius.md,
            padding: DarkTheme.spacing.lg,
          }}>
            <Text style={[
              DarkTheme.typography.headline,
              { 
                color: DarkTheme.colors.semantic.label,
                marginBottom: DarkTheme.spacing.md,
                fontWeight: '600',
              }
            ]}>
              Manage Places
            </Text>
            
            <TouchableOpacity
              style={{
                backgroundColor: DarkTheme.colors.bangkok.gold,
                borderRadius: DarkTheme.borderRadius.md,
                paddingVertical: DarkTheme.spacing.md,
                paddingHorizontal: DarkTheme.spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: DarkTheme.spacing.md,
              }}
              activeOpacity={0.8}
              onPress={() => {
                // TODO: Navigate to place search/add screen
                console.log('Add place to favorites');
              }}
            >
              <Plus 
                size={20} 
                color={DarkTheme.colors.system.black}
                strokeWidth={2}
                style={{ marginRight: DarkTheme.spacing.sm }}
              />
              <Text style={[
                DarkTheme.typography.headline,
                { 
                  color: DarkTheme.colors.system.black,
                  fontWeight: '600',
                }
              ]}>
                Add Places to Favorites
              </Text>
            </TouchableOpacity>
            
            <Text style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                textAlign: 'center',
              }
            ]}>
              Search for places and add them to your favorites list
            </Text>
          </View>
        </ScrollView>
        
        {/* Toast Notification */}
        <Toast
          visible={showToast}
          message={toastMessage}
          type={toastType}
          onHide={() => setShowToast(false)}
        />
      </SafeAreaView>
    );
  }

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
          onPress={() => navigation.goBack()}
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
          Edit List
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!name.trim() || isLoading || !hasChanges()}
          style={{
            backgroundColor: (!name.trim() || isLoading || !hasChanges()) 
              ? DarkTheme.colors.semantic.tertiaryLabel 
              : DarkTheme.colors.bangkok.gold,
            paddingHorizontal: DarkTheme.spacing.sm,
            paddingVertical: DarkTheme.spacing.xs,
            borderRadius: DarkTheme.borderRadius.sm,
            flexDirection: 'row',
            alignItems: 'center',
            opacity: (!name.trim() || isLoading || !hasChanges()) ? 0.5 : 1,
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
            {isLoading ? 'Saving...' : 'Save'}
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
          
          {isFavoritesList && (
            <Text style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                marginBottom: DarkTheme.spacing.sm,
                fontStyle: 'italic',
              }
            ]}>
              The Favorites list name cannot be changed
            </Text>
          )}
          
          <TextInput
            style={[
              DarkTheme.typography.body,
              {
                backgroundColor: isFavoritesList 
                  ? DarkTheme.colors.semantic.tertiarySystemBackground 
                  : DarkTheme.colors.semantic.secondarySystemBackground,
                borderColor: DarkTheme.colors.semantic.separator,
                borderWidth: 1,
                borderRadius: DarkTheme.borderRadius.md,
                padding: DarkTheme.spacing.md,
                color: isFavoritesList 
                  ? DarkTheme.colors.semantic.secondaryLabel 
                  : DarkTheme.colors.semantic.label,
              }
            ]}
            placeholder="Enter list name..."
            placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
            value={name}
            onChangeText={isFavoritesList ? undefined : setName}
            maxLength={50}
            returnKeyType="next"
            editable={!isFavoritesList}
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

        {/* Visibility Toggle */}
        <View style={{ marginBottom: DarkTheme.spacing.lg }}>
          <Text style={[
            DarkTheme.typography.headline,
            { 
              color: DarkTheme.colors.semantic.label,
              marginBottom: DarkTheme.spacing.sm,
              fontWeight: '600',
            }
          ]}>
            List Visibility
          </Text>
          
          <TouchableOpacity
            style={{
              backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
              borderColor: DarkTheme.colors.semantic.separator,
              borderWidth: 1,
              borderRadius: DarkTheme.borderRadius.md,
              padding: DarkTheme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => {
              // Cycle through visibility options
              if (visibility === 'private') {
                setVisibility('friends');
              } else if (visibility === 'friends') {
                setVisibility('public');
              } else {
                setVisibility('private');
              }
            }}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[
                DarkTheme.typography.body,
                { 
                  color: DarkTheme.colors.semantic.label,
                  marginBottom: DarkTheme.spacing.xs,
                }
              ]}>
                {visibility === 'private' ? 'Private List' : visibility === 'friends' ? 'Friends Only' : 'Public List'}
              </Text>
              <Text style={[
                DarkTheme.typography.caption1,
                { color: DarkTheme.colors.semantic.secondaryLabel }
              ]}>
                {visibility === 'private' 
                  ? 'Only you can see this list' 
                  : visibility === 'friends' 
                  ? 'Your friends can see this list' 
                  : 'Anyone can discover this list'}
              </Text>
            </View>
            
            <View style={{
              backgroundColor: visibility === 'public' 
                ? DarkTheme.colors.bangkok.gold 
                : visibility === 'friends'
                ? DarkTheme.colors.accent.blue
                : DarkTheme.colors.semantic.tertiarySystemBackground,
              paddingHorizontal: DarkTheme.spacing.sm,
              paddingVertical: DarkTheme.spacing.xs,
              borderRadius: DarkTheme.borderRadius.sm,
              borderWidth: visibility === 'private' ? 1 : 0,
              borderColor: visibility === 'private' ? DarkTheme.colors.semantic.separator : 'transparent',
            }}>
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: visibility === 'private' 
                    ? DarkTheme.colors.semantic.label 
                    : DarkTheme.colors.system.black,
                  fontWeight: '600',
                }
              ]}>
                {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
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
      
      {/* Toast Notification */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
} 