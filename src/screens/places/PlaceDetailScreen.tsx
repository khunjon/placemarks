import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { PhotoUrlGenerator } from '../../services/photoUrlGenerator';
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

import { enhancedListsService, ListPlace, EnhancedList } from '../../services/listsService';
import { ListDetailsCache } from '../../services/listDetailsCache';

import { googlePlacesCache } from '../../services/googlePlacesCache';
import { checkInUtils, CheckIn } from '../../services/checkInsService';
import { userRatingsService, UserPlaceRating } from '../../services/userRatingsService';
import { useAuth } from '../../services/auth-context';
import { supabase } from '../../services/supabase';
import type { ListsStackScreenProps } from '../../navigation/types';

const { width: screenWidth } = Dimensions.get('window');

type PlaceDetailScreenProps = ListsStackScreenProps<'PlaceInListDetail'>;

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
  photo_references?: GooglePhotoReference[];
  place_types?: string[];
}

export default function PlaceDetailScreen({ navigation, route }: PlaceDetailScreenProps) {
  const { placeId, listId, listName } = route.params;
  
  // Handle cases where this screen is used outside of list context (e.g., from check-in search)
  const isInListContext = Boolean(listId && listName);
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
  const getGooglePhotoUrl = useCallback((photoReference: string, maxWidth: number = 800): string => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
    if (!apiKey) {
      console.warn('Google Places API key not configured');
      return '';
    }
    
    // Generate photo URL (no caching needed since this is a rare fallback)
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
    
    console.log('🟢 GOOGLE PLACES API: Photo URL Generated', {
      photoReference: photoReference.substring(0, 20) + '...',
      maxWidth: maxWidth,
      cost: '$0.007 per 1000 calls'
    });
    
    return photoUrl;
  }, []);

  // Note: Direct Google Places API calls have been replaced with googlePlacesCache service
  // This provides intelligent caching and reduces API costs

  // Get photo URLs for display using photo references
  const getPhotoUrls = (): string[] => {
    if (!place) return [];
    
    // Generate URLs from photo references (client-side)
    if (place.photo_references && place.photo_references.length > 0) {
      const validReferences = place.photo_references.filter(ref => 
        ref.photo_reference && !ref.photo_reference.startsWith('ATplDJ')
      );
      
      if (validReferences.length > 0) {
        console.log('📸 PlaceDetails: Generating photo URLs from references', {
          photoCount: validReferences.length,
          approach: 'client-side generation'
        });
        
        return PhotoUrlGenerator.generateUrls(validReferences.slice(0, 10));
      }
    }
    
    return [];
  };

  // OPTIMIZATION: Memoize photo URLs to prevent regeneration on every render
  // Only recalculate if photo references actually change, not when other place properties change
  const photoReferences = useMemo(() => place?.photo_references, [place?.photo_references]);
  const photoUrls = useMemo(() => getPhotoUrls(), [photoReferences]);

  const loadPlaceDetails = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Check if this is a recommendations context (virtual list)
      const isRecommendationsContext = listId === 'recommendations';
      
      if (isRecommendationsContext) {
        // For recommendations, we expect a Google Place ID and should fetch from google_places_cache
        const [placeData, checkInsData] = await Promise.all([
          // Get place details from google_places_cache using the Google Place ID
          fetchRecommendedPlaceDetails(placeId),
          
          // Get check-in history for this place (by Google Place ID)
          fetchCheckInsForRecommendedPlace(user.id, placeId)
          
          // No user ratings for recommendations
        ]);
        
        setPlace(placeData);
        setListPlace(null); // No list context for recommendations
        setCheckIns(checkInsData);
        setOtherLists([]); // No other lists for recommendations
        setUserRating(null); // No ratings for recommendations
        setTempNotes('');
      } else {
        // Load place details, list context, and related data in parallel
        const [placeData, listPlaceData, checkInsData, otherListsData, userRatingData] = await Promise.all([
          // Get place details
          fetchPlaceDetails(placeId),
          
          // Get place details within this list
          fetchListPlaceDetails(listId, placeId),
          
          // Get check-in history for this place
          fetchCheckInsForPlace(user.id, placeId),
          
          // Get other lists containing this place
          fetchOtherListsContainingPlace(user.id, placeId, listId),
          
          // Get user's universal rating for this place
          userRatingsService.getUserRating(user.id, placeId)
        ]);
        
        setPlace(placeData);
        setListPlace(listPlaceData);
        setCheckIns(checkInsData);
        setOtherLists(otherListsData);
        setUserRating(userRatingData);
        setTempNotes(listPlaceData?.notes || '');
        
        // Check if we can enhance the fetched place data with Google Places cache
        if (placeData?.google_place_id) {
          try {
            // Check Google Places cache for missing data (but NOT for photo URLs)
            const googleData = await googlePlacesCache.getCachedPlace(placeData.google_place_id);
            
            if (googleData) {
              // Only enhance missing non-photo data and photo references
              const needsDataEnhancement = 
                !placeData.phone || 
                !placeData.website || 
                !placeData.google_rating ||
                !placeData.photo_references || 
                placeData.photo_references.length === 0;
              
              if (needsDataEnhancement) {
                console.log('🗄️ DATA ENHANCEMENT: Adding missing place data from cache', {
                  placeId: placeData.id,
                  name: placeData.name,
                  source: 'google_places_cache',
                  hasPhotos: (googleData.photos?.length || 0) > 0
                });
                
                // Update the place state with cached data (NO photo URLs)
                const updatedPlace = {
                  ...placeData,
                  phone: googleData.formatted_phone_number || placeData.phone,
                  website: googleData.website || placeData.website,
                  google_rating: googleData.rating || placeData.google_rating,
                  price_level: googleData.price_level || placeData.price_level,
                  hours_open: googleData.opening_hours || placeData.hours_open,
                  photo_references: googleData.photos || placeData.photo_references,
                  place_types: googleData.types || placeData.place_types
                  // NOTE: Deliberately NOT setting photos_urls - let PhotoUrlGenerator handle it
                };
                
                setPlace(updatedPlace);
                
                // Update the database with missing data (NO photo URLs)
                const updateData: any = {};
                if (googleData.formatted_phone_number && !placeData.phone) updateData.phone = googleData.formatted_phone_number;
                if (googleData.website && !placeData.website) updateData.website = googleData.website;
                if (googleData.rating && !placeData.google_rating) updateData.google_rating = googleData.rating.toString();
                if (googleData.price_level && !placeData.price_level) updateData.price_level = googleData.price_level;
                if (googleData.opening_hours && !placeData.hours_open) updateData.hours_open = googleData.opening_hours;
                if (googleData.photos && (!placeData.photo_references || placeData.photo_references.length === 0)) updateData.photo_references = googleData.photos;
                if (googleData.types && (!placeData.place_types || placeData.place_types.length === 0)) updateData.google_types = googleData.types;
                
                if (Object.keys(updateData).length > 0) {
                  const { error } = await supabase
                    .from('places')
                    .update(updateData)
                    .eq('id', placeId);
                    
                  if (error) {
                    console.warn('Failed to update place with cached Google data:', error);
                  } else {
                    console.log('Successfully enhanced place with cached Google data');
                  }
                }
              }
            } else if (!placeData.phone || !placeData.website || !placeData.google_rating) {
              // Fetch fresh data if we're missing any basic info (more aggressive for better UX)
              console.log('🟢 GOOGLE PLACES API: Fetching fresh data for:', placeData.name);
              const freshGoogleData = await googlePlacesCache.getPlaceDetails(placeData.google_place_id);
              
              if (freshGoogleData) {
                // Convert Google Places cache format to our format (NO photo URLs)
                const convertedData = {
                  phone: freshGoogleData.formatted_phone_number || null,
                  website: freshGoogleData.website || null,
                  google_rating: freshGoogleData.rating || null,
                  price_level: freshGoogleData.price_level || null,
                  hours_open: freshGoogleData.opening_hours || null,
                  photo_references: freshGoogleData.photos ? freshGoogleData.photos.map((photo: any) => ({
                    photo_reference: photo.photo_reference,
                    height: photo.height,
                    width: photo.width,
                    html_attributions: photo.html_attributions || []
                  })) : [],
                  place_types: freshGoogleData.types || []
                  // NOTE: Deliberately NOT including photo_urls
                };

                // Update the place state with fresh Google data (NO photo URLs)
                const updatedPlace = {
                  ...placeData,
                  phone: convertedData.phone || placeData.phone,
                  website: convertedData.website || placeData.website,
                  google_rating: convertedData.google_rating || placeData.google_rating,
                  price_level: convertedData.price_level || placeData.price_level,
                  hours_open: convertedData.hours_open || placeData.hours_open,
                  photo_references: convertedData.photo_references.length > 0 ? convertedData.photo_references : placeData.photo_references,
                  place_types: convertedData.place_types.length > 0 ? convertedData.place_types : placeData.place_types
                  // NOTE: Deliberately NOT setting photos_urls
                };
                
                setPlace(updatedPlace);
                
                // Update the database with fresh Google Places data (NO photo URLs)
                const updateData: any = {};
                if (convertedData.phone) updateData.phone = convertedData.phone;
                if (convertedData.website) updateData.website = convertedData.website;
                if (convertedData.google_rating) updateData.google_rating = convertedData.google_rating.toString();
                if (convertedData.price_level) updateData.price_level = convertedData.price_level;
                if (convertedData.hours_open) updateData.hours_open = convertedData.hours_open;
                if (convertedData.photo_references.length > 0) updateData.photo_references = convertedData.photo_references;
                if (convertedData.place_types.length > 0) updateData.google_types = convertedData.place_types;
                // NOTE: Deliberately NOT storing photos_urls
                
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
            }
          } catch (error) {
            console.warn('Failed to enhance place with Google Places data:', error);
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading place details:', error);
      showToast('Failed to load place details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch place details from google_places_cache for recommendations
  const fetchRecommendedPlaceDetails = async (googlePlaceId: string): Promise<PlaceDetails> => {
    console.log('🗄️ Loading recommended place from cache:', googlePlaceId);
    
    const { data, error } = await supabase
      .from('google_places_cache')
      .select('*')
      .eq('google_place_id', googlePlaceId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Recommended place not found');

    // Extract coordinates from PostGIS geometry
    const coordinates = data.geometry?.location ? {
      latitude: data.geometry.location.lat,
      longitude: data.geometry.location.lng
    } : {
      latitude: 13.7367, // Default Bangkok coordinates
      longitude: 100.5412
    };

    return {
      id: data.google_place_id, // Use Google Place ID as the ID for recommendations
      name: data.name,
      address: data.formatted_address || '',
      coordinates,
      google_place_id: data.google_place_id,
      google_rating: data.rating,
      price_level: data.price_level,
      phone: data.formatted_phone_number,
      website: data.website,
      hours_open: data.opening_hours || {},

      photo_references: data.photos || [], // Use photo references for PhotoUrlGenerator
      place_types: data.types || []
    };
  };

  // Fetch check-ins for recommended place (by Google Place ID)
  const fetchCheckInsForRecommendedPlace = async (userId: string, googlePlaceId: string): Promise<CheckIn[]> => {
    // First, try to find if this Google Place ID has been added to any user's places
    const { data: placeData } = await supabase
      .from('places')
      .select('id')
      .eq('google_place_id', googlePlaceId)
      .single();

    if (!placeData) {
      // No corresponding place in database, so no check-ins
      return [];
    }

    // Fetch check-ins using the database place ID
    return fetchCheckInsForPlace(userId, placeData.id);
  };

  // Fetch place details from database
  const fetchPlaceDetails = async (placeId: string): Promise<PlaceDetails> => {
    // First get the basic place data
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', placeId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Place not found');

    // Get coordinates using RPC function
    let coordinates = {
      latitude: 13.7367, // Default Bangkok coordinates
      longitude: 100.5412
    };

    try {
      const { data: coordData, error: coordError } = await supabase
        .rpc('get_place_coordinates', { place_uuid: placeId });

      if (!coordError && coordData && coordData.length > 0) {
        const coord = coordData[0];
        if (coord.latitude && coord.longitude) {
          coordinates = {
            latitude: coord.latitude,
            longitude: coord.longitude
          };
        }
      }
    } catch (coordError) {
      console.warn('Failed to get coordinates for place:', coordError);
      // Continue with default coordinates
    }

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

      photo_references: data.photo_references || [],
      place_types: data.google_types || []
    };
  };

  // Fetch list-specific place details
  const fetchListPlaceDetails = async (listId: string, placeId: string): Promise<ListPlace> => {
    
    const { data, error } = await supabase
      .from('list_places')
      .select('*')
      .eq('list_id', listId)
      .eq('place_id', placeId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Place not found in list');

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
          visibility,
          auto_generated,
          created_at,
          type,
          is_curated
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
      visibility: item.lists.visibility,
      auto_generated: item.lists.auto_generated,
      created_at: item.lists.created_at,
      type: item.lists.type,
      is_curated: item.lists.is_curated || false
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
      
      // Update cache optimistically
      if (user?.id) {
        await ListDetailsCache.updatePlaceNotesInCache(listId, placeId, tempNotes, user.id);
      }
      
      setEditingNotes(false);
      showToast('Notes updated');
    } catch (error) {
      console.error('Error updating notes:', error);
      showToast('Failed to update notes');
    }
  };

  const handleUpdateRating = async (ratingType: 'thumbs_up' | 'neutral' | 'thumbs_down') => {
    if (!user?.id || !place?.id || isRecommendationsContext) return;
    
    try {
      // Convert rating type to numerical value
      const ratingValue = ratingType === 'thumbs_up' ? 5 : ratingType === 'thumbs_down' ? 1 : 3;
      
      const updatedRating = await userRatingsService.setUserRating(
        user.id,
        place.id,
        ratingType,
        ratingValue
      );
      
      setUserRating(updatedRating);
      showToast('Rating updated');
    } catch (error) {
      console.error('Error updating rating:', error);
      showToast('Failed to update rating', 'error');
    }
  };

  const handleGetDirections = () => {
    if (!place?.name && !place?.address) return;
    
    let url;
    
    // Use Google Place ID if available (most accurate)
    if (place.google_place_id) {
      const encodedName = encodeURIComponent(place.name);
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodedName}&destination_place_id=${place.google_place_id}`;
    } else {
      // Combine place name with address for better accuracy
      const destination = place.name && place.address 
        ? `${place.name} ${place.address}`
        : place.address || place.name;
      const encodedDestination = encodeURIComponent(destination);
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
    }
    
    console.log('Opening directions for:', place.name);
    console.log('Directions URL:', url);
    
    Linking.openURL(url).catch((error) => {
      console.error('Failed to open directions:', error);
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
    
    // Handle Google Places API format
    if (hours.weekday_text && Array.isArray(hours.weekday_text)) {
      const today = new Date().getDay();
      const todayText = hours.weekday_text[today === 0 ? 6 : today - 1]; // Convert Sunday=0 to Saturday=6
      return todayText || 'Hours not available';
    }
    
    // Handle custom format
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = hours[today];
    
    if (!todayHours || todayHours === 'closed') {
      return 'Closed today';
    }
    
    if (typeof todayHours === 'string') {
      return todayHours;
    }
    
    if (todayHours.open && todayHours.close) {
      return `Open today: ${todayHours.open} - ${todayHours.close}`;
    }
    
    return 'Hours not available';
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

  // For recommendations context, we don't need listPlace
  const isRecommendationsContext = listId === 'recommendations';
  
  if (!place || (!isRecommendationsContext && !listPlace)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg }}>
          <Body color="secondary" style={{ textAlign: 'center' }}>
            {!place ? 'Place not found' : 'Place no longer in this list'}
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
          {photoUrls.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              style={{ height: 200 }}
            >
              {photoUrls.map((photo: string, index: number) => (
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
          )}

          <View style={{ padding: Spacing.lg }}>
            {/* Place Header */}
            <View style={{ marginBottom: Spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Title1 style={{ marginBottom: Spacing.xs }}>{place.name}</Title1>
                  
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}
                    onPress={() => {
                      let url;
                      
                      // Use Google Place ID if available (most accurate)
                      if (place.google_place_id) {
                        const encodedName = encodeURIComponent(place.name);
                        url = `https://www.google.com/maps/search/?api=1&query=${encodedName}&query_place_id=${place.google_place_id}`;
                      } else {
                        // Combine place name with address for better accuracy
                        const query = `${place.name} ${place.address}`;
                        const encodedQuery = encodeURIComponent(query);
                        url = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
                      }
                      
                      console.log('Opening maps for:', place.name);
                      console.log('Maps URL:', url);
                      
                      Linking.openURL(url).catch((error) => {
                        console.error('Failed to open maps:', error);
                        showToast('Unable to open maps', 'error');
                      });
                    }}
                  >
                    <MapPin size={14} color={DarkTheme.colors.semantic.tertiaryLabel} strokeWidth={2} />
                    <SecondaryText style={{ marginLeft: Spacing.xs, flex: 1, fontSize: 13 }}>
                      {place.address}
                    </SecondaryText>
                  </TouchableOpacity>


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
                    {extractDomain(place.website)}
                  </Body>
                  <ExternalLink size={14} color={DarkTheme.colors.accent.blue} strokeWidth={2} style={{ marginLeft: Spacing.xs }} />
                </TouchableOpacity>
              )}
            </ElevatedCard>

            {/* Ratings */}
            {(place.google_rating || (!isRecommendationsContext && userRating)) && (
              <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
                <Title3 style={{ marginBottom: Spacing.md }}>Ratings</Title3>
                
                <View style={{ gap: Spacing.md }}>
                  {/* Google Rating */}
                  {place.google_rating && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: DarkTheme.colors.accent.blue + '20',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: Spacing.sm,
                        }}>
                          <Body style={{ color: DarkTheme.colors.accent.blue, fontWeight: '600', fontSize: 12 }}>G</Body>
                        </View>
                        <View>
                          <Body>Google Rating</Body>
                          <SecondaryText style={{ fontSize: 12 }}>Based on user reviews</SecondaryText>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {renderStars(place.google_rating, 18)}
                        <Body style={{ marginLeft: Spacing.sm, fontWeight: '600' }}>{place.google_rating}</Body>
                      </View>
                    </View>
                  )}

                  {/* User Rating Selection - Only show for non-recommendation places */}
                  {!isRecommendationsContext && (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                        <Body>Your Rating</Body>
                        <SecondaryText style={{ marginLeft: Spacing.sm, fontSize: 12 }}>Personal preference</SecondaryText>
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
                            backgroundColor: userRating?.rating_type === 'thumbs_up' 
                              ? DarkTheme.colors.accent.green + '40' 
                              : DarkTheme.colors.semantic.tertiarySystemBackground,
                            paddingVertical: Spacing.sm,
                            borderRadius: DarkTheme.borderRadius.sm,
                            borderWidth: userRating?.rating_type === 'thumbs_up' ? 2 : 0,
                            borderColor: userRating?.rating_type === 'thumbs_up' ? DarkTheme.colors.accent.green : 'transparent',
                          }}
                        >
                          <Body style={{ fontSize: 20 }}>👍</Body>
                        </TouchableOpacity>

                        {/* Neutral */}
                        <TouchableOpacity 
                          onPress={() => handleUpdateRating('neutral')}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: userRating?.rating_type === 'neutral' 
                              ? DarkTheme.colors.semantic.secondaryLabel + '40' 
                              : DarkTheme.colors.semantic.tertiarySystemBackground,
                            paddingVertical: Spacing.sm,
                            borderRadius: DarkTheme.borderRadius.sm,
                            borderWidth: userRating?.rating_type === 'neutral' ? 2 : 0,
                            borderColor: userRating?.rating_type === 'neutral' ? DarkTheme.colors.semantic.secondaryLabel : 'transparent',
                          }}
                        >
                          <Body style={{ fontSize: 20 }}>😐</Body>
                        </TouchableOpacity>

                        {/* Thumbs Down */}
                        <TouchableOpacity 
                          onPress={() => handleUpdateRating('thumbs_down')}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: userRating?.rating_type === 'thumbs_down' 
                              ? DarkTheme.colors.accent.red + '40' 
                              : DarkTheme.colors.semantic.tertiarySystemBackground,
                            paddingVertical: Spacing.sm,
                            borderRadius: DarkTheme.borderRadius.sm,
                            borderWidth: userRating?.rating_type === 'thumbs_down' ? 2 : 0,
                            borderColor: userRating?.rating_type === 'thumbs_down' ? DarkTheme.colors.accent.red : 'transparent',
                          }}
                        >
                          <Body style={{ fontSize: 20 }}>👎</Body>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </ElevatedCard>
            )}

            {/* Notes - Only show for list context, not recommendations */}
            {!isRecommendationsContext && listPlace && (
              <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
                  <Title3>Notes</Title3>
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
            )}

            {/* Check-in History */}
            {checkIns.length > 0 && (
              <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                  <Title3>Recent Check-ins</Title3>
                  {(listPlace?.visit_count || 0) > 0 && (
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
                        {listPlace!.visit_count} {listPlace!.visit_count === 1 ? 'visit' : 'visits'}
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