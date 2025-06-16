import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { 
  MapPin, 
  Edit3, 
  Share, 
  Plus,
  Heart, 
  Coffee, 
  Briefcase, 
  TrendingUp, 
  Star, 
  Clock, 
  Sparkles,
  Utensils,
  Camera,
  Music,
  ShoppingBag,
  Plane,
  Home,
  Users,
  Book,
  Gamepad2,
  Dumbbell
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Title3, 
  Body, 
  SecondaryText,
  PrimaryButton,
  OutlineButton,
  ElevatedCard 
} from '../components/common';
import type { ListsStackScreenProps, DecideStackScreenProps } from '../navigation/types';
import { listService } from '../services/lists';
import type { List } from '../types/database';

// This screen can be used from both Lists and Decide stacks
type ListDetailScreenProps = 
  | ListsStackScreenProps<'ListDetail'>
  | DecideStackScreenProps<'ListDetail'>;

// Icon mapping function (same as in ListItem.tsx)
const getIconComponent = (iconKey: string) => {
  switch (iconKey) {
    case 'heart':
      return Heart;
    case 'coffee':
      return Coffee;
    case 'briefcase':
      return Briefcase;
    case 'star':
      return Star;
    case 'sparkles':
      return Sparkles;
    case 'utensils':
      return Utensils;
    case 'camera':
      return Camera;
    case 'music':
      return Music;
    case 'shopping-bag':
      return ShoppingBag;
    case 'plane':
      return Plane;
    case 'home':
      return Home;
    case 'users':
      return Users;
    case 'book':
      return Book;
    case 'gamepad-2':
      return Gamepad2;
    case 'dumbbell':
      return Dumbbell;
    case 'clock':
      return Clock;
    case 'trending-up':
      return TrendingUp;
    default:
      return MapPin;
  }
};

// Mock places data for the list
const mockListPlaces = [
  {
    id: '1',
    name: 'Chatuchak Weekend Market',
    type: 'shopping' as const,
    description: 'Famous weekend market with thousands of stalls',
    rating: 4.5,
    distance: '2.3km',
    btsStation: 'Mo Chit',
  },
  {
    id: '2',
    name: 'Wat Pho Temple',
    type: 'temple' as const,
    description: 'Historic Buddhist temple with reclining Buddha',
    rating: 4.8,
    distance: '5.1km',
  },
  {
    id: '3',
    name: 'Café Tartine',
    type: 'cafe' as const,
    description: 'Cozy French-style café with excellent coffee',
    rating: 4.3,
    distance: '1.8km',
    btsStation: 'Nana',
  },
];

export default function ListDetailScreen({ route, navigation }: ListDetailScreenProps) {
  const { listId, listName, listType } = route.params;
  const isEditable = 'isEditable' in route.params ? route.params.isEditable : false;
  
  // State for list data
  const [listData, setListData] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load list data
  const loadListData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listService.getListWithPlaces(listId);
      setListData(data);
    } catch (err) {
      console.error('Error loading list:', err);
      setError('Failed to load list details');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadListData();
  }, [listId]);

  // Refresh data when screen comes into focus (e.g., returning from EditListScreen)
  useFocusEffect(
    React.useCallback(() => {
      loadListData();
    }, [listId])
  );

  const handleEditList = () => {
    // Check if we have the isEditable param - this indicates we're in the Lists stack
    const isInListsStack = 'isEditable' in route.params;
    
    if (isInListsStack) {
      // We're in the Lists stack, navigate directly to EditList
      (navigation as any).navigate('EditList', {
        listId,
        listName: listData?.name || listName,
        listDescription: listData?.description || '',
        listIcon: listData?.icon || 'heart',
        listColor: listData?.color || Colors.primary[500],
        listType: listData?.list_type || 'general',
        privacyLevel: listData?.privacy_level || 'private',
      });
    } else {
      // We're in the Decide stack, offer to navigate to Lists tab
      Alert.alert(
        'Edit List', 
        'To edit this list, you need to go to the Lists tab.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Lists', 
            onPress: () => {
              // Navigate to the root navigator and then to Lists tab
              (navigation as any).getParent()?.navigate('ListsStack', {
                screen: 'EditList',
                params: {
                  listId,
                  listName: listData?.name || listName,
                  listDescription: listData?.description || '',
                  listIcon: listData?.icon || 'heart',
                  listColor: listData?.color || Colors.primary[500],
                  listType: listData?.list_type || 'general',
                  privacyLevel: listData?.privacy_level || 'private',
                }
              });
            }
          }
        ]
      );
    }
  };

  const handleShareList = () => {
    Alert.alert('Share List', `Sharing "${listName}" list...`);
  };

  const handleAddPlace = () => {
    Alert.alert('Add Place', 'Add place functionality coming soon!');
  };

  const handlePlacePress = (placeId: string, placeName: string) => {
    // Type assertion needed due to union type complexity
    (navigation as any).navigate('PlaceDetails', {
      placeId,
      placeName,
      source: 'list',
    });
  };

  const getListTypeColor = () => {
    switch (listType) {
      case 'user':
        return Colors.primary[500];
      case 'auto':
      case 'smart':
        return Colors.accent.blue;
      default:
        return Colors.semantic.textSecondary;
    }
  };

  const getListTypeBadge = () => {
    switch (listType) {
      case 'auto':
        return 'AUTO';
      case 'smart':
        return 'SMART';
      default:
        return null;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Body>Loading list details...</Body>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.layout.screenPadding
      }}>
        <Body color="secondary" style={{ textAlign: 'center', marginBottom: Spacing.md }}>
          {error}
        </Body>
        <PrimaryButton
          title="Try Again"
          onPress={loadListData}
          size="sm"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* List Header */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingTop: Spacing.lg,
          paddingBottom: Spacing.md,
        }}>
          <ElevatedCard padding="lg">
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: Spacing.sm,
            }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: `${listData?.color || getListTypeColor()}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: Spacing.md,
                }}
              >
                {(() => {
                  const IconComponent = listData?.icon ? getIconComponent(listData.icon) : MapPin;
                  return (
                    <IconComponent
                      size={24}
                      color={listData?.color || getListTypeColor()}
                      strokeWidth={2}
                    />
                  );
                })()}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: Spacing.xs,
                }}>
                  <Title3 style={{ flex: 1 }}>{listData?.name || listName}</Title3>
                  {getListTypeBadge() && (
                    <View
                      style={{
                        backgroundColor: `${listData?.color || getListTypeColor()}20`,
                        paddingHorizontal: Spacing.sm,
                        paddingVertical: 2,
                        borderRadius: 12,
                      }}
                    >
                      <Typography
                        variant="caption2"
                        color="brand"
                        style={{ fontWeight: '600', fontSize: 10 }}
                      >
                        {getListTypeBadge()}
                      </Typography>
                    </View>
                  )}
                </View>

                <SecondaryText>
                  {(listData as any)?.places?.length || 0} place{((listData as any)?.places?.length || 0) !== 1 ? 's' : ''}
                </SecondaryText>
                
                {listData?.description && (
                  <Body color="secondary" style={{ marginTop: Spacing.xs }}>
                    {listData.description}
                  </Body>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: Spacing.sm,
              marginTop: Spacing.md,
            }}>
              {isEditable && (
                <PrimaryButton
                  title="Edit List"
                  onPress={handleEditList}
                  icon={Edit3}
                  size="sm"
                  style={{ flex: 1 }}
                />
              )}
              
              <OutlineButton
                title="Share"
                onPress={handleShareList}
                icon={Share}
                size="sm"
                style={{ flex: 1 }}
              />

              {isEditable && (
                <OutlineButton
                  title="Add Place"
                  onPress={handleAddPlace}
                  icon={Plus}
                  size="sm"
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </ElevatedCard>
        </View>

        {/* Places in List */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
        }}>
          <Title3 style={{ marginBottom: Spacing.md }}>
            Places in this list
          </Title3>

          {((listData as any)?.places?.length || 0) > 0 ? (
            ((listData as any)?.places || []).map((place: any) => (
              <ElevatedCard
                key={place.id}
                padding="md"
                style={{ marginBottom: Spacing.layout.cardSpacing }}
                onPress={() => handlePlacePress(place.id, place.name)}
              >
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${Colors.accent.blue}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: Spacing.md,
                    }}
                  >
                    <MapPin
                      size={20}
                      color={Colors.accent.blue}
                      strokeWidth={2}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Typography variant="headline" style={{ marginBottom: 2 }}>
                      {place.name}
                    </Typography>
                    
                    <SecondaryText numberOfLines={1}>
                      {place.address}
                    </SecondaryText>

                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: Spacing.xs,
                      gap: Spacing.sm,
                    }}>
                      <SecondaryText style={{ fontSize: 12 }}>
                        📍 {place.place_type}
                      </SecondaryText>
                      
                      {place.price_level && (
                        <SecondaryText style={{ fontSize: 12 }}>
                          💰 {'$'.repeat(place.price_level)}
                        </SecondaryText>
                      )}

                      {place.bangkok_context?.bts_proximity === 'walking' && (
                        <View
                          style={{
                            backgroundColor: Colors.accent.green + '20',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8,
                          }}
                        >
                          <SecondaryText style={{ fontSize: 10, color: Colors.accent.green }}>
                            BTS Nearby
                          </SecondaryText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </ElevatedCard>
            ))
          ) : (
            <ElevatedCard padding="lg">
              <View style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
                <Body color="secondary" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>
                  No places in this list yet
                </Body>
                {isEditable && (
                  <PrimaryButton
                    title="Add Your First Place"
                    onPress={handleAddPlace}
                    icon={Plus}
                    size="sm"
                  />
                )}
              </View>
            </ElevatedCard>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 