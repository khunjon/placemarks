import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  ScrollView,
  FlatList,
  Text, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  Modal,
  Share as RNShare,
  ListRenderItem
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
  CheckCircle,
  Calendar,
  TrendingUp,
  Star
} from '../../components/icons';
import { DarkTheme } from '../../constants/theme';
import { Spacing } from '../../constants/Spacing';
import { 
  Typography, 
  Title1,
  Title3, 
  Body, 
  SecondaryText,
  Card,
  ElevatedCard,
  LoadingState,
  EmptyState
} from '../../components/common';
import { PlaceCard, SwipeablePlaceCard } from '../../components/places';
import { useAuth } from '../../services/auth-context';
import { 
  listsService, 
  ListWithPlaces, 
  EnrichedListPlace,
  ListError
} from '../../services/listsService';
import { userRatingsService, UserRatingType } from '../../services/userRatingsService';
import { checkInsService } from '../../services/checkInsService';
import { cacheManager } from '../../services/cacheManager';
import { photoService } from '../../services/photoService';
import { UserPlacePhoto } from '../../types';
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
  { key: 'name', label: 'Name', icon: SortAsc },
  { key: 'date_added', label: 'Date Added', icon: Calendar },
  { key: 'visit_count', label: 'Visit Count', icon: TrendingUp },
];

export default function ListDetailScreen({ navigation, route }: ListDetailScreenProps) {
  const { listId, listName: initialListName, listType, isEditable } = route.params;
  const { user } = useAuth();
  
  // Determine effective editability - curated lists are never editable
  const effectiveIsEditable = listType !== 'curated' && (isEditable !== false);
  
  // Track initial mount to prevent duplicate loading
  const isInitialMount = useRef(true);
  
  // State
  const [list, setList] = useState<ListWithPlaces | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showSortModal, setShowSortModal] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<string, UserRatingType>>({});
  const [placePhotos, setPlacePhotos] = useState<Map<string, UserPlacePhoto>>(new Map());
  
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
        // Only refresh if we don't have recent cached data
        cacheManager.listDetails.hasCache(listId, user.id).then(hasCache => {
          if (!hasCache) {
            // No cache, do a normal load
            loadListData();
          } else {
            // We have cache, just do a background refresh
            loadListDataInBackground();
          }
        });
      }
    }, [user, listId])
  );

  /**
   * Load list data with caching - optimized to eliminate redundant API calls
   */
  const loadListData = async (forceRefresh = false) => {
    if (!user?.id) return;
    
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = await cacheManager.listDetails.get(listId, user.id);
        if (cached) {
          // Immediately show cached data
          setList(cached.list);
          setUserRatings(Object.fromEntries(
            Object.entries(cached.userRatings).map(([placeId, rating]) => [placeId, rating.rating_type])
          ));
          
          // Also load photos for cached data
          const googlePlaceIds = cached.list.places.map(p => p.place_id);
          photoService.getPrimaryPhotosForPlaces(googlePlaceIds).then(photosResult => {
            if (photosResult.data) {
              setPlacePhotos(photosResult.data);
            }
          });
          
          setLoading(false);
          
          // Load fresh data in background without showing loading state
          loadListDataInBackground();
          return;
        }
      }
      
      // No cache or force refresh - show loading and fetch fresh data
      setLoading(true);
      await loadFreshListData();
    } catch (error) {
      console.error('Error loading list:', error);
      showToast('Failed to load list', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load fresh list data and cache it - optimized single API call
   */
  const loadFreshListData = async (): Promise<void> => {
    try {
      // Load list with places in single API call
      const listWithPlaces = await loadListWithPlaces();
      
      if (!listWithPlaces) {
        Alert.alert('Error', 'List not found');
        navigation.goBack();
        return;
      }
      
      // Extract Google Place IDs for ratings lookup
      const googlePlaceIds = listWithPlaces.places.map(p => p.place_id);
      
      // Get user ratings and photos for all places in parallel
      const [ratingsMap, photosResult] = await Promise.all([
        userRatingsService.getUserRatingsForPlaces(user!.id, googlePlaceIds),
        photoService.getPrimaryPhotosForPlaces(googlePlaceIds)
      ]);
      
      // Convert ratings to record format
      const userRatingsData: Record<string, UserRatingType> = {};
      ratingsMap.forEach((rating, googlePlaceId) => {
        userRatingsData[googlePlaceId] = rating;
      });
      
      // Set photos map
      if (photosResult.data) {
        setPlacePhotos(photosResult.data);
      }
      
      // Update state
      setList(listWithPlaces);
      setUserRatings(userRatingsData);
      
      // Cache the loaded data
      if (user) {
        await cacheManager.listDetails.store(listId, listWithPlaces, userRatingsData, user.id);
      }
    } catch (error) {
      console.error('Error loading fresh list data:', error);
      throw error;
    }
  };

  /**
   * Load fresh data in background without affecting UI loading state
   */
  const loadListDataInBackground = async (): Promise<void> => {
    try {
      await loadFreshListData();
    } catch (error) {
      console.warn('Background list refresh failed:', error);
      // Don't show error to user for background refresh failures
    }
  };

  /**
   * Load list with places using the optimized service
   */
  const loadListWithPlaces = async (): Promise<ListWithPlaces | null> => {
    if (__DEV__) {
      console.log('[ListDetailScreen] Loading list with optimized method');
    }
    const startTime = Date.now();
    
    let result: ListWithPlaces | null = null;
    
    if (listType === 'curated') {
      // Load curated list with optimized method
      result = await listsService.getCuratedListDetailsOptimized(listId);
    } else {
      // Load user list with optimized method
      result = await listsService.getListDetailsOptimized(listId, user!.id);
    }
    
    const elapsed = Date.now() - startTime;
    if (__DEV__) {
      console.log(`[ListDetailScreen] List loaded in ${elapsed}ms`);
    }
    
    return result;
  };

  /**
   * Handle refresh - force refresh from API and update cache
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadListData(true);
    setRefreshing(false);
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
              
              // Clear cache for this list
              if (user?.id) {
                await cacheManager.listDetails.clear(listId);
              }
              
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
    // Store original list for rollback
    const originalList = list;
    
    // Optimistic update - remove immediately
    if (list) {
      const updatedList = {
        ...list,
        places: list.places.filter(p => p.place_id !== googlePlaceId),
        place_count: list.place_count - 1
      };
      setList(updatedList);
      showToast('Removing place...');
    }
    
    try {
      await listsService.removePlaceFromList(listId, googlePlaceId);
      showToast('Place removed from list');
      
      // Update cache with optimistic update
      if (user?.id) {
        await cacheManager.listDetails.removePlace(listId, googlePlaceId, user.id);
      }
    } catch (error) {
      console.error('Error removing place:', error);
      // Rollback on error
      if (originalList) {
        setList(originalList);
      }
      showToast('Failed to remove place', 'error');
    }
  };

  /**
   * Handle adding place to Want to Go list
   */
  const handleAddToWantToGo = async (googlePlaceId: string, placeName: string) => {
    if (!user?.id) {
      showToast('Please sign in to add places to Want to Go', 'error');
      return;
    }

    // Show immediate feedback
    showToast('Adding to Want to Go...');

    try {
      // Get user's Want to Go list
      const wantToGoList = await listsService.getWantToGoList(user.id);
      
      if (!wantToGoList) {
        showToast('Could not find Want to Go list', 'error');
        return;
      }

      // Check if place is already in Want to Go list
      const isAlreadyInList = wantToGoList.places?.some(p => p.place_id === googlePlaceId);
      
      if (isAlreadyInList) {
        showToast(`"${placeName}" is already in your Want to Go list`);
        return;
      }

      // Find the place data from current list
      const placeToAdd = list?.places.find(p => p.place_id === googlePlaceId);
      
      if (!placeToAdd) {
        showToast('Could not find place data', 'error');
        return;
      }

      // Add place to Want to Go list
      await listsService.addPlaceFromSuggestion(
        wantToGoList.id,
        {
          place_id: googlePlaceId,
          description: placeToAdd.place?.formatted_address || '',
          main_text: placeToAdd.place?.name || '',
          secondary_text: placeToAdd.place?.formatted_address || '',
          types: placeToAdd.place.types || [],
        },
        { }
      );

      showToast(`"${placeName}" added to Want to Go list`, 'success');
    } catch (error) {
      console.error('Error adding place to Want to Go:', error);
      showToast('Failed to add place to Want to Go list', 'error');
    }
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
   * Navigate to edit screen
   */
  const handleEditList = () => {
    if (!list) return;
    
    navigation.navigate('EditList', {
      listId: list.id,
      listName: list.name,
      listDescription: list.description || '',
      listIcon: list.icon || 'heart',
      listType: list.list_type || 'general',
      listVisibility: (list.visibility === 'curated' ? 'private' : list.visibility) || 'private',
    });
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
        return places.sort((a, b) => {
          const nameA = a.place?.name || '';
          const nameB = b.place?.name || '';
          return nameA.localeCompare(nameB);
        });
      
      default:
        return places;
    }
  };

  /**
   * Render individual place item for FlatList
   */
  const renderPlaceItem: ListRenderItem<EnrichedListPlace> = useCallback(({ item: listPlace }) => {
    const photo = placePhotos.get(listPlace.place_id);
    return (
      <SwipeablePlaceCard
        googlePlaceId={listPlace.place_id}
        place={listPlace.place}
        name={listPlace.place?.name || 'Unknown Place'}
        address={listPlace.place?.formatted_address || ''}
        distance=""
        onCheckIn={handleCheckIn}
        onPress={() => handlePlacePress(listPlace.place_id, listPlace.place?.name || 'Unknown Place')}
        showCheckInButton={false}
        notes={listPlace.userNote?.notes}
        photoUrl={photo?.thumbnail_url || photo?.photo_url} // Use thumbnail if available, fallback to original
        onDelete={handleRemovePlace}
        onAddToWantToGo={handleAddToWantToGo}
        enableDelete={effectiveIsEditable}
        enableAddToWantToGo={list?.default_list_type !== 'want_to_go'}
      />
    );
  }, [effectiveIsEditable, list?.default_list_type, handleCheckIn, handlePlacePress, handleRemovePlace, handleAddToWantToGo, placePhotos]);

  // Only show loading state if we have no data AND we're loading (first time load)
  if (loading && !list) {
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

  // Determine permissions for Add and Edit buttons
  // Can add places to all editable lists (including Favorites and Want-to-go)
  const canAddPlaces = effectiveIsEditable;
  
  // Can edit list details only if not curated, favorites, or want_to_go
  const canEditList = effectiveIsEditable && 
    list?.default_list_type !== 'favorites' && 
    list?.list_type !== 'want_to_go';

  return (
    <SafeAreaView 
      style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }} 
      edges={['left', 'right', 'bottom']}
    >
      {/* Sticky Header - Progress bar for all lists */}
      <View style={{
          backgroundColor: DarkTheme.colors.semantic.systemBackground,
          paddingHorizontal: Spacing.lg,
          paddingTop: 8,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: DarkTheme.colors.semantic.separator,
        }}>
          {/* Display Mode - Progress Bar */}
          <View>
            {/* Progress Bar */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <TouchableOpacity
                onPress={() => setShowSortModal(true)}
                style={{ 
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                  borderRadius: DarkTheme.borderRadius.sm,
                  gap: 6
                }}
              >
                <SortAsc size={16} color={DarkTheme.colors.semantic.label} strokeWidth={2} />
                <Body style={{ fontSize: 14, fontWeight: '500' }}>
                  {sortOptions.find(opt => opt.key === sortBy)?.label || 'Date Added'}
                </Body>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                {canAddPlaces && (
                  <TouchableOpacity
                    onPress={handleAddPlace}
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                      borderRadius: DarkTheme.borderRadius.sm,
                      gap: 6
                    }}
                  >
                    <Plus size={16} color={DarkTheme.colors.semantic.label} strokeWidth={2} />
                    <Body style={{ fontSize: 14, fontWeight: '500' }}>Add</Body>
                  </TouchableOpacity>
                )}
                
                {canEditList && (
                  <TouchableOpacity
                    onPress={handleEditList}
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                      borderRadius: DarkTheme.borderRadius.sm,
                      gap: 6
                    }}
                  >
                    <Edit3 size={16} color={DarkTheme.colors.semantic.label} strokeWidth={2} />
                    <Body style={{ fontSize: 14, fontWeight: '500' }}>Edit</Body>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
      </View>



      {/* Places List */}
      {sortedPlaces.length === 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: Spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={DarkTheme.colors.bangkok.gold}
            />
          }
        >
          <EmptyState
            title="No Places Yet"
            description="Start building your list by adding some amazing places!"
            primaryAction={canAddPlaces ? {
              title: "Add Place",
              onPress: handleAddPlace
            } : undefined}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={sortedPlaces}
          keyExtractor={(item, index) => `${item.place_id}-${index}`}
          renderItem={renderPlaceItem}
          contentContainerStyle={{ 
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.md
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={DarkTheme.colors.bangkok.gold}
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 100, // Approximate height of SwipeablePlaceCard
            offset: 100 * index + Spacing.sm * index,
            index,
          })}
        />
      )}

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
                {React.createElement(option.icon, {
                  size: 20,
                  color: sortBy === option.key ? DarkTheme.colors.bangkok.gold : DarkTheme.colors.semantic.secondaryLabel
                })}
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