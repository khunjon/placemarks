import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Edit3, Share, Plus } from 'lucide-react-native';
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

// This screen can be used from both Lists and Decide stacks
type ListDetailScreenProps = 
  | ListsStackScreenProps<'ListDetail'>
  | DecideStackScreenProps<'ListDetail'>;

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

  const handleEditList = () => {
    // Check if we have the isEditable param - this indicates we're in the Lists stack
    const isInListsStack = 'isEditable' in route.params;
    
    if (isInListsStack) {
      // We're in the Lists stack, navigate directly to EditList
      (navigation as any).navigate('EditList', {
        listId,
        listName,
        listDescription: 'Sample list description',
        listIcon: 'heart',
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
                  listName,
                  listDescription: 'Sample list description',
                  listIcon: 'heart',
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
                  backgroundColor: `${getListTypeColor()}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: Spacing.md,
                }}
              >
                <MapPin
                  size={24}
                  color={getListTypeColor()}
                  strokeWidth={2}
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: Spacing.xs,
                }}>
                  <Title3 style={{ flex: 1 }}>{listName}</Title3>
                  {getListTypeBadge() && (
                    <View
                      style={{
                        backgroundColor: `${getListTypeColor()}20`,
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
                  {mockListPlaces.length} place{mockListPlaces.length !== 1 ? 's' : ''}
                </SecondaryText>
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

          {mockListPlaces.length > 0 ? (
            mockListPlaces.map((place) => (
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
                      {place.description}
                    </SecondaryText>

                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: Spacing.xs,
                      gap: Spacing.sm,
                    }}>
                      <SecondaryText style={{ fontSize: 12 }}>
                        ⭐ {place.rating}
                      </SecondaryText>
                      
                      <SecondaryText style={{ fontSize: 12 }}>
                        📍 {place.distance}
                      </SecondaryText>

                      {place.btsStation && (
                        <View
                          style={{
                            backgroundColor: Colors.accent.green + '20',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8,
                          }}
                        >
                          <SecondaryText style={{ fontSize: 10, color: Colors.accent.green }}>
                            BTS {place.btsStation}
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