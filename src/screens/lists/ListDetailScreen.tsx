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
  Animated,
  PanResponder
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
  Target,
  Utensils,
  Camera,
  Music,
  ShoppingBag,
  Plane,
  Home,
  Users,
  Book,
  Gamepad2,
  Dumbbell,
  Sparkles
} from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
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
import { useAuth } from '../../services/auth-context';
import { 
  enhancedListsService, 
  ListWithPlaces, 
  EnrichedListPlace,
  EnhancedPlace,
  ListError,
  PlaceError 
} from '../../services/listsService';
import { ListsCache } from '../../services/listsCache';
import { ListDetailsCache } from '../../services/listDetailsCache';
import { checkInUtils, ThumbsRating } from '../../services/checkInsService';
import { userRatingsService, UserRatingType, UserPlaceRating } from '../../services/userRatingsService';
import Toast from '../../components/ui/Toast';
import type { ListsStackScreenProps } from '../../navigation/types';
import { 
  Swipeable,
  GestureHandlerRootView 
} from 'react-native-gesture-handler';

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
  const [userRatings, setUserRatings] = useState<Record<string, UserPlaceRating>>({});
  
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
  
        // Only reload if cache is invalid or missing
        ListDetailsCache.hasCache(listId, user.id).then(hasValidCache => {
          if (!hasValidCache) {
            console.log(`No valid cache for list ${listId}, reloading...`);
            loadListData();
          } else {
            // Using cached list data
          }
        });
      }
    }, [user, listId])
  );

  const loadListData = async (forceRefresh = false) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Try to load from cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = await ListDetailsCache.getCachedListDetails(listId, user.id);
        if (cachedData) {
      
          setList(cachedData.list);
          setEditedName(cachedData.list.name);
          setEditedDescription(cachedData.list.description || '');
          setIsPublic(cachedData.list.visibility === 'public');
          setUserRatings(cachedData.userRatings);
          setLoading(false);
          return;
        }
      }
      
      // Load fresh data from API
  
      
      // Add timeout for slow connections
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      
      const dataPromise = enhancedListsService.getUserLists(user.id);
      
      const lists = await Promise.race([dataPromise, timeoutPromise]) as any;
      const currentList = lists.find((l: any) => l.id === listId);
      
      if (currentList) {
        setList(currentList);
        setEditedName(currentList.name);
        setEditedDescription(currentList.description || '');
        setIsPublic(currentList.visibility === 'public');
        
        // Load user ratings for places in this list
        const ratingsMap: Record<string, UserPlaceRating> = {};
        for (const listPlace of currentList.places) {
          const rating = await userRatingsService.getUserRating(user.id, listPlace.place.id);
          if (rating) {
            ratingsMap[listPlace.place.id] = rating;
          }
        }
        setUserRatings(ratingsMap);
        
        // Save to cache
        await ListDetailsCache.saveListDetails(listId, currentList, ratingsMap, user.id);
      } else {
        Alert.alert('Error', 'List not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading list:', error);
      if (error instanceof Error && error.message === 'Request timeout') {
        Alert.alert(
          'Slow Connection', 
          'Loading is taking longer than usual. Please check your internet connection and try again.',
          [
            { text: 'Retry', onPress: () => loadListData() },
            { text: 'Go Back', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load list');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadListData(true); // Force refresh from API
    setRefreshing(false);
  };

  const handleSaveEdit = async () => {
    if (!list || !user?.id) return;
    
    try {
      await enhancedListsService.updateList(list.id, {
        name: editedName.trim(),
        description: editedDescription.trim(),
        visibility: isPublic ? 'public' : 'private',
      });
      
      // Invalidate caches since list was updated
      if (user?.id) {
        await ListsCache.invalidateCache();
        await ListDetailsCache.invalidateListCache(list.id);
      }
      
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
              
              // Invalidate caches since list was deleted
              if (user?.id) {
                await ListsCache.invalidateCache();
                await ListDetailsCache.invalidateListCache(list.id);
              }
              
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
              
              // Update caches optimistically since a place was removed
              if (user?.id) {
                await ListsCache.invalidateCache();
                await ListDetailsCache.removePlaceFromCache(list.id, placeId, user.id);
              }
              
              await loadListData();
              showToast(`"${placeName}" removed from list`, 'success');
            } catch (error) {
              console.error('Error removing place:', error);
              showToast('Failed to remove place', 'error');
            }
          }
        }
      ]
    );
  };

  const handleUpdatePlaceRating = async (placeId: string, rating: UserRatingType | null) => {
    if (!user?.id) return;
    
    try {
      if (rating) {
        // Set the rating
        await userRatingsService.setUserRating(user.id, placeId, rating);
      } else {
        // Remove the rating
        await userRatingsService.removeUserRating(user.id, placeId);
      }
      
      // Update local state and cache optimistically
      const newRatings = { ...userRatings };
      let newRating: UserPlaceRating | null = null;
      
      if (rating) {
        newRating = {
          id: '', // Will be set by the service
          user_id: user.id,
          place_id: placeId,
          rating_type: rating,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        newRatings[placeId] = newRating;
      } else {
        delete newRatings[placeId];
      }
      
      setUserRatings(newRatings);
      
      // Update cache optimistically
      if (list?.id) {
        await ListDetailsCache.updateRatingInCache(list.id, placeId, newRating, user.id);
      }
    } catch (error) {
      console.error('Error updating place rating:', error);
      Alert.alert('Error', 'Failed to update rating');
    }
  };

  const handleNavigateToPlace = (place: EnrichedListPlace) => {
    navigation.navigate('PlaceInListDetail', {
      placeId: place.place.id,
      listId: listId,
      listName: list?.name || initialListName
    });
  };

  const handleAddPlaces = () => {
    navigation.navigate('AddPlaceToList', {
      listId: listId,
      listName: list?.name || initialListName,
    });
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
      case 'star': return Star;
      case 'sparkles': return Sparkles;
      case 'utensils': return Utensils;
      case 'camera': return Camera;
      case 'music': return Music;
      case 'shopping-bag': return ShoppingBag;
      case 'plane': return Plane;
      case 'home': return Home;
      case 'users': return Users;
      case 'book': return Book;
      case 'gamepad-2': return Gamepad2;
      case 'dumbbell': return Dumbbell;
      case 'clock': return Clock;
      case 'trending-up': return TrendingUp;
      case 'map-pin': return MapPin;
      default: return MapPin;
    }
  };

  // Utility function to abbreviate Bangkok addresses
  const abbreviateAddress = (address: string): string => {
    if (!address) return '';
    
    // Special handling for building/mall addresses with floor information
    // Pattern: "BuildingName Floor/Market Floor [street number] Soi/Road..."
    const buildingFloorPattern = /^([^,]+(?:Market Floor|Floor|Mall|Plaza|Center))\s+(\d+\s+(?:Soi|Thanon|Road)[^,]*)/i;
    const buildingFloorMatch = address.match(buildingFloorPattern);
    
    if (buildingFloorMatch) {
      const buildingInfo = buildingFloorMatch[1].trim();
      const streetInfo = buildingFloorMatch[2].trim();
      
      // Clean up the building info
      const cleanBuildingInfo = buildingInfo
        .replace(/\bMarket Floor\b/g, 'Market Floor')
        .replace(/\bFloor\b/g, 'Floor');
        
      // Clean up the street info and add Bangkok
      const cleanStreetInfo = streetInfo
        .replace(/\bSoi\b/g, 'Soi')
        .replace(/\bThanon\b/g, 'Rd')
        .replace(/\bRoad\b/g, 'Rd');
      
      return `${cleanBuildingInfo}\n${cleanStreetInfo}, Bangkok`;
    }
    
    // Common Bangkok abbreviations for regular addresses
    let abbreviated = address
      .replace(/Bangkok \d{5}, Thailand$/, 'Bangkok') // Remove postal code and Thailand
      .replace(/, Bangkok Metropolis,.*$/, ', Bangkok') // Remove "Bangkok Metropolis" suffix
      .replace(/, Krung Thep Maha Nakhon.*$/, ', Bangkok') // Replace Thai name with Bangkok
      .replace(/\bRoad\b/g, 'Rd') // Abbreviate Road
      .replace(/\bStreet\b/g, 'St') // Abbreviate Street
      .replace(/\bSubdistrict\b/g, '') // Remove Subdistrict
      .replace(/\bDistrict\b/g, '') // Remove District
      .replace(/\bBangkok \d{5}\b/g, 'Bangkok') // Remove postal codes
      .replace(/,\s*,/g, ',') // Remove double commas
      .replace(/^,\s*|,\s*$/g, ''); // Remove leading/trailing commas
    
    // If still too long, take first part + last part
    if (abbreviated.length > 50) {
      const parts = abbreviated.split(',').map(p => p.trim());
      if (parts.length > 2) {
        abbreviated = `${parts[0]}, ${parts[parts.length - 1]}`;
      }
    }
    
    return abbreviated;
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                    setIsPublic(list.visibility === 'public');
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

                {list.visibility === 'public' && (
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
                }}>
                  <TouchableOpacity
                    onPress={handleShare}
                    style={{
                      padding: Spacing.sm,
                      backgroundColor: 'transparent',
                      borderRadius: 8,
                      marginRight: Spacing.sm,
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
                  userRatings={userRatings}
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

        {/* Toast Notification */}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// Place Card Component
interface PlaceCardProps {
  listPlace: EnrichedListPlace;
  userRatings: Record<string, UserPlaceRating>;
  onRemove: () => void;
  onRatingChange: (rating: UserRatingType | null) => void;
  onViewDetails: () => void;
  onGetDirections: () => void;
  onCheckIn: () => void;
}

function PlaceCard({ 
  listPlace, 
  userRatings,
  onRemove, 
  onRatingChange, 
  onViewDetails, 
  onGetDirections, 
  onCheckIn 
}: PlaceCardProps) {
  const { place } = listPlace;
  const hasVisited = (listPlace.visit_count || 0) > 0;
  
  // Get user rating from the ratings map
  const userRating = userRatings[place.id];
  const currentRating = userRating?.rating_type;

  // Enhanced category icon function that works with stored place data
  const getCategoryIconForPlace = (place: EnhancedPlace): string => {
    // First, try to use the full google_types array if available (best option)
    if (place.google_types && place.google_types.length > 0) {
      return checkInUtils.getCategoryIcon(undefined, place.google_types, place.name) || '📍';
    }
    
    // Fallback to primary_type if available
    if (place.primary_type) {
      return checkInUtils.getCategoryIcon(place.primary_type, undefined, place.name) || '📍';
    }
    
    // Legacy fallback: map place_type to appropriate categories
    const placeType = place.place_type?.toLowerCase();
    
    if (!placeType) {
      return '📍'; // Default pin for unknown types
    }
    
    // Map common place types to appropriate categories
    if (placeType.includes('restaurant') || placeType.includes('food') || placeType.includes('meal_takeaway')) {
      return checkInUtils.getCategoryIcon(undefined, ['restaurant'], place.name);
    }
    if (placeType.includes('cafe') || placeType.includes('coffee')) {
      return checkInUtils.getCategoryIcon(undefined, ['cafe'], place.name);
    }
    if (placeType.includes('shopping') || placeType.includes('store') || placeType.includes('clothing_store') || placeType.includes('department_store')) {
      return checkInUtils.getCategoryIcon(undefined, ['shopping_mall'], place.name);
    }
    if (placeType.includes('hotel') || placeType.includes('lodging')) {
      return checkInUtils.getCategoryIcon(undefined, ['lodging'], place.name);
    }
    if (placeType.includes('hospital') || placeType.includes('pharmacy') || placeType.includes('doctor')) {
      return checkInUtils.getCategoryIcon(undefined, ['hospital'], place.name);
    }
    if (placeType.includes('gas_station')) {
      return checkInUtils.getCategoryIcon(undefined, ['gas_station'], place.name);
    }
    if (placeType.includes('bank') || placeType.includes('atm') || placeType.includes('finance')) {
      return checkInUtils.getCategoryIcon(undefined, ['bank'], place.name);
    }
    if (placeType.includes('gym') || placeType.includes('spa') || placeType.includes('beauty_salon')) {
      return checkInUtils.getCategoryIcon(undefined, ['gym'], place.name);
    }
    if (placeType.includes('tourist_attraction') || placeType.includes('museum') || placeType.includes('art_gallery')) {
      return checkInUtils.getCategoryIcon(undefined, ['tourist_attraction'], place.name);
    }
    if (placeType.includes('park') || placeType.includes('campground')) {
      return checkInUtils.getCategoryIcon(undefined, ['park'], place.name);
    }
    if (placeType.includes('school') || placeType.includes('university') || placeType.includes('library')) {
      return checkInUtils.getCategoryIcon(undefined, ['school'], place.name);
    }
    if (placeType.includes('church') || placeType.includes('temple') || placeType.includes('hindu_temple') || placeType.includes('mosque')) {
      return checkInUtils.getCategoryIcon(undefined, ['church'], place.name);
    }
    if (placeType.includes('night_club') || placeType.includes('bar') || placeType.includes('liquor_store')) {
      return checkInUtils.getCategoryIcon(undefined, ['night_club'], place.name);
    }
    if (placeType.includes('movie_theater') || placeType.includes('amusement_park')) {
      return checkInUtils.getCategoryIcon(undefined, ['movie_theater'], place.name);
    }
    if (placeType.includes('subway_station') || placeType.includes('train_station') || placeType.includes('transit_station')) {
      return checkInUtils.getCategoryIcon(undefined, ['subway_station'], place.name);
    }
    if (placeType.includes('car_repair') || placeType.includes('car_wash')) {
      return checkInUtils.getCategoryIcon(undefined, ['car_repair'], place.name);
    }
    if (placeType.includes('supermarket') || placeType.includes('grocery')) {
      return checkInUtils.getCategoryIcon(undefined, ['supermarket'], place.name);
    }
    if (placeType.includes('establishment') || placeType.includes('point_of_interest')) {
      return '📍'; // Generic pin for broad categories
    }
    
    // Final fallback to the original function with place_type
    return checkInUtils.getCategoryIcon(place.place_type, undefined, place.name) || '📍';
  };

  // Utility function to abbreviate Bangkok addresses
  const abbreviateAddress = (address: string): string => {
    if (!address) return '';
    
    // Special handling for building/mall addresses with floor information
    // Pattern: "BuildingName Floor/Market Floor [street number] Soi/Road..."
    const buildingFloorPattern = /^([^,]+(?:Market Floor|Floor|Mall|Plaza|Center))\s+(\d+\s+(?:Soi|Thanon|Road)[^,]*)/i;
    const buildingFloorMatch = address.match(buildingFloorPattern);
    
    if (buildingFloorMatch) {
      const buildingInfo = buildingFloorMatch[1].trim();
      const streetInfo = buildingFloorMatch[2].trim();
      
      // Clean up the building info
      const cleanBuildingInfo = buildingInfo
        .replace(/\bMarket Floor\b/g, 'Market Floor')
        .replace(/\bFloor\b/g, 'Floor');
        
      // Clean up the street info and add Bangkok
      const cleanStreetInfo = streetInfo
        .replace(/\bSoi\b/g, 'Soi')
        .replace(/\bThanon\b/g, 'Rd')
        .replace(/\bRoad\b/g, 'Rd');
      
      return `${cleanBuildingInfo}\n${cleanStreetInfo}, Bangkok`;
    }
    
    // Common Bangkok abbreviations for regular addresses
    let abbreviated = address
      .replace(/Bangkok \d{5}, Thailand$/, 'Bangkok') // Remove postal code and Thailand
      .replace(/, Bangkok Metropolis,.*$/, ', Bangkok') // Remove "Bangkok Metropolis" suffix
      .replace(/, Krung Thep Maha Nakhon.*$/, ', Bangkok') // Replace Thai name with Bangkok
      .replace(/\bRoad\b/g, 'Rd') // Abbreviate Road
      .replace(/\bStreet\b/g, 'St') // Abbreviate Street
      .replace(/\bSubdistrict\b/g, '') // Remove Subdistrict
      .replace(/\bDistrict\b/g, '') // Remove District
      .replace(/\bBangkok \d{5}\b/g, 'Bangkok') // Remove postal codes
      .replace(/,\s*,/g, ',') // Remove double commas
      .replace(/^,\s*|,\s*$/g, ''); // Remove leading/trailing commas
    
    // If still too long, take first part + last part
    if (abbreviated.length > 50) {
      const parts = abbreviated.split(',').map(p => p.trim());
      if (parts.length > 2) {
        abbreviated = `${parts[0]}, ${parts[parts.length - 1]}`;
      }
    }
    
    return abbreviated;
  };

  const renderThumbsRating = (currentRating: UserRatingType | null, onPress: (rating: UserRatingType | null) => void) => {
    const ratings: { rating: UserRatingType; emoji: string }[] = [
      { rating: 'thumbs_down', emoji: '👎' },
      { rating: 'neutral', emoji: '😐' },
      { rating: 'thumbs_up', emoji: '👍' },
    ];

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {ratings.map(({ rating, emoji }) => {
          const isSelected = currentRating === rating;
          return (
            <TouchableOpacity
              key={rating}
              onPress={() => onPress(isSelected ? null : rating)}
              style={{
                paddingHorizontal: Spacing.xs,
                paddingVertical: 4,
                marginRight: Spacing.xs,
                borderRadius: 4,
                backgroundColor: isSelected 
                  ? checkInUtils.getRatingColor(rating) + '20' 
                  : 'transparent',
                borderWidth: isSelected ? 1 : 0,
                borderColor: isSelected ? checkInUtils.getRatingColor(rating) : 'transparent',
              }}
            >
              <Typography style={{ fontSize: 14 }}>
                {emoji}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render the delete action for swipe
  const renderRightAction = () => {
    return (
      <TouchableOpacity
        onPress={onRemove}
        style={{
          backgroundColor: Colors.semantic.error,
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
          borderRadius: 12,
          marginBottom: Spacing.sm,
        }}
      >
        <Trash2 
          size={24} 
          color="white"
          strokeWidth={2}
        />
        <Typography style={{ 
          color: 'white', 
          fontSize: 12, 
          marginTop: 4,
          fontWeight: '600'
        }}>
          Delete
        </Typography>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightAction}>
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
          }}>
            {/* Category Icon */}
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.semantic.backgroundTertiary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: Spacing.md,
              marginTop: 2, // Slight offset to align with text
            }}>
              <Typography variant="body" style={{ fontSize: 20 }}>
                {getCategoryIconForPlace(place) || '📍'}
              </Typography>
            </View>

            <View style={{ flex: 1 }}>
              {/* Place name and visited indicator */}
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
                  {place.name || 'Unknown Place'}
                </Typography>
                {hasVisited && (
                  <CheckCircle 
                    size={Spacing.iconSize.sm} 
                    color={Colors.accent.green}
                    strokeWidth={2}
                  />
                )}
              </View>

              {/* Address with abbreviation */}
              {place.address && (
                <Body color="secondary" style={{ 
                  marginBottom: Spacing.xs,
                  fontSize: 13,
                }}>
                  {abbreviateAddress(place.address)}
                </Body>
              )}

              {/* Your rating - only show if user has rated */}
              {currentRating && (
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
                  <View style={{
                    paddingHorizontal: Spacing.xs,
                    paddingVertical: 4,
                    borderRadius: 4,
                    backgroundColor: checkInUtils.getRatingColor(currentRating) + '20',
                    borderWidth: 1,
                    borderColor: checkInUtils.getRatingColor(currentRating),
                  }}>
                    <Typography style={{ fontSize: 14 }}>
                      {currentRating === 'thumbs_up' ? '👍' : currentRating === 'thumbs_down' ? '👎' : '😐'}
                    </Typography>
                  </View>
                </View>
              )}

              {/* Notes - enhanced styling to distinguish from address */}
              {listPlace.notes && (
                <View style={{
                  backgroundColor: Colors.semantic.backgroundSecondary,
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: Spacing.xs,
                  borderRadius: 8,
                  marginTop: Spacing.xs,
                  marginBottom: Spacing.xs,
                  borderLeftWidth: 3,
                  borderLeftColor: Colors.accent.yellow + '60',
                }}>
                  <Body style={{ 
                    fontSize: 13,
                    fontStyle: 'italic',
                    color: Colors.semantic.textSecondary,
                    lineHeight: 18,
                  }}>
                    "{listPlace.notes}"
                  </Body>
                </View>
              )}
            </View>
          </View>

          {/* Bottom row: Added date + Actions */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: Spacing.xs,
            paddingTop: Spacing.xs,
            borderTopWidth: 1,
            borderTopColor: Colors.semantic.borderPrimary + '30',
          }}>
            {/* De-emphasized added date */}
            <Typography style={{ 
              fontSize: 11,
              color: Colors.semantic.textTertiary,
            }}>
              Added {new Date(listPlace.added_at).toLocaleDateString()}
            </Typography>

            {/* Action buttons */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
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
                  marginRight: Spacing.sm,
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
          </View>
        </ElevatedCard>
      </TouchableOpacity>
    </Swipeable>
  );
} 