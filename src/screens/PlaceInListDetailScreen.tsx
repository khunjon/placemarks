import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Image, 
  Linking, 
  Dimensions,
  TextInput,
  Keyboard,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  MapPin, 
  Phone, 
  Globe, 
  Navigation, 
  Plus, 
  Edit3, 
  Trash2, 
  Share, 
  CheckSquare,
  Heart,
  Calendar,
  Camera,
  ExternalLink,
  TrendingUp,
  ChevronRight
} from 'lucide-react-native';
import { DarkTheme } from '../constants/theme';
import { Spacing } from '../constants/Spacing';
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
} from '../components/common';
import Toast from '../components/ui/Toast';

import { enhancedListsService, ListPlace, EnhancedList } from '../services/listsService';
import { checkInUtils, CheckIn } from '../services/checkInsService';
import { userRatingsService, UserPlaceRating } from '../services/userRatingsService';
import { useAuth } from '../services/auth-context';
import { supabase } from '../services/supabase';
import type { ListsStackScreenProps } from '../navigation/types';

const { width: screenWidth } = Dimensions.get('window');

type PlaceInListDetailScreenProps = ListsStackScreenProps<'PlaceInListDetail'>;

interface GooglePhotoReference {
  photo_reference: string;
  height: number;
  width: number;
  html_attributions?: string[];
}

interface PlaceDetails {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  google_place_id?: string;
  google_rating?: number;
  price_level?: number;
  phone?: string;
  website?: string;
  hours_open?: any;
  photos_urls?: string[];
  photo_references?: GooglePhotoReference[];
  place_types?: string[];
}

export default function PlaceInListDetailScreen({ navigation, route }: PlaceInListDetailScreenProps) {
  const { placeId, listId, listName } = route.params;
  const { user } = useAuth();
  
  // Refs for keyboard handling and tracking initial mount
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const isInitialMount = useRef(true);
  
  // State
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [listPlace, setListPlace] = useState<ListPlace | null>(null);
  const [userRating, setUserRating] = useState<UserPlaceRating | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [otherLists, setOtherLists] = useState<EnhancedList[]>([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  
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
    loadPlaceDetails();
  }, [placeId, listId]);

  // Add navigation listener to refresh data when coming back to this screen (but not on initial mount)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Skip the first focus event (initial mount)
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      if (user?.id) {
        console.log('Screen focused, reloading place details...');
        loadPlaceDetails();
      }
    });

    return unsubscribe;
  }, [navigation, user?.id]);

  // Keyboard listeners for precise height tracking
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Handle text input focus for keyboard-aware scrolling
  const handleTextInputFocus = () => {
    // Small delay to ensure keyboard animation starts
    setTimeout(() => {
      textInputRef.current?.measureInWindow((x, y, width, height) => {
        // Use actual keyboard height if available, otherwise estimate
        const actualKeyboardHeight = keyboardHeight || (Platform.OS === 'ios' ? 300 : 250);
        const screenHeight = Dimensions.get('window').height;
        const availableHeight = screenHeight - actualKeyboardHeight;
        
        // Add extra space for the buttons below the TextInput (approximately 60px for buttons + spacing)
        const buttonHeight = 60;
        const extraPadding = 20; // Additional padding for comfort
        
        // Position the input higher to ensure buttons are visible
        const targetY = y - (availableHeight * 0.2) - buttonHeight - extraPadding;
        
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, targetY),
          animated: true,
        });
      });
    }, 150);
  };

  // Generate Google Places photo URL from photo reference
  // This converts a Google Places API photo reference to an actual image URL
  // Format: https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=REFERENCE&key=API_KEY
  const getGooglePhotoUrl = (photoReference: string, maxWidth: number = 800): string => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
    if (!apiKey) {
      console.warn('Google Places API key not configured');
      return '';
    }
    
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
  };

  // Fetch fresh Google Places photos for this place
  const fetchGooglePlacesPhotos = async (googlePlaceId: string): Promise<GooglePhotoReference[]> => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
    if (!apiKey || !googlePlaceId) {
      return [];
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=photos&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result.photos) {
        return data.result.photos.map((photo: any) => ({
          photo_reference: photo.photo_reference,
          height: photo.height,
          width: photo.width,
          html_attributions: photo.html_attributions || []
        }));
      }
    } catch (error) {
      console.error('Error fetching Google Places photos:', error);
    }

    return [];
  };

  // Fetch complete place details from Google Places API
  const fetchGooglePlaceDetails = async (googlePlaceId: string) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
    if (!apiKey || !googlePlaceId) {
      return null;
    }

    try {
      const fields = [
        'name',
        'formatted_address', 
        'formatted_phone_number',
        'website',
        'rating',
        'price_level',
        'opening_hours',
        'photos',
        'types'
      ].join(',');

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=${fields}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        
        // Parse opening hours into our format
        let hoursOpen: any = null;
        if (result.opening_hours?.periods) {
          hoursOpen = {} as any;
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          
          // Initialize all days as closed
          dayNames.forEach(day => {
            hoursOpen[day] = 'closed';
          });
          
          // Process periods
          result.opening_hours.periods.forEach((period: any) => {
            if (period.open && period.close) {
              const dayIndex = period.open.day;
              const dayName = dayNames[dayIndex];
              const openTime = period.open.time.substring(0, 2) + ':' + period.open.time.substring(2);
              const closeTime = period.close.time.substring(0, 2) + ':' + period.close.time.substring(2);
              
              hoursOpen[dayName] = {
                open: openTime,
                close: closeTime
              };
            } else if (period.open && !period.close) {
              // 24 hour operation
              const dayIndex = period.open.day;
              const dayName = dayNames[dayIndex];
              hoursOpen[dayName] = {
                open: '00:00',
                close: '23:59'
              };
            }
          });
        }

        // Parse photos
        const photoReferences = result.photos ? result.photos.map((photo: any) => ({
          photo_reference: photo.photo_reference,
          height: photo.height,
          width: photo.width,
          html_attributions: photo.html_attributions || []
        })) : [];

        return {
          name: result.name,
          address: result.formatted_address,
          phone: result.formatted_phone_number || null,
          website: result.website || null,
          google_rating: result.rating || null,
          price_level: result.price_level || null,
          hours_open: hoursOpen,
          photo_references: photoReferences,
          place_types: result.types || []
        };
      }
    } catch (error) {
      console.error('Error fetching Google Place details:', error);
    }

    return null;
  };

  // Get photo URLs for display (prioritize fresh Google Photos, fallback to stored URLs)
  const getPhotoUrls = (): string[] => {
    if (!place) return [];
    
    // First, try to use Google Places photo references (if we have fresh ones)
    if (place.photo_references && place.photo_references.length > 0) {
      // Only use photo references if they look valid (not the sample ones we added)
      const validReferences = place.photo_references.filter(ref => 
        ref.photo_reference && !ref.photo_reference.startsWith('ATplDJ')
      );
      
      if (validReferences.length > 0) {
        return validReferences.map(ref => getGooglePhotoUrl(ref.photo_reference));
      }
    }
    
    // Fallback to stored URLs (legacy or temporary)
    return place.photos_urls || [];
  };

  const loadPlaceDetails = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Load place details, list context, and related data in parallel
      const [placeData, listPlaceData, checkInsData, otherListsData] = await Promise.all([
        // Get place details
        fetchPlaceDetails(placeId),
        
        // Get place details within this list
        fetchListPlaceDetails(listId, placeId),
        
        // Get check-in history for this place
        fetchCheckInsForPlace(user.id, placeId),
        
        // Get other lists containing this place
        fetchOtherListsContainingPlace(user.id, placeId, listId)
      ]);
      
      setPlace(placeData);
      setListPlace(listPlaceData);
      setCheckIns(checkInsData);
      setOtherLists(otherListsData);
      setTempNotes(listPlaceData?.notes || '');

      // Fetch fresh Google Places data if we have a Google Place ID
      // This will get real phone, website, hours, ratings, and photos
      if (placeData.google_place_id) {
        try {
          console.log('Fetching fresh Google Places data for:', placeData.name);
          const googleData = await fetchGooglePlaceDetails(placeData.google_place_id);
          
          if (googleData) {
            // Update the place state with fresh Google data
            const updatedPlace = {
              ...placeData,
              phone: googleData.phone || placeData.phone,
              website: googleData.website || placeData.website,
              google_rating: googleData.google_rating || placeData.google_rating,
              price_level: googleData.price_level || placeData.price_level,
              hours_open: googleData.hours_open || placeData.hours_open,
              photo_references: googleData.photo_references.length > 0 ? googleData.photo_references : placeData.photo_references,
              place_types: googleData.place_types.length > 0 ? googleData.place_types : placeData.place_types
            };
            
            setPlace(updatedPlace);
            
            // Update the database with fresh Google Places data
            const updateData: any = {};
            if (googleData.phone) updateData.phone = googleData.phone;
            if (googleData.website) updateData.website = googleData.website;
            if (googleData.google_rating) updateData.google_rating = googleData.google_rating.toString();
            if (googleData.price_level) updateData.price_level = googleData.price_level;
            if (googleData.hours_open) updateData.hours_open = googleData.hours_open;
            if (googleData.photo_references.length > 0) updateData.photo_references = googleData.photo_references;
            if (googleData.place_types.length > 0) updateData.google_types = googleData.place_types;
            
            if (Object.keys(updateData).length > 0) {
              const { error } = await supabase
                .from('places')
                .update(updateData)
                .eq('id', placeId);
                
              if (error) {
                console.warn('Failed to update place with Google data:', error);
              } else {
                console.log('Successfully updated place with fresh Google data');
              }
            }
          }
        } catch (error) {
          console.warn('Failed to fetch fresh Google Places data:', error);
        }
      }
      
    } catch (error) {
      console.error('Error loading place details:', error);
      showToast('Failed to load place details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch place details from database
  const fetchPlaceDetails = async (placeId: string): Promise<PlaceDetails> => {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', placeId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Place not found');

    // For now, use default coordinates - PostGIS coordinate extraction would need a custom RPC function
    const coordinates = {
      latitude: 13.7367,
      longitude: 100.5412
    };

    return {
      id: data.id,
      name: data.name,
      address: data.address || '',
      coordinates,
      google_place_id: data.google_place_id,
      google_rating: data.google_rating ? parseFloat(data.google_rating) : undefined,
      price_level: data.price_level,
      phone: data.phone,
      website: data.website,
      hours_open: data.hours_open || {},
      photos_urls: data.photos_urls || [],
      photo_references: data.photo_references || [],
      place_types: data.google_types || []
    };
  };

  // Fetch list-specific place details
  const fetchListPlaceDetails = async (listId: string, placeId: string): Promise<ListPlace> => {
    console.log('Fetching list place details:', { listId, placeId });
    
    const { data, error } = await supabase
      .from('list_places')
      .select('*')
      .eq('list_id', listId)
      .eq('place_id', placeId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Place not found in list');

    console.log('Fetched list place data:', data);

    return {
      list_id: data.list_id,
      place_id: data.place_id,
      added_at: data.added_at,
      notes: data.notes,
      personal_rating: data.personal_rating,
      visit_count: data.visit_count || 0,
      sort_order: data.sort_order || 0
    };
  };

  // Fetch check-ins for this place
  const fetchCheckInsForPlace = async (userId: string, placeId: string): Promise<CheckIn[]> => {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('place_id', placeId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data || []).map((checkIn: any) => ({
      id: checkIn.id,
      user_id: checkIn.user_id,
      place_id: checkIn.place_id,
      timestamp: checkIn.timestamp,
      rating: checkIn.rating,
      comment: checkIn.comment || checkIn.notes, // Use comment field, fallback to notes
      photos: checkIn.photos || [],
      created_at: checkIn.created_at,
      updated_at: checkIn.updated_at
    }));
  };

  // Fetch other lists containing this place
  const fetchOtherListsContainingPlace = async (userId: string, placeId: string, excludeListId: string): Promise<EnhancedList[]> => {
    const { data, error } = await supabase
      .from('list_places')
      .select(`
        list_id,
        lists!inner (
          id,
          user_id,
          name,
          icon,
          color,
          privacy_level,
          auto_generated,
          created_at,
          type
        )
      `)
      .eq('place_id', placeId)
      .eq('lists.user_id', userId)
      .neq('list_id', excludeListId);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.lists.id,
      user_id: item.lists.user_id,
      name: item.lists.name,
      icon: item.lists.icon,
      color: item.lists.color,
      privacy_level: item.lists.privacy_level,
      auto_generated: item.lists.auto_generated,
      created_at: item.lists.created_at,
      type: item.lists.type
    }));
  };

  const handleUpdateNotes = async () => {
    if (!user?.id || !listPlace) return;
    
    try {
      const { error } = await supabase
        .from('list_places')
        .update({ notes: tempNotes })
        .eq('list_id', listId)
        .eq('place_id', placeId);

      if (error) throw error;
      
      setListPlace(prev => prev ? { ...prev, notes: tempNotes } : null);
      setEditingNotes(false);
      showToast('Notes updated');
    } catch (error) {
      console.error('Error updating notes:', error);
      showToast('Failed to update notes');
    }
  };

  const handleUpdateRating = async (rating: number) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('list_places')
        .update({ personal_rating: rating })
        .eq('list_id', listId)
        .eq('place_id', placeId);

      if (error) throw error;
      
      setListPlace(prev => prev ? { ...prev, personal_rating: rating } : null);
      showToast('Rating updated');
    } catch (error) {
      console.error('Error updating rating:', error);
      showToast('Failed to update rating', 'error');
    }
  };

  const handleGetDirections = () => {
    if (!place?.coordinates) return;
    
    const { latitude, longitude } = place.coordinates;
    const url = `https://maps.apple.com/?daddr=${latitude},${longitude}`;
    
    Linking.openURL(url).catch(() => {
      showToast('Unable to open directions', 'error');
    });
  };

  const handleCheckIn = () => {
    // Navigate to check-in screen
    showToast('Check-in feature coming soon');
  };

  const handleShare = () => {
    showToast('Share feature coming soon');
  };

  const formatHours = (hours: any) => {
    if (!hours) return 'Hours not available';
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = hours[today];
    
    if (!todayHours || todayHours === 'closed') {
      return 'Closed today';
    }
    
    return `Open today: ${todayHours.open} - ${todayHours.close}`;
  };

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
          fill={i < fullStars ? DarkTheme.colors.bangkok.gold : 'transparent'}
          strokeWidth={1.5}
        />
      );
    }
    
    return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
  };

  const getPriceLevel = (level?: number) => {
    if (!level) return '';
    return '$'.repeat(Math.min(level, 4));
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }}>
        <LoadingState message="Loading place details..." />
      </SafeAreaView>
    );
  }

  if (!place || !listPlace) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg }}>
          <Body color="secondary" style={{ textAlign: 'center' }}>
            Place not found or no longer in this list
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
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: DarkTheme.colors.semantic.separator,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: Spacing.xs }}
        >
          <ArrowLeft size={24} color={DarkTheme.colors.semantic.label} strokeWidth={2} />
        </TouchableOpacity>
        
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Headline style={{ textAlign: 'center' }}>Place Details</Headline>
          <SecondaryText style={{ fontSize: 12 }}>in {listName}</SecondaryText>
        </View>
        
        <TouchableOpacity
          onPress={handleShare}
          style={{ padding: Spacing.xs }}
        >
          <Share size={20} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Place Photos - Google Places API Integration */}
          {/* Photos are fetched from Google Places API using photo references stored in the database.
              If no valid photo references exist, we fall back to stored URLs.
              Fresh photos are automatically fetched when viewing a place for the first time. */}
          {(() => {
            const photoUrls = getPhotoUrls();
            return photoUrls.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                style={{ height: 200 }}
              >
                {photoUrls.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={{
                      width: screenWidth,
                      height: 200,
                      backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground
                    }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            );
          })()}

          <View style={{ padding: Spacing.lg }}>
            {/* Place Header */}
            <View style={{ marginBottom: Spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Title1 style={{ marginBottom: Spacing.xs }}>{place.name}</Title1>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                    <MapPin size={16} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                    <Body color="secondary" style={{ marginLeft: Spacing.xs, flex: 1 }}>
                      {place.address}
                    </Body>
                  </View>

                  {/* Ratings Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
                    {place.google_rating && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ marginRight: Spacing.xs }}>
                          {renderStars(place.google_rating)}
                        </View>
                        <Body style={{ fontWeight: '600' }}>{place.google_rating}</Body>
                        <SecondaryText style={{ marginLeft: Spacing.xs }}>Google</SecondaryText>
                      </View>
                    )}
                    
                    {listPlace.personal_rating && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Body style={{ fontSize: 16, marginRight: Spacing.xs }}>
                          {listPlace.personal_rating >= 4 ? '👍' : listPlace.personal_rating <= 2 ? '👎' : '😐'}
                        </Body>
                        <SecondaryText>Your rating</SecondaryText>
                      </View>
                    )}
                  </View>
                </View>
                
                {place.price_level && (
                  <View style={{
                    backgroundColor: DarkTheme.colors.accent.green + '20',
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: Spacing.xs,
                    borderRadius: DarkTheme.borderRadius.sm,
                    marginLeft: Spacing.sm,
                  }}>
                    <Body style={{ color: DarkTheme.colors.accent.green, fontWeight: '600' }}>
                      {getPriceLevel(place.price_level)}
                    </Body>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Info */}
            <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
              <Title3 style={{ marginBottom: Spacing.md }}>Quick Info</Title3>
              
              {/* Hours */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                <Clock size={18} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                <Body style={{ marginLeft: Spacing.sm }}>{formatHours(place.hours_open)}</Body>
              </View>

              {/* Phone */}
              {place.phone && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${place.phone}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}
                >
                  <Phone size={18} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                  <Body style={{ marginLeft: Spacing.sm, color: DarkTheme.colors.accent.blue }}>
                    {place.phone}
                  </Body>
                </TouchableOpacity>
              )}

              {/* Website */}
              {place.website && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(place.website!)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Globe size={18} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                  <Body style={{ marginLeft: Spacing.sm, color: DarkTheme.colors.accent.blue }}>
                    Visit website
                  </Body>
                  <ExternalLink size={14} color={DarkTheme.colors.accent.blue} strokeWidth={2} style={{ marginLeft: Spacing.xs }} />
                </TouchableOpacity>
              )}
            </ElevatedCard>

            {/* Your Notes */}
            <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
                <Title3>Your Notes</Title3>
                <TouchableOpacity onPress={() => setEditingNotes(!editingNotes)}>
                  <Edit3 size={18} color={DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              
              {editingNotes ? (
                <View>
                  <TextInput
                    style={{
                      backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                      borderRadius: DarkTheme.borderRadius.sm,
                      padding: Spacing.sm,
                      marginBottom: Spacing.sm,
                      minHeight: 80,
                      color: DarkTheme.colors.semantic.label,
                      fontSize: 16,
                      textAlignVertical: 'top',
                    }}
                    multiline
                    autoFocus
                    placeholder="Add your notes about this place..."
                    placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
                    value={tempNotes}
                    onChangeText={setTempNotes}
                    onFocus={handleTextInputFocus}
                    ref={textInputRef}
                  />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <GhostButton
                      title="Cancel"
                      onPress={() => {
                        setTempNotes(listPlace.notes || '');
                        setEditingNotes(false);
                      }}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      title="Save"
                      onPress={handleUpdateNotes}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingNotes(true)}
                  style={{
                    backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                    borderRadius: DarkTheme.borderRadius.sm,
                    padding: Spacing.sm,
                    minHeight: 60,
                    justifyContent: 'center',
                  }}
                >
                  <Body color={listPlace.notes ? 'primary' : 'secondary'}>
                    {listPlace.notes || 'Tap to add notes about this place...'}
                  </Body>
                </TouchableOpacity>
              )}
            </ElevatedCard>

            {/* Check-in History */}
            {checkIns.length > 0 && (
              <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                  <Title3>Recent Check-ins</Title3>
                  {(listPlace.visit_count || 0) > 0 && (
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
                        {listPlace.visit_count} {listPlace.visit_count === 1 ? 'visit' : 'visits'}
                      </Body>
                    </View>
                  )}
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
                    <CheckSquare size={18} color={DarkTheme.colors.accent.green} strokeWidth={2} />
                    <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                      <Body>{new Date(checkIn.created_at).toLocaleDateString()}</Body>
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

            {/* Other Lists */}
            {otherLists.length > 0 && (
              <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
                <Title3 style={{ marginBottom: Spacing.md }}>Also in Other Lists</Title3>
                {otherLists.map((list, index) => (
                  <TouchableOpacity
                    key={list.id}
                    onPress={() => navigation.navigate('ListDetail', {
                      listId: list.id,
                      listName: list.name,
                      listType: 'user',
                      isEditable: true,
                    })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: Spacing.sm,
                      borderBottomWidth: index < otherLists.length - 1 ? 1 : 0,
                      borderBottomColor: DarkTheme.colors.semantic.separator,
                    }}
                  >
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: list.color ? `${list.color}20` : DarkTheme.colors.semantic.tertiarySystemBackground,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: Spacing.sm,
                    }}>
                      <Heart size={16} color={list.color || DarkTheme.colors.semantic.secondaryLabel} strokeWidth={2} />
                    </View>
                    <Body style={{ flex: 1 }}>{list.name}</Body>
                    <ChevronRight size={16} color={DarkTheme.colors.semantic.tertiaryLabel} strokeWidth={2} />
                  </TouchableOpacity>
                ))}
              </ElevatedCard>
            )}

            {/* Action Buttons */}
            <View style={{ gap: Spacing.md, marginBottom: Spacing.xl }}>
              <PrimaryButton
                title="Get Directions"
                icon={Navigation}
                onPress={handleGetDirections}
              />
              
              <SecondaryButton
                title="Check In Here"
                icon={Camera}
                onPress={handleCheckIn}
              />
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