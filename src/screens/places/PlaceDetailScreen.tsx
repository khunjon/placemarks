import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Text,
  Linking, 
  Dimensions,
  TextInput,
  Keyboard,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Pin, Star, ArrowLeft, Trophy, Eye, Heart, Clock, Phone, Globe, ExternalLink, CheckSquare, ThumbsUp, ThumbsDown, CheckCircle, X } from '../../components/icons';
import { DarkTheme } from '../../constants/theme';
import { Spacing } from '../../constants/Spacing';
import { 
  Typography, 
  Title1,
  Title2,
  Title3,
  Headline,
  Body, 
  SecondaryText,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  Card,
  ElevatedCard,
  LoadingState
} from '../../components/common';
import Toast from '../../components/ui/Toast';
import { PhotoGallery, PhotoUploadButton } from '../../components/places';

import { EnrichedPlace, UserPlacePhoto } from '../../types';
import { placesService } from '../../services/places';
import { checkInsService, CheckIn } from '../../services/checkInsService';
import { userRatingsService, UserRatingType } from '../../services/userRatingsService';
import { listsService, EnrichedListPlace } from '../../services/listsService';
import { userPlaceNotesService } from '../../services/userPlaceNotesService';
import { photoService } from '../../services/photoService';
import { useAuth } from '../../services/auth-context';
import { cacheManager } from '../../services/cacheManager';
import { RootStackParamList } from '../../types/navigation';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: screenWidth } = Dimensions.get('window');

type PlaceDetailScreenRouteProp = RouteProp<RootStackParamList, 'PlaceDetails'>;
type PlaceDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlaceDetails'>;

interface PlaceDetailScreenProps {
  route: PlaceDetailScreenRouteProp;
  navigation: PlaceDetailScreenNavigationProp;
}

export default function PlaceDetailScreen({ navigation, route }: PlaceDetailScreenProps) {
  // Handle both old format (googlePlaceId) and new format (placeId)
  const routeParams = route.params as any;
  const googlePlaceId = routeParams.googlePlaceId || routeParams.placeId;
  const placeName = routeParams.placeName || routeParams.listName || 'Loading...';
  const source = routeParams.source || 'list';
  const contextListId = routeParams.listId; // ID of the list user came from
  const contextListName = routeParams.listName; // Name of the list user came from
  
  // Defensive check for missing googlePlaceId
  if (!googlePlaceId) {
    console.error('PlaceDetailScreen: No googlePlaceId provided in route params:', routeParams);
  }
  
  const { user } = useAuth();
  
  // Track initial mount to prevent duplicate loading
  const isInitialMount = useRef(true);
  
  // Refs for keyboard handling
  const scrollViewRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);
  
  // State
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<EnrichedPlace | null>(null);
  const [userRating, setUserRating] = useState<UserRatingType | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [listsContainingPlace, setListsContainingPlace] = useState<(EnrichedListPlace & { list_name: string })[]>([]);
  const [userPhotos, setUserPhotos] = useState<UserPlacePhoto[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Single note state for the context list
  const [noteText, setNoteText] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [contextListPlace, setContextListPlace] = useState<(EnrichedListPlace & { list_name: string }) | null>(null);

  // Photo loading state
  const [showPhotos, setShowPhotos] = useState(false);

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
    if (user && googlePlaceId) {
      loadPlaceDetails();
    }
  }, [user, googlePlaceId]);

  // Refresh data when screen comes back into focus (but not on initial mount)
  useFocusEffect(
    React.useCallback(() => {
      // Skip the first focus effect call (initial mount)
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      if (user && googlePlaceId) {
        console.log('PlaceDetailScreen focused, checking cache...');
        // Only refresh if we don't have recent cached data
        cacheManager.placeDetails.hasCache(googlePlaceId, user.id).then(hasCache => {
          if (!hasCache) {
            // No cache, do a normal load
            loadPlaceDetails();
          } else {
            // We have cache, just do a background refresh
            loadPlaceDetailsInBackground();
          }
        });
      }
    }, [user, googlePlaceId])
  );

  // Keyboard listeners - simplified to just track keyboard height
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  /**
   * Load place details with caching - optimized to eliminate redundant API calls
   */
  const loadPlaceDetails = async (forceRefresh = false) => {
    if (!user?.id || !googlePlaceId) {
      console.error('Cannot load place details: missing user or googlePlaceId', { userId: user?.id, googlePlaceId });
      return;
    }
    
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = await cacheManager.placeDetails.get(googlePlaceId, user.id);
        if (cached) {
          console.log('PlaceDetailScreen: Using cached place details');
          // Immediately show cached data
          setPlace(cached.place);
          setUserRating(cached.userRating);
          setCheckIns(cached.checkIns);
          setListsContainingPlace(cached.listsContainingPlace);
          setUserPhotos(cached.userPhotos || []);
          
          // Initialize note from cached data
          // All lists should have the same userNote since it's user-specific
          const cachedUserNote = cached.listsContainingPlace.find(lp => lp.userNote)?.userNote;
          if (cachedUserNote) {
            setNoteText(cachedUserNote.notes || '');
          }
          
          // Set context list place if coming from a specific list
          if (cached.listsContainingPlace.length > 0) {
            if (contextListId) {
              const contextList = cached.listsContainingPlace.find(listPlace => listPlace.list_id === contextListId);
              if (contextList) {
                setContextListPlace(contextList);
              }
            } else {
              // If no context, use the first list
              setContextListPlace(cached.listsContainingPlace[0]);
            }
          }
          
          setLoading(false);
          
          // Load fresh data in background without showing loading state
          loadPlaceDetailsInBackground();
          return;
        }
      }
      
      // No cache or force refresh - show loading and fetch fresh data
      setLoading(true);
      await loadFreshPlaceDetails();
    } catch (error) {
      console.error('Error loading place details:', error);
      showToast('Failed to load place details', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load fresh place details and cache them - optimized parallel loading
   */
  const loadFreshPlaceDetails = async (): Promise<void> => {
    try {
      // Load all data in parallel - much simpler with Google Place IDs
      const [placeDetails, userRatingData, checkInsData, listsData, photosData, userNote] = await Promise.all([
        // Get full place details from Google Places API cache
        placesService.getPlaceDetails(googlePlaceId),
        
        // Get user's rating for this place
        userRatingsService.getUserRating(user!.id, googlePlaceId),
        
        // Get user's check-ins for this place
        checkInsService.getPlaceCheckIns(googlePlaceId, 10),
        
        // Get lists containing this place
        getListsContainingPlace(user!.id, googlePlaceId),
        
        // Get user photos for this place
        photoService.getPlacePhotos(googlePlaceId),
        
        // Get user's note for this place
        userPlaceNotesService.getNote(user!.id, googlePlaceId)
      ]);
      
      if (!placeDetails) {
        throw new Error('Place not found');
      }
      
      const userRating = userRatingData?.rating_type || null;
      const filteredCheckIns = checkInsData.filter(checkIn => checkIn.user_id === user!.id);
      const userPhotos = photosData.data || [];
      
      // Update state
      setPlace(placeDetails as any);
      setUserRating(userRating);
      setCheckIns(filteredCheckIns);
      setListsContainingPlace(listsData);
      setUserPhotos(userPhotos);
      
      // Initialize note text from user note
      if (userNote) {
        setNoteText(userNote.notes || '');
      }
      
      // Set context list place if coming from a specific list
      if (listsData.length > 0) {
        if (contextListId) {
          const contextList = listsData.find(listPlace => listPlace.list_id === contextListId);
          if (contextList) {
            setContextListPlace(contextList);
          }
        } else {
          // If no context, use the first list
          setContextListPlace(listsData[0]);
        }
      }
      
      // Cache the loaded data
      await cacheManager.placeDetails.store(
        googlePlaceId,
        placeDetails as any,
        userRating,
        filteredCheckIns,
        listsData,
        userPhotos,
        user!.id
      );
    } catch (error) {
      console.error('Error loading fresh place details:', error);
      throw error;
    }
  };

  /**
   * Load fresh data in background without affecting UI loading state
   */
  const loadPlaceDetailsInBackground = async (): Promise<void> => {
    try {
      await loadFreshPlaceDetails();
    } catch (error) {
      console.warn('Background place refresh failed:', error);
      // Don't show error to user for background refresh failures
    }
  };

  /**
   * Get lists that contain this place
   */
  const getListsContainingPlace = async (userId: string, googlePlaceId: string): Promise<(EnrichedListPlace & { list_name: string })[]> => {
    try {
      const userLists = await listsService.getUserListsWithPlaces(userId);
      const containingLists: (EnrichedListPlace & { list_name: string })[] = [];
      
      // Get the user's note for this place
      const userNote = await userPlaceNotesService.getNote(userId, googlePlaceId);
      
      userLists.forEach(list => {
        const placeInList = list.places.find(p => p.place_id === googlePlaceId);
        if (placeInList) {
          containingLists.push({
            ...placeInList,
            list_name: list.name,
            userNote: userNote || undefined
          });
        }
      });
      
      return containingLists;
    } catch (error) {
      console.error('Error getting lists containing place:', error);
      return [];
    }
  };

  /**
   * Handle user rating update with optimistic cache updates
   */
  const handleUpdateRating = async (ratingType: UserRatingType) => {
    if (!user?.id) return;
    
    try {
      // Optimistic update - update UI immediately
      setUserRating(ratingType);
      
      // Update cache immediately for instant feedback on future loads
      await cacheManager.placeDetails.updateRating(googlePlaceId, ratingType, user.id);
      
      // Make actual API call
      await userRatingsService.setUserRating(
        user.id,
        googlePlaceId,
        ratingType
      );
      
      showToast('Rating updated');
    } catch (error) {
      console.error('Error updating rating:', error);
      showToast('Failed to update rating', 'error');
      
      // Revert optimistic update on error
      await loadPlaceDetailsInBackground();
    }
  };

  /**
   * Handle clearing user rating
   */
  const handleClearRating = async () => {
    if (!user?.id) return;
    
    try {
      // Optimistic update - clear UI immediately
      setUserRating(null);
      
      // Update cache immediately for instant feedback on future loads
      await cacheManager.placeDetails.updateRating(googlePlaceId, null, user.id);
      
      // Make actual API call to remove rating
      await userRatingsService.removeUserRating(user.id, googlePlaceId);
      
      showToast('Rating cleared');
    } catch (error) {
      console.error('Error clearing rating:', error);
      showToast('Failed to clear rating', 'error');
      
      // Revert optimistic update on error
      await loadPlaceDetailsInBackground();
    }
  };

  /**
   * Handle check-in creation with optimistic cache updates
   */
  const handleCheckIn = async () => {
    if (!user?.id) return;
    
    try {
      await checkInsService.createCheckIn(user.id, {
        place_id: googlePlaceId, // Direct Google Place ID usage!
        rating: 'thumbs_up',
        comment: `Visited ${place?.name || placeName}`,
        photos: [],
        tags: []
      });
      
      showToast('Check-in created successfully');
      
      // Reload check-ins and update cache
      const updatedCheckIns = await checkInsService.getPlaceCheckIns(googlePlaceId, 10);
      const filteredCheckIns = updatedCheckIns.filter(checkIn => checkIn.user_id === user.id);
      
      setCheckIns(filteredCheckIns);
      
      // Update cache with new check-ins
      await cacheManager.placeDetails.updateCheckIns(googlePlaceId, filteredCheckIns, user.id);
    } catch (error) {
      console.error('Error creating check-in:', error);
      showToast('Failed to create check-in', 'error');
    }
  };

  /**
   * Handle opening directions
   */
  const handleGetDirections = () => {
    if (!place) return;
    
    // Use Google Place ID for most accurate directions
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name || 'Unknown Place')}&destination_place_id=${googlePlaceId}`;
    
    Linking.openURL(url).catch((error) => {
      console.error('Failed to open directions:', error);
      showToast('Unable to open directions', 'error');
    });
  };

  /**
   * Handle sharing place
   */
  const handleShare = () => {
    if (!place) return;
    
    const url = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`;
    
    // In a real app, you'd use React Native's Share API
    showToast('Share URL copied to clipboard');
  };

  /**
   * Handle note editing
   */
  const handleEditNote = () => {
    setIsEditingNote(true);
    
    // Focus the text input after a brief delay - let KeyboardAvoidingView handle positioning
    setTimeout(() => {
      noteInputRef.current?.focus();
    }, 100);
  };

  const handleSaveNote = async () => {
    if (!user?.id) return;
    
    try {
      const trimmedNote = noteText.trim();
      
      // Optimistic updates - update UI immediately
      setIsEditingNote(false);
      
      // Update all list places with the new note
      const updatedNote = trimmedNote ? {
        user_id: user.id,
        place_id: googlePlaceId,
        notes: trimmedNote,
        updated_at: new Date().toISOString()
      } : undefined;
      
      setListsContainingPlace(prev => 
        prev.map(listPlace => ({
          ...listPlace,
          userNote: updatedNote
        }))
      );
      
      // Make actual API call to save user-specific note
      await userPlaceNotesService.saveNote(user.id, googlePlaceId, trimmedNote);
      
      // Update cache immediately for instant feedback on future loads
      await cacheManager.placeDetails.updateNotes(
        googlePlaceId,
        '', // No specific list ID needed anymore
        trimmedNote,
        user.id
      );
      
      showToast(trimmedNote ? 'Note saved' : 'Note removed');
    } catch (error) {
      console.error('Error saving note:', error);
      showToast('Failed to save note', 'error');
      
      // Revert optimistic update on error
      await loadPlaceDetailsInBackground();
    }
  };

  const handleCancelNote = () => {
    // Reset to original note (now from userNote)
    const listWithNote = listsContainingPlace.find(lp => lp.userNote);
    const originalNote = listWithNote?.userNote?.notes || '';
    setNoteText(originalNote);
    setIsEditingNote(false);
  };

  /**
   * Format opening hours
   */
  const formatHours = (hours: any) => {
    if (!hours || !hours.weekday_text) return 'Hours not available';
    
    const today = new Date().getDay();
    const todayText = hours.weekday_text[today === 0 ? 6 : today - 1];
    return todayText || 'Hours not available';
  };

  /**
   * Render star rating
   */
  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          size={size}
          color={i < fullStars || (i === fullStars && hasHalfStar) ? DarkTheme.colors.bangkok.gold : DarkTheme.colors.semantic.tertiaryLabel}
        />
      );
    }
    
    return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
  };

  /**
   * Get price level display
   */
  const getPriceLevel = (level?: number) => {
    if (!level) return '';
    return '$'.repeat(Math.min(level, 4));
  };

  /**
   * Extract domain from URL
   */
  const extractDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }}>
        <LoadingState message="Loading place details..." />
      </SafeAreaView>
    );
  }

  if (!place) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg }}>
          <Body color="secondary" style={{ textAlign: 'center' }}>
            Place not found
          </Body>
          <SecondaryButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: DarkTheme.colors.semantic.separator,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: Spacing.xs }}
        >
          <X size={20} color={DarkTheme.colors.semantic.label} />
        </TouchableOpacity>
        
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: Spacing.sm }}>
          <Headline 
            style={{ textAlign: 'center' }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {place?.name || placeName}
          </Headline>
        </View>
        
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20,
          }}
        >

          {/* Photo Gallery */}
          <PhotoGallery 
            place={place} 
            onPhotoUpload={() => loadPlaceDetails()}
            userPhotos={userPhotos}
          />

          {/* Price level and editorial badges */}
          {(place.price_level || place.is_featured || place.has_editorial_content) && (
            <View style={{ 
              flexDirection: 'row', 
              paddingHorizontal: Spacing.lg, 
              paddingTop: Spacing.sm,
              paddingBottom: Spacing.xs,
              gap: Spacing.xs
            }}>
              {/* Price level */}
              {place.price_level && (
                <View style={{
                  backgroundColor: DarkTheme.colors.accent.green + '20',
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: Spacing.xs,
                  borderRadius: DarkTheme.borderRadius.sm,
                }}>
                  <Body style={{ color: DarkTheme.colors.accent.green, fontWeight: '600' }}>
                    {getPriceLevel(place.price_level)}
                  </Body>
                </View>
              )}
              
              {/* Editorial badges */}
              {place.is_featured && (
                <View style={{
                  backgroundColor: DarkTheme.colors.bangkok.gold + '20',
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: Spacing.xs,
                  borderRadius: DarkTheme.borderRadius.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Trophy size={12} color={DarkTheme.colors.bangkok.gold} />
                  <SecondaryText style={{ 
                    color: DarkTheme.colors.bangkok.gold, 
                    fontSize: 10, 
                    fontWeight: '600',
                    marginLeft: 4
                  }}>
                    FEATURED
                  </SecondaryText>
                </View>
              )}
              
              {place.has_editorial_content && (
                <View style={{
                  backgroundColor: DarkTheme.colors.accent.purple + '20',
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: Spacing.xs,
                  borderRadius: DarkTheme.borderRadius.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Eye size={12} color={DarkTheme.colors.accent.purple} />
                  <SecondaryText style={{ 
                    color: DarkTheme.colors.accent.purple, 
                    fontSize: 10, 
                    fontWeight: '600',
                    marginLeft: 4
                  }}>
                    EDITORIAL
                  </SecondaryText>
                </View>
              )}
            </View>
          )}

          <View style={{ padding: Spacing.lg }}>
            {/* Ratings - moved directly below photo gallery */}
            {(place.rating || userRating) && (
              <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
                <View style={{ gap: Spacing.md }}>
                  {/* User Rating Selection */}
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
                      <Body>Your Rating</Body>
                      {userRating && (
                        <TouchableOpacity
                          onPress={handleClearRating}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: Spacing.sm,
                            paddingVertical: Spacing.xs,
                            borderRadius: DarkTheme.borderRadius.sm,
                            backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                          }}
                        >
                          <X size={14} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                          <SecondaryText style={{ marginLeft: Spacing.xs, fontSize: 12 }}>Clear</SecondaryText>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {/* Thumbs Up */}
                      <TouchableOpacity 
                        onPress={() => handleUpdateRating('thumbs_up')}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: userRating === 'thumbs_up' 
                            ? DarkTheme.colors.accent.green + '40' 
                            : DarkTheme.colors.semantic.tertiarySystemBackground,
                          paddingVertical: Spacing.sm,
                          borderRadius: DarkTheme.borderRadius.sm,
                          borderWidth: userRating === 'thumbs_up' ? 2 : 0,
                          borderColor: userRating === 'thumbs_up' ? DarkTheme.colors.accent.green : 'transparent',
                        }}
                      >
                        <ThumbsUp 
                          size={24} 
                          color={userRating === 'thumbs_up' 
                            ? DarkTheme.colors.accent.green 
                            : DarkTheme.colors.semantic.secondaryLabel
                          } 
                          strokeWidth={2}
                        />
                      </TouchableOpacity>

                      {/* Neutral */}
                      <TouchableOpacity 
                        onPress={() => handleUpdateRating('neutral')}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: userRating === 'neutral' 
                            ? DarkTheme.colors.semantic.secondaryLabel + '40' 
                            : DarkTheme.colors.semantic.tertiarySystemBackground,
                          paddingVertical: Spacing.sm,
                          borderRadius: DarkTheme.borderRadius.sm,
                          borderWidth: userRating === 'neutral' ? 2 : 0,
                          borderColor: userRating === 'neutral' ? DarkTheme.colors.semantic.secondaryLabel : 'transparent',
                        }}
                      >
                        <CheckCircle 
                          size={24} 
                          color={userRating === 'neutral' 
                            ? DarkTheme.colors.semantic.secondaryLabel 
                            : DarkTheme.colors.semantic.tertiaryLabel
                          } 
                          strokeWidth={2}
                        />
                      </TouchableOpacity>

                      {/* Thumbs Down */}
                      <TouchableOpacity 
                        onPress={() => handleUpdateRating('thumbs_down')}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: userRating === 'thumbs_down' 
                            ? DarkTheme.colors.accent.red + '40' 
                            : DarkTheme.colors.semantic.tertiarySystemBackground,
                          paddingVertical: Spacing.sm,
                          borderRadius: DarkTheme.borderRadius.sm,
                          borderWidth: userRating === 'thumbs_down' ? 2 : 0,
                          borderColor: userRating === 'thumbs_down' ? DarkTheme.colors.accent.red : 'transparent',
                        }}
                      >
                        <ThumbsDown 
                          size={24} 
                          color={userRating === 'thumbs_down' 
                            ? DarkTheme.colors.accent.red 
                            : DarkTheme.colors.semantic.secondaryLabel
                          } 
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Google Rating */}
                  {place.rating && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <Body>Google Rating</Body>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {renderStars(place.rating, 18)}
                        <Body style={{ marginLeft: Spacing.sm, fontWeight: '600' }}>{place.rating}</Body>
                      </View>
                    </View>
                  )}
                </View>
              </ElevatedCard>
            )}
            {/* Description/Notes Section - Always displayed since access is only from lists */}
            <ElevatedCard padding="sm" style={{ marginBottom: Spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                <Title3>Note</Title3>
                {contextListPlace && (
                  <View style={{ marginLeft: Spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                    <Heart size={12} color={DarkTheme.colors.accent.red} />
                    <SecondaryText style={{ marginLeft: Spacing.xs, fontSize: 12 }}>
                      in {contextListPlace.list_name}
                    </SecondaryText>
                  </View>
                )}
              </View>
              
              {/* Note Content */}
              {isEditingNote ? (
                <View>
                  <TextInput
                    ref={noteInputRef}
                    style={[
                      {
                        backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                        borderColor: DarkTheme.colors.semantic.separator,
                        borderWidth: 1,
                        borderRadius: DarkTheme.borderRadius.sm,
                        padding: Spacing.xs,
                        color: DarkTheme.colors.semantic.label,
                        fontSize: 16,
                        minHeight: 60,
                        textAlignVertical: 'top',
                      }
                    ]}
                    placeholder="Add your note about this place..."
                    placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
                    multiline
                    value={noteText}
                    onChangeText={setNoteText}
                  />
                  
                  {/* Edit Actions */}
                  <View style={{ 
                    flexDirection: 'row', 
                    gap: Spacing.sm, 
                    marginTop: Spacing.sm 
                  }}>
                    <TouchableOpacity
                      onPress={handleSaveNote}
                      style={{
                        flex: 1,
                        backgroundColor: DarkTheme.colors.accent.blue,
                        paddingVertical: Spacing.sm,
                        paddingHorizontal: Spacing.md,
                        borderRadius: DarkTheme.borderRadius.sm,
                        alignItems: 'center',
                      }}
                    >
                      <Body style={{ color: DarkTheme.colors.system.white, fontWeight: '600' }}>
                        Save
                      </Body>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={handleCancelNote}
                      style={{
                        flex: 1,
                        backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                        paddingVertical: Spacing.sm,
                        paddingHorizontal: Spacing.md,
                        borderRadius: DarkTheme.borderRadius.sm,
                        alignItems: 'center',
                      }}
                    >
                      <Body style={{ color: DarkTheme.colors.semantic.label, fontWeight: '500' }}>
                        Cancel
                      </Body>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleEditNote}
                  style={{
                    backgroundColor: noteText 
                      ? DarkTheme.colors.semantic.secondarySystemBackground 
                      : DarkTheme.colors.semantic.tertiarySystemBackground,
                    borderColor: DarkTheme.colors.semantic.separator,
                    borderWidth: 1,
                    borderRadius: DarkTheme.borderRadius.sm,
                    padding: Spacing.xs,
                    minHeight: 50,
                    justifyContent: 'center',
                  }}
                >
                  {noteText ? (
                    <Body style={{ 
                      color: DarkTheme.colors.semantic.label,
                      lineHeight: 20 
                    }}>
                      {noteText}
                    </Body>
                  ) : (
                    <SecondaryText style={{ fontStyle: 'italic' }}>
                      {contextListPlace 
                        ? `Tap to add a note about this place in your ${contextListPlace.list_name} list...`
                        : 'Tap to add a note about this place...'
                      }
                    </SecondaryText>
                  )}
                </TouchableOpacity>
              )}
            </ElevatedCard>

            {/* Editorial description */}
            {place.display_description && (
              <View style={{
                backgroundColor: place.has_editorial_content 
                  ? DarkTheme.colors.accent.purple + '10' 
                  : DarkTheme.colors.semantic.secondarySystemBackground,
                padding: Spacing.md,
                borderRadius: DarkTheme.borderRadius.md,
                marginBottom: Spacing.lg,
                borderLeftWidth: place.has_editorial_content ? 3 : 0,
                borderLeftColor: DarkTheme.colors.accent.purple,
              }}>
                <Body style={{ lineHeight: 20 }}>{place.display_description}</Body>
                {place.has_editorial_content && (
                  <SecondaryText style={{ 
                    fontSize: 10, 
                    marginTop: Spacing.xs,
                    fontStyle: 'italic',
                    color: DarkTheme.colors.accent.purple
                  }}>
                    Editorial description
                  </SecondaryText>
                )}
              </View>
            )}

            {/* Quick Info */}
            <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
              
              {/* Hours */}
              {place.opening_hours && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                  <Clock size={18} color={DarkTheme.colors.semantic.secondaryLabel} />
                  <Body style={{ marginLeft: Spacing.sm }}>{formatHours(place.opening_hours)}</Body>
                </View>
              )}

              {/* Phone */}
              {place.formatted_phone_number && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${place.formatted_phone_number}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}
                >
                  <Phone size={18} color={DarkTheme.colors.semantic.secondaryLabel} />
                  <Body style={{ marginLeft: Spacing.sm, color: DarkTheme.colors.accent.blue }}>
                    {place.formatted_phone_number}
                  </Body>
                </TouchableOpacity>
              )}

              {/* Website */}
              {place.website && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(place.website!)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Globe size={18} color={DarkTheme.colors.semantic.secondaryLabel} />
                  <Body style={{ marginLeft: Spacing.sm, color: DarkTheme.colors.accent.blue }}>
                    {extractDomain(place.website)}
                  </Body>
                  <ExternalLink size={14} color={DarkTheme.colors.accent.blue} style={{ marginLeft: Spacing.xs }} />
                </TouchableOpacity>
              )}
            </ElevatedCard>

            {/* Address Box */}
            <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
              <TouchableOpacity 
                onPress={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || 'Unknown Place')}&query_place_id=${googlePlaceId}`;
                  Linking.openURL(url).catch((error) => {
                    console.error('Failed to open maps:', error);
                    showToast('Unable to open maps', 'error');
                  });
                }}
              >
                <Body>
                  {place.formatted_address}
                </Body>
              </TouchableOpacity>
            </ElevatedCard>

            {/* Check-in History */}
            {checkIns.length > 0 && (
              <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                  <Title3>Your Check-ins</Title3>
                  <View style={{ 
                    marginLeft: Spacing.sm,
                    backgroundColor: DarkTheme.colors.accent.green + '20',
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: Spacing.xs,
                    borderRadius: DarkTheme.borderRadius.sm,
                  }}>
                    <Body style={{ 
                      color: DarkTheme.colors.accent.green, 
                      fontWeight: '600',
                      fontSize: 12
                    }}>
                      {checkIns.length} {checkIns.length === 1 ? 'visit' : 'visits'}
                    </Body>
                  </View>
                </View>
                {checkIns.slice(0, 3).map((checkIn, index) => (
                  <View
                    key={checkIn.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: Spacing.sm,
                      borderBottomWidth: index < Math.min(checkIns.length, 3) - 1 ? 1 : 0,
                      borderBottomColor: DarkTheme.colors.semantic.separator,
                    }}
                  >
                    <CheckSquare size={18} color={DarkTheme.colors.accent.green} />
                    <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                      <Body>{checkIn.created_at ? new Date(checkIn.created_at).toLocaleDateString() : 'Unknown date'}</Body>
                      {checkIn.comment && (
                        <SecondaryText style={{ marginTop: 2 }}>{checkIn.comment}</SecondaryText>
                      )}
                    </View>
                  </View>
                ))}
                {checkIns.length > 3 && (
                  <TouchableOpacity style={{ marginTop: Spacing.sm }}>
                    <Body color="secondary" style={{ textAlign: 'center' }}>
                      View all {checkIns.length} check-ins
                    </Body>
                  </TouchableOpacity>
                )}
              </ElevatedCard>
            )}

            {/* Lists containing this place */}
            {listsContainingPlace.length > 0 && (
              <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
                <Title3 style={{ marginBottom: Spacing.md }}>In Your Lists</Title3>
                {listsContainingPlace.slice(0, 3).map((listPlace, index) => (
                  <View
                    key={`${listPlace.list_id}-${index}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: Spacing.sm,
                      borderBottomWidth: index < Math.min(listsContainingPlace.length, 3) - 1 ? 1 : 0,
                      borderBottomColor: DarkTheme.colors.semantic.separator,
                    }}
                  >
                    <Heart size={16} color={DarkTheme.colors.accent.red} />
                    <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                      <Body>{listPlace.list_name}</Body>
                    </View>
                  </View>
                ))}
              </ElevatedCard>
            )}

            {/* Action Buttons */}
            <View style={{ gap: Spacing.md, marginBottom: Spacing.xl }}>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title="Check In"
                    icon={Pin}
                    onPress={handleCheckIn}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PhotoUploadButton
                    googlePlaceId={googlePlaceId}
                    onPhotoUploaded={() => loadPlaceDetails()}
                  />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}