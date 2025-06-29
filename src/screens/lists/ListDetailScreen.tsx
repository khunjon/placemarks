import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  Switch,
  Modal,
  Share as RNShare
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
  Calendar,
  Target,
  Utensils,
  Camera,
  TrendingUp,
  Award,
  MoreVertical
} from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';
import { Spacing } from '../../constants/Spacing';
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
} from '../../components/common';
import { PlaceCard } from '../../components/places';
import { useAuth } from '../../services/auth-context';
import { 
  listsService, 
  ListWithPlaces, 
  EnrichedListPlace,
  ListError
} from '../../services/listsService';
import { userRatingsService, UserRatingType } from '../../services/userRatingsService';
import { checkInsService } from '../../services/checkInsService';
import Toast from '../../components/ui/Toast';
import type { ListsStackScreenProps } from '../../navigation/types';

type ListDetailScreenProps = ListsStackScreenProps<'ListDetail'>;

type SortOption = 'date_added' | 'rating' | 'visit_count' | 'name' | 'distance';

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
  const { listId, listName: initialListName, listType, isEditable } = route.params;
  const { user } = useAuth();
  
  // Track initial mount to prevent duplicate loading
  const isInitialMount = useRef(true);
  
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
  const [userRatings, setUserRatings] = useState<Record<string, UserRatingType>>({});
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Toast helper functions
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };
  
  // Initial load
  useEffect(() => {
    if (user && listId) {
      loadListData();
    }
  }, [user, listId]);

  // Refresh data when screen comes back into focus (but not on initial mount)
  useFocusEffect(
    React.useCallback(() => {
      // Skip the first focus effect call (initial mount)
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      if (user && listId) {
        loadListData();
      }
    }, [user, listId])
  );

  /**
   * Load list data - simplified with Google Place IDs
   */
  const loadListData = async (forceRefresh = false) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Load list with places - much simpler with Google Place IDs
      const [listWithPlaces, userRatingsData] = await Promise.all([
        // Get list with enriched places
        loadListWithPlaces(),
        
        // Get user ratings for all places in the list
        loadUserRatingsForList()
      ]);
      
      if (listWithPlaces) {
        setList(listWithPlaces);
        setEditedName(listWithPlaces.name);
        setEditedDescription(listWithPlaces.description || '');
        setIsPublic(listWithPlaces.visibility === 'public');
        setUserRatings(userRatingsData);
      } else {
        Alert.alert('Error', 'List not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading list:', error);
      showToast('Failed to load list', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load list with places using the new simplified service
   */
  const loadListWithPlaces = async (): Promise<ListWithPlaces | null> => {
    if (listType === 'curated') {
      // Load curated lists with places
      const curatedLists = await listsService.getCuratedLists();
      return curatedLists.find(l => l.id === listId) || null;
    } else {
      // Load user lists with places
      const lists = await listsService.getUserListsWithPlaces(user!.id);
      return lists.find(l => l.id === listId) || null;
    }
  };

  /**
   * Load user ratings for all places in the list - simplified with Google Place IDs
   */
  const loadUserRatingsForList = async (): Promise<Record<string, UserRatingType>> => {
    try {
      let currentList: ListWithPlaces | null = null;
      
      if (listType === 'curated') {
        // For curated lists, get from curated lists
        const curatedLists = await listsService.getCuratedLists();
        currentList = curatedLists.find(l => l.id === listId) || null;
      } else {
        // For user lists, get from user lists
        const lists = await listsService.getUserListsWithPlaces(user!.id);
        currentList = lists.find(l => l.id === listId) || null;
      }
      
      if (!currentList) return {};
      
      // Extract Google Place IDs
      const googlePlaceIds = currentList.places.map(p => p.place_id);
      
      // Get ratings for all places at once
      const ratingsMap = await userRatingsService.getUserRatingsForPlaces(user!.id, googlePlaceIds);
      
      // Convert to record format
      const result: Record<string, UserRatingType> = {};
      ratingsMap.forEach((rating, googlePlaceId) => {
        result[googlePlaceId] = rating;
      });
      
      return result;
    } catch (error) {
      console.error('Error loading user ratings:', error);
      return {};
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadListData(true);
    setRefreshing(false);
  };

  /**
   * Handle list editing
   */
  const handleSaveEdit = async () => {
    if (!editedName.trim()) {
      showToast('List name cannot be empty', 'error');
      return;
    }
    
    try {
      await listsService.updateList(listId, {
        name: editedName.trim(),
        description: editedDescription.trim(),
        visibility: isPublic ? 'public' : 'private',
      });
      
      setIsEditing(false);
      showToast('List updated successfully');
      
      // Update local state
      if (list) {
        setList({
          ...list,
          name: editedName.trim(),
          description: editedDescription.trim(),
          visibility: isPublic ? 'public' : 'private',
        });
      }
    } catch (error) {
      console.error('Error updating list:', error);
      showToast('Failed to update list', 'error');
    }
  };

  /**
   * Handle list deletion
   */
  const handleDeleteList = () => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await listsService.deleteList(listId);
              showToast('List deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting list:', error);
              showToast('Failed to delete list', 'error');
            }
          }
        }
      ]
    );
  };

  /**
   * Handle adding places to list
   */
  const handleAddPlace = () => {
    navigation.navigate('AddPlaceToList', {
      listId,
      listName: list?.name || 'List',
    });
  };

  /**
   * Handle removing place from list
   */
  const handleRemovePlace = async (googlePlaceId: string, placeName: string) => {
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
              await listsService.removePlaceFromList(listId, googlePlaceId);
              showToast('Place removed from list');
              
              // Update local state
              if (list) {
                setList({
                  ...list,
                  places: list.places.filter(p => p.place_id !== googlePlaceId),
                  place_count: list.place_count - 1
                });
              }
            } catch (error) {
              console.error('Error removing place:', error);
              showToast('Failed to remove place', 'error');
            }
          }
        }
      ]
    );
  };

  /**
   * Handle check-in for a place
   */
  const handleCheckIn = async (googlePlaceId: string, placeName: string) => {
    try {
      await checkInsService.createCheckIn(user!.id, {
        place_id: googlePlaceId, // Direct Google Place ID usage!
        rating: 'thumbs_up',
        comment: `Visited ${placeName}`,
        photos: [],
        tags: []
      });
      showToast('Check-in created successfully');
    } catch (error) {
      console.error('Error creating check-in:', error);
      showToast('Failed to create check-in', 'error');
    }
  };

  /**
   * Handle place selection/navigation
   */
  const handlePlacePress = (googlePlaceId: string, placeName: string) => {
    navigation.navigate('PlaceInListDetail', {
      placeId: googlePlaceId,
      listId: listId,
      listName: list?.name || initialListName,
    });
  };

  /**
   * Handle sharing list
   */
  const handleShareList = async () => {
    if (!list) return;
    
    try {
      const message = `Check out my "${list.name}" list on Placemarks!\n\n${list.places.slice(0, 3).map(p => `• ${p.place.name}`).join('\n')}${list.places.length > 3 ? `\n...and ${list.places.length - 3} more places` : ''}`;
      
      await RNShare.share({
        message,
        title: `${list.name} - Placemarks List`,
      });
    } catch (error) {
      console.error('Error sharing list:', error);
      showToast('Failed to share list', 'error');
    }
  };

  /**
   * Sort places based on selected option
   */
  const getSortedPlaces = (): EnrichedListPlace[] => {
    if (!list?.places) return [];
    
    const places = [...list.places];
    
    switch (sortBy) {
      case 'date_added':
        return places.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
      
      case 'rating':
        return places.sort((a, b) => {
          const ratingA = userRatings[a.place_id];
          const ratingB = userRatings[b.place_id];
          const scoreA = ratingA === 'thumbs_up' ? 3 : ratingA === 'neutral' ? 2 : ratingA === 'thumbs_down' ? 1 : 0;
          const scoreB = ratingB === 'thumbs_up' ? 3 : ratingB === 'neutral' ? 2 : ratingB === 'thumbs_down' ? 1 : 0;
          return scoreB - scoreA;
        });
      
      case 'visit_count':
        return places.sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0));
      
      case 'name':
        return places.sort((a, b) => a.place.name.localeCompare(b.place.name));
      
      default:
        return places;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }}>
        <LoadingState message="Loading list..." />
      </SafeAreaView>
    );
  }

  if (!list) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }}>
        <EmptyState
          title="List Not Found"
          description="This list doesn't exist or you don't have access to it."
          primaryAction={{
            title: "Go Back",
            onPress: () => navigation.goBack()
          }}
        />
      </SafeAreaView>
    );
  }

  const sortedPlaces = getSortedPlaces();

  return (
    <SafeAreaView 
      style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }} 
      edges={['left', 'right', 'bottom']}
    >
      {/* Sticky Header - Progress bar for all lists */}
      {(
        <View style={{
          backgroundColor: DarkTheme.colors.semantic.systemBackground,
          paddingHorizontal: Spacing.lg,
          paddingTop: 8,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: DarkTheme.colors.semantic.separator,
        }}>
        {isEditing ? (
          // Edit Mode
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ padding: Spacing.xs, marginRight: Spacing.sm }}
              >
                <ArrowLeft size={24} color={DarkTheme.colors.semantic.label} strokeWidth={2} />
              </TouchableOpacity>
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: DarkTheme.colors.semantic.label,
                  backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: Spacing.xs,
                  borderRadius: 8,
                  flex: 1,
                }}
                placeholder="List name"
                placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
              />
            </View>

            <TextInput
              value={editedDescription}
              onChangeText={setEditedDescription}
              style={{
                backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                paddingHorizontal: Spacing.sm,
                paddingVertical: Spacing.sm,
                borderRadius: 8,
                color: DarkTheme.colors.semantic.label,
                marginBottom: Spacing.md,
                minHeight: 60,
              }}
              placeholder="Add a description..."
              placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
              multiline
              textAlignVertical="top"
            />

            {isEditable && (
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
                    false: DarkTheme.colors.semantic.tertiarySystemBackground, 
                    true: DarkTheme.colors.bangkok.gold 
                  }}
                  thumbColor={DarkTheme.colors.semantic.systemBackground}
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
                  setIsPublic(list.visibility === 'public');
                }}
                style={{ flex: 1, marginRight: Spacing.sm }}
              />
              <PrimaryButton
                title="Save"
                onPress={handleSaveEdit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          // Display Mode - Progress Bar
          <View>
            {/* Progress Bar */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View style={{ flex: 1 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 4,
                }}>
                  <Body style={{ fontWeight: '600', fontSize: 15 }}>Places Visited</Body>
                  <View style={{
                    backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    marginLeft: Spacing.sm,
                  }}>
                    <SecondaryText style={{ fontSize: 11, fontWeight: '600' }}>
                      {userRatings && Object.keys(userRatings).length > 0 ? Object.keys(userRatings).length : 0} / {list.places.length}
                    </SecondaryText>
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View style={{
                  height: 4,
                  backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    backgroundColor: DarkTheme.colors.bangkok.gold,
                    width: `${list.places.length > 0 ? (Object.keys(userRatings).length / list.places.length) * 100 : 0}%`,
                    borderRadius: 2,
                  }} />
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', gap: Spacing.xs, marginLeft: Spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setShowSortModal(true)}
                  style={{ padding: 4 }}
                >
                  <SortAsc size={18} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleAddPlace}
                  style={{ padding: 4 }}
                >
                  <Plus size={18} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                </TouchableOpacity>
                
                {isEditable && (
                  <TouchableOpacity
                    onPress={() => setIsEditing(!isEditing)}
                    style={{ padding: 4 }}
                  >
                    <Edit3 size={18} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                  </TouchableOpacity>
                )}
                
                {isEditable && (
                  <TouchableOpacity
                    onPress={handleShareList}
                    style={{ padding: 4 }}
                  >
                    <Share size={18} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
        </View>
      )}



      {/* Places List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={DarkTheme.colors.bangkok.gold}
          />
        }
      >
        {sortedPlaces.length === 0 ? (
          <EmptyState
            title="No Places Yet"
            description="Start building your list by adding some amazing places!"
            primaryAction={isEditable ? {
              title: "Add Place",
              onPress: handleAddPlace
            } : undefined}
          />
        ) : (
          <View style={{ paddingVertical: Spacing.md, gap: Spacing.sm }}>
            {sortedPlaces.map((listPlace, index) => (
              <View key={`${listPlace.place_id}-${index}`} style={{ position: 'relative' }}>
                <PlaceCard
                  googlePlaceId={listPlace.place_id}
                  place={listPlace.place}
                  name={listPlace.place.name}
                  address={listPlace.place.formatted_address}
                  distance=""
                  onCheckIn={handleCheckIn}
                  onPress={() => handlePlacePress(listPlace.place_id, listPlace.place.name)}
                  showCheckInButton={false}
                />
                
                {/* Remove button for editable lists */}
                {isEditable && (
                  <TouchableOpacity
                    onPress={() => handleRemovePlace(listPlace.place_id, listPlace.place.name)}
                    style={{
                      position: 'absolute',
                      top: Spacing.sm,
                      right: Spacing.sm,
                      backgroundColor: DarkTheme.colors.status.error + '20',
                      padding: Spacing.xs,
                      borderRadius: DarkTheme.borderRadius.sm,
                    }}
                  >
                    <Trash2 size={16} color={DarkTheme.colors.status.error} strokeWidth={2} />
                  </TouchableOpacity>
                )}
                
                
                {/* Notes preview */}
                {listPlace.notes && (
                  <View style={{
                    backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                    marginTop: Spacing.xs,
                    padding: Spacing.sm,
                    borderRadius: DarkTheme.borderRadius.sm,
                  }}>
                    <SecondaryText style={{ fontSize: 12, fontStyle: 'italic' }}>
                      "{listPlace.notes}"
                    </SecondaryText>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: DarkTheme.colors.semantic.systemBackground,
            borderTopLeftRadius: DarkTheme.borderRadius.lg,
            borderTopRightRadius: DarkTheme.borderRadius.lg,
            paddingTop: Spacing.lg,
            paddingBottom: Spacing.xl,
          }}>
            <View style={{
              alignItems: 'center',
              marginBottom: Spacing.lg,
              paddingHorizontal: Spacing.lg,
            }}>
              <Title3>Sort Places</Title3>
            </View>
            
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
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
                  backgroundColor: sortBy === option.key 
                    ? DarkTheme.colors.bangkok.gold + '20' 
                    : 'transparent',
                }}
              >
                <option.icon 
                  size={20} 
                  color={sortBy === option.key ? DarkTheme.colors.bangkok.gold : DarkTheme.colors.semantic.secondaryLabel}
                  strokeWidth={2} 
                />
                <Body style={{ 
                  marginLeft: Spacing.sm,
                  color: sortBy === option.key ? DarkTheme.colors.bangkok.gold : DarkTheme.colors.semantic.label
                }}>
                  {option.label}
                </Body>
                {sortBy === option.key && (
                  <View style={{ marginLeft: 'auto' }}>
                    <CheckCircle size={20} color={DarkTheme.colors.bangkok.gold} strokeWidth={2} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              onPress={() => setShowSortModal(false)}
              style={{
                alignItems: 'center',
                marginTop: Spacing.lg,
                paddingHorizontal: Spacing.lg,
              }}
            >
              <SecondaryText>Cancel</SecondaryText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}