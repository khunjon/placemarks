import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  Switch,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Share, 
  Plus, 
  SortAsc, 
  MapPin, 
  Star, 
  Clock, 
  Eye, 
  Navigation, 
  CheckCircle,
  Heart,
  Coffee,
  Briefcase,
  Map,
  MessageSquare,
  MoreVertical,
  Route,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Title1,
  Title3, 
  Body, 
  SecondaryText,
  PrimaryButton,
  SecondaryButton,
  Card,
  ElevatedCard,
  LoadingState,
  EmptyState
} from '../components/common';
import { useAuth } from '../services/auth-context';
import { 
  enhancedListsService, 
  ListWithPlaces, 
  EnrichedListPlace,
  ListError,
  PlaceError 
} from '../services/listsService';
import type { ListsStackScreenProps } from '../navigation/types';

type ListDetailScreenProps = ListsStackScreenProps<'ListDetail'>;

type SortOption = 'date_added' | 'rating' | 'distance' | 'visit_count' | 'name';

interface SortConfig {
  key: SortOption;
  label: string;
  icon: any;
}

const sortOptions: SortConfig[] = [
  { key: 'date_added', label: 'Date Added', icon: Calendar },
  { key: 'rating', label: 'Your Rating', icon: Star },
  { key: 'visit_count', label: 'Visit Count', icon: TrendingUp },
  { key: 'name', label: 'Name', icon: SortAsc },
];

export default function ListDetailScreen({ navigation, route }: ListDetailScreenProps) {
  const { listId, listName: initialListName } = route.params;
  const { user } = useAuth();
  
  // State
  const [list, setList] = useState<ListWithPlaces | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(initialListName);
  const [editedDescription, setEditedDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date_added');
  const [showSortModal, setShowSortModal] = useState(false);
  
  // Load list data
  useEffect(() => {
    if (user && listId) {
      loadListData();
    }
  }, [user, listId]);

  useFocusEffect(
    React.useCallback(() => {
      if (user && listId) {
        loadListData();
      }
    }, [user, listId])
  );

  const loadListData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const lists = await enhancedListsService.getUserLists(user.id);
      const currentList = lists.find(l => l.id === listId);
      
      if (currentList) {
        setList(currentList);
        setEditedName(currentList.name);
        setEditedDescription(currentList.description || '');
        setIsPublic(currentList.privacy_level === 'public');
      } else {
        Alert.alert('Error', 'List not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading list:', error);
      Alert.alert('Error', 'Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadListData();
    setRefreshing(false);
  };

  const handleSaveEdit = async () => {
    if (!list || !user?.id) return;
    
    try {
      await enhancedListsService.updateList(list.id, {
        name: editedName.trim(),
        description: editedDescription.trim(),
        privacy_level: isPublic ? 'public' : 'private',
      });
      
      setIsEditing(false);
      await loadListData();
      Alert.alert('Success', 'List updated successfully');
    } catch (error) {
      console.error('Error updating list:', error);
      if (error instanceof ListError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to update list');
      }
    }
  };

  const handleDeleteList = async () => {
    if (!list) return;
    
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await enhancedListsService.deleteList(list.id);
              Alert.alert('Success', 'List deleted');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting list:', error);
              if (error instanceof ListError) {
                Alert.alert('Error', error.message);
              } else {
                Alert.alert('Error', 'Failed to delete list');
              }
            }
          }
        }
      ]
    );
  };

  const handleRemovePlace = async (placeId: string, placeName: string) => {
    if (!list) return;
    
    Alert.alert(
      'Remove Place',
      `Remove "${placeName}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await enhancedListsService.removePlaceFromList(list.id, placeId);
              await loadListData();
              Alert.alert('Success', 'Place removed from list');
            } catch (error) {
              console.error('Error removing place:', error);
              Alert.alert('Error', 'Failed to remove place');
            }
          }
        }
      ]
    );
  };

  const handleUpdatePlaceRating = async (placeId: string, rating: number) => {
    if (!list) return;
    
    try {
      await enhancedListsService.updatePlaceInList(list.id, placeId, {
        personal_rating: rating
      });
      await loadListData();
    } catch (error) {
      console.error('Error updating place rating:', error);
      Alert.alert('Error', 'Failed to update rating');
    }
  };

  const handleNavigateToPlace = (place: EnrichedListPlace) => {
    navigation.navigate('PlaceDetails', {
      placeId: place.place.id,
      placeName: place.place.name,
      source: 'list'
    });
  };

  const handleAddPlaces = () => {
    // TODO: Navigate to search/add places screen
    Alert.alert('Coming Soon', 'Add places functionality will be implemented next');
  };

  const handleShare = () => {
    Alert.alert('Coming Soon', 'List sharing functionality will be implemented next');
  };

  const handleGetDirections = (place: EnrichedListPlace) => {
    Alert.alert('Coming Soon', 'Directions functionality will be implemented next');
  };

  const handleCheckIn = (place: EnrichedListPlace) => {
    // TODO: Navigate to check-in functionality
    Alert.alert('Coming Soon', 'Check-in functionality will be implemented next');
  };

  const handleRoutePlanning = () => {
    Alert.alert('Coming Soon', 'Route planning functionality will be implemented next');
  };

  const getSortedPlaces = (places: EnrichedListPlace[]): EnrichedListPlace[] => {
    return [...places].sort((a, b) => {
      switch (sortBy) {
        case 'date_added':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        case 'rating':
          return (b.personal_rating || 0) - (a.personal_rating || 0);
        case 'visit_count':
          return (b.visit_count || 0) - (a.visit_count || 0);
        case 'name':
          return a.place.name.localeCompare(b.place.name);
        default:
          return 0;
      }
    });
  };

  const getVisitedStats = () => {
    if (!list) return { visited: 0, total: 0 };
    
    const visited = list.places.filter(p => (p.visit_count || 0) > 0).length;
    return { visited, total: list.places.length };
  };

  const getListIcon = () => {
    if (!list) return MapPin;
    
    switch (list.icon) {
      case 'heart': return Heart;
      case 'coffee': return Coffee;
      case 'briefcase': return Briefcase;
      case 'map-pin': return MapPin;
      default: return MapPin;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary 
      }}>
        <LoadingState message="Loading list..." />
      </SafeAreaView>
    );
  }

  if (!list) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary 
      }}>
        <EmptyState 
          title="List Not Found"
          description="This list could not be loaded"
          primaryAction={{
            title: "Go Back",
            onPress: () => navigation.goBack()
          }}
        />
      </SafeAreaView>
    );
  }

  const ListIcon = getListIcon();
  const sortedPlaces = getSortedPlaces(list.places);
  const { visited, total } = getVisitedStats();
  const isFavorites = list.is_default;

  return (
        <SafeAreaView 
      style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary 
      }}
      edges={['bottom', 'left', 'right']}
    >
      {/* Sticky Header */}
      <View style={{
        backgroundColor: Colors.semantic.backgroundPrimary,
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
      }}>
        {isEditing ? (
          // Edit Mode
          <View>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: Spacing.md,
            }}>
              <ListIcon 
                size={Spacing.iconSize.lg} 
                color={list.color || Colors.primary[500]}
                strokeWidth={2}
              />
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                style={{
                  flex: 1,
                  marginLeft: Spacing.md,
                  fontSize: 24,
                  fontWeight: '700',
                  color: Colors.semantic.textPrimary,
                  backgroundColor: Colors.semantic.backgroundSecondary,
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: Spacing.xs,
                  borderRadius: 8,
                }}
                placeholder="List name"
                placeholderTextColor={Colors.semantic.textTertiary}
              />
            </View>

            <TextInput
              value={editedDescription}
              onChangeText={setEditedDescription}
              style={{
                backgroundColor: Colors.semantic.backgroundSecondary,
                paddingHorizontal: Spacing.sm,
                paddingVertical: Spacing.sm,
                borderRadius: 8,
                color: Colors.semantic.textSecondary,
                marginBottom: Spacing.md,
                minHeight: 60,
              }}
              placeholder="Add a description..."
              placeholderTextColor={Colors.semantic.textTertiary}
              multiline
              textAlignVertical="top"
            />

            {!isFavorites && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: Spacing.md,
              }}>
                <Body>Make list public</Body>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ 
                    false: Colors.neutral[600], 
                    true: Colors.primary[500] 
                  }}
                  thumbColor={Colors.semantic.textPrimary}
                />
              </View>
            )}

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <SecondaryButton
                title="Cancel"
                onPress={() => {
                  setIsEditing(false);
                  setEditedName(list.name);
                  setEditedDescription(list.description || '');
                  setIsPublic(list.privacy_level === 'public');
                }}
                size="sm"
              />
              <PrimaryButton
                title="Save"
                onPress={handleSaveEdit}
                size="sm"
              />
            </View>
          </View>
        ) : (
          // Display Mode
          <View>
            {/* Description */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: Spacing.sm,
              marginTop: 0,
              paddingTop: 0,
            }}>
              <ListIcon 
                size={Spacing.iconSize.lg} 
                color={list.color || Colors.primary[500]}
                strokeWidth={2}
              />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                {list.description && (
                  <Body color="secondary">
                    {list.description}
                  </Body>
                )}
              </View>
            </View>

            {/* Progress Bar + Action Icons */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: Spacing.md,
            }}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 4,
                }}>
                  <SecondaryText style={{ 
                    fontSize: 12,
                    color: Colors.neutral[600] 
                  }}>
                    {total > 0 ? `${visited} of ${total} visited` : 'No places yet'}
                  </SecondaryText>
                </View>
                <View style={{
                  height: 4,
                  backgroundColor: Colors.neutral[200],
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    width: total > 0 ? `${(visited / total) * 100}%` : '0%',
                    backgroundColor: Colors.accent.green,
                    borderRadius: 2,
                  }} />
                </View>
              </View>

              {list.privacy_level === 'public' && (
                <View style={{
                  backgroundColor: Colors.neutral[100],
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: Spacing.xs,
                  borderRadius: 8,
                  marginRight: Spacing.sm,
                }}>
                  <SecondaryText style={{ 
                    color: Colors.neutral[600],
                    fontSize: 12,
                    fontWeight: '500' 
                  }}>
                    Public
                  </SecondaryText>
                </View>
              )}

              {/* Action Icons */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.sm,
              }}>
                <TouchableOpacity
                  onPress={handleShare}
                  style={{
                    padding: Spacing.sm,
                    backgroundColor: 'transparent',
                    borderRadius: 8,
                  }}
                >
                  <Share 
                    size={Spacing.iconSize.md} 
                    color={Colors.accent.yellow}
                    strokeWidth={2}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsEditing(!isEditing)}
                  style={{
                    padding: Spacing.sm,
                    backgroundColor: 'transparent',
                    borderRadius: 8,
                  }}
                >
                  <Edit3 
                    size={Spacing.iconSize.md} 
                    color={Colors.primary[500]}
                    strokeWidth={2}
                  />
                </TouchableOpacity>

                {!isFavorites && (
                  <TouchableOpacity
                    onPress={handleDeleteList}
                    style={{
                      padding: Spacing.sm,
                      backgroundColor: 'transparent',
                      borderRadius: 8,
                    }}
                  >
                    <Trash2 
                      size={Spacing.iconSize.md} 
                      color={Colors.semantic.error}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Places Section Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}>
              <TouchableOpacity
                onPress={() => setShowSortModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: Spacing.xs,
                  backgroundColor: Colors.semantic.backgroundSecondary,
                  borderRadius: 8,
                  marginRight: Spacing.sm,
                }}
              >
                <SortAsc 
                  size={Spacing.iconSize.sm} 
                  color={Colors.semantic.textSecondary}
                  strokeWidth={2}
                />
                <SecondaryText style={{ marginLeft: Spacing.xs }}>
                  Sort
                </SecondaryText>
              </TouchableOpacity>

              <PrimaryButton
                title="Add Places"
                onPress={handleAddPlaces}
                icon={Plus}
                size="sm"
              />
            </View>
          </View>
        )}
      </View>

      {/* Scrollable Places List */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingTop: Spacing.md,
          paddingBottom: Spacing.xl 
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Places List */}
        {sortedPlaces.length > 0 ? (
          <View>
            {sortedPlaces.map((listPlace) => (
              <PlaceCard
                key={listPlace.place.id}
                listPlace={listPlace}
                onRemove={() => handleRemovePlace(listPlace.place.id, listPlace.place.name)}
                onRatingChange={(rating) => handleUpdatePlaceRating(listPlace.place.id, rating)}
                onViewDetails={() => handleNavigateToPlace(listPlace)}
                onGetDirections={() => handleGetDirections(listPlace)}
                onCheckIn={() => handleCheckIn(listPlace)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No places yet"
            description={`Start building your ${list.name} list by adding some places!`}
            primaryAction={{
              title: "Add Places",
              onPress: handleAddPlaces
            }}
          />
        )}
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSortModal(false)}
      >
        <SafeAreaView style={{ 
          flex: 1, 
          backgroundColor: Colors.semantic.backgroundPrimary 
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: Spacing.layout.screenPadding,
            paddingVertical: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: Colors.semantic.borderPrimary,
          }}>
            <Typography variant="headline" style={{ fontWeight: '600' }}>
              Sort Places
            </Typography>
            <TouchableOpacity
              onPress={() => setShowSortModal(false)}
              style={{ padding: Spacing.xs }}
            >
              <Typography variant="body" style={{ color: Colors.primary[500] }}>
                Done
              </Typography>
            </TouchableOpacity>
          </View>

          <View style={{ padding: Spacing.layout.screenPadding }}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => {
                  setSortBy(option.key);
                  setShowSortModal(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.semantic.borderPrimary,
                }}
              >
                <option.icon 
                  size={Spacing.iconSize.md} 
                  color={sortBy === option.key ? Colors.primary[500] : Colors.semantic.textSecondary}
                  strokeWidth={2}
                />
                <Body style={{ 
                  marginLeft: Spacing.md,
                  color: sortBy === option.key ? Colors.primary[500] : Colors.semantic.textPrimary,
                  fontWeight: sortBy === option.key ? '600' : '400'
                }}>
                  {option.label}
                </Body>
                {sortBy === option.key && (
                  <CheckCircle 
                    size={Spacing.iconSize.sm} 
                    color={Colors.primary[500]}
                    strokeWidth={2}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Place Card Component
interface PlaceCardProps {
  listPlace: EnrichedListPlace;
  onRemove: () => void;
  onRatingChange: (rating: number) => void;
  onViewDetails: () => void;
  onGetDirections: () => void;
  onCheckIn: () => void;
}

function PlaceCard({ 
  listPlace, 
  onRemove, 
  onRatingChange, 
  onViewDetails, 
  onGetDirections, 
  onCheckIn 
}: PlaceCardProps) {
  const { place } = listPlace;
  const hasVisited = (listPlace.visit_count || 0) > 0;
  
  const renderStars = (rating: number, onPress?: (rating: number) => void) => {
    return (
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress?.(star)}
            disabled={!onPress}
          >
            <Star
              size={16}
              color={star <= rating ? Colors.accent.yellow : Colors.neutral[400]}
              fill={star <= rating ? Colors.accent.yellow : 'transparent'}
              strokeWidth={1.5}
              style={{ marginRight: 2 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onViewDetails}
      activeOpacity={0.7}
    >
      <ElevatedCard 
        padding="sm" 
        style={{ 
          marginBottom: Spacing.sm,
          opacity: hasVisited ? 1 : 0.8,
          borderLeftWidth: hasVisited ? 4 : 0,
          borderLeftColor: hasVisited ? Colors.accent.green : 'transparent',
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: Spacing.xs,
        }}>
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: Spacing.xs,
            }}>
              <Typography variant="headline" style={{ 
                fontWeight: '600',
                flex: 1,
                fontSize: 16,
              }}>
                {place.name}
              </Typography>
              {hasVisited && (
                <CheckCircle 
                  size={Spacing.iconSize.sm} 
                  color={Colors.accent.green}
                  strokeWidth={2}
                />
              )}
            </View>

            {place.address && (
              <Body color="secondary" style={{ 
                marginBottom: Spacing.xs,
                fontSize: 13,
              }}>
                {place.address}
              </Body>
            )}

            {/* Ratings */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: Spacing.xs,
            }}>
              <SecondaryText style={{ 
                marginRight: Spacing.sm,
                fontSize: 12,
              }}>
                Your rating:
              </SecondaryText>
              {renderStars(listPlace.personal_rating || 0, onRatingChange)}
            </View>

            {place.google_rating && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: Spacing.xs,
              }}>
                <SecondaryText style={{ 
                  marginRight: Spacing.sm,
                  fontSize: 12,
                }}>
                  Google:
                </SecondaryText>
                {renderStars(Math.round(place.google_rating))}
                <SecondaryText style={{ 
                  marginLeft: Spacing.xs,
                  fontSize: 12,
                }}>
                  ({place.google_rating.toFixed(1)})
                </SecondaryText>
              </View>
            )}

            {/* Stats */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: Spacing.xs,
            }}>
              {listPlace.visit_count && listPlace.visit_count > 0 && (
                <View style={{
                  backgroundColor: Colors.accent.green,
                  paddingHorizontal: Spacing.xs,
                  paddingVertical: 2,
                  borderRadius: 6,
                  marginRight: Spacing.xs,
                }}>
                  <SecondaryText style={{ 
                    color: Colors.neutral[950],
                    fontSize: 11,
                    fontWeight: '600' 
                  }}>
                    {listPlace.visit_count} visits
                  </SecondaryText>
                </View>
              )}

              <View style={{
                backgroundColor: Colors.neutral[700],
                paddingHorizontal: Spacing.xs,
                paddingVertical: 2,
                borderRadius: 6,
                marginRight: Spacing.xs,
              }}>
                <SecondaryText style={{ 
                  color: Colors.semantic.textPrimary,
                  fontSize: 11 
                }}>
                  Added {new Date(listPlace.added_at).toLocaleDateString()}
                </SecondaryText>
              </View>
            </View>

            {/* Notes */}
            {listPlace.notes && (
              <View style={{
                backgroundColor: Colors.semantic.backgroundSecondary,
                padding: Spacing.xs,
                borderRadius: 6,
                marginTop: Spacing.xs,
              }}>
                <Body color="secondary" style={{ fontSize: 13 }}>
                  {listPlace.notes}
                </Body>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={onRemove}
            style={{
              padding: Spacing.xs,
              backgroundColor: Colors.semantic.error + '20',
              borderRadius: 6,
              marginLeft: Spacing.sm,
            }}
          >
            <Trash2 
              size={16} 
              color={Colors.semantic.error}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: Spacing.sm,
        }}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onGetDirections();
            }}
            style={{
              padding: Spacing.xs,
              backgroundColor: Colors.neutral[100],
              borderRadius: 6,
            }}
          >
            <Navigation 
              size={16} 
              color={Colors.neutral[700]}
              strokeWidth={2}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onCheckIn();
            }}
            style={{
              padding: Spacing.xs,
              backgroundColor: Colors.accent.yellow,
              borderRadius: 6,
            }}
          >
            <Target 
              size={16} 
              color={Colors.neutral[950]}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </ElevatedCard>
    </TouchableOpacity>
  );
} 