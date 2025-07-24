import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import PhotoUploadButton from './PhotoUploadButton';
import SwipeablePhotoViewer, { SwipeablePhoto } from './SwipeablePhotoViewer';
import { DarkTheme } from '../../constants/theme';
import { photoService } from '../../services/photoService';
import { useAuth } from '../../services/auth-context';
import { UserPlacePhoto, Place } from '../../types';

interface PhotoGalleryProps {
  place: Place;
  onPhotoUpload?: () => void;
  userPhotos?: UserPlacePhoto[]; // Optional pre-loaded photos to avoid duplicate loading
}

const { width: screenWidth } = Dimensions.get('window');
const PHOTO_SIZE = (screenWidth - DarkTheme.spacing.lg * 3) / 2;

export default function PhotoGallery({ place, onPhotoUpload, userPhotos: initialUserPhotos }: PhotoGalleryProps) {
  const { user } = useAuth();
  const [userPhotos, setUserPhotos] = useState<UserPlacePhoto[]>(initialUserPhotos || []);
  const [loading, setLoading] = useState(!initialUserPhotos); // Only show loading if photos weren't provided
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  useEffect(() => {
    // Only load photos if they weren't provided as props
    if (!initialUserPhotos) {
      loadUserPhotos();
    }
  }, [place.google_place_id, initialUserPhotos]);

  const loadUserPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await photoService.getPlacePhotos(place.google_place_id);
      if (!error && data) {
        setUserPhotos(data);
      }
    } catch (error) {
      console.error('Failed to load user photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!user) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await photoService.deletePhoto(photoId, user.id);
              if (!error) {
                setViewerVisible(false);
                setSelectedPhotoIndex(null);
                await loadUserPhotos();
                onPhotoUpload?.();
              } else {
                Alert.alert('Error', 'Failed to delete photo');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo');
            }
          }
        }
      ]
    );
  };

  const handleSetPrimary = async (photoId: string) => {
    if (!user) return;

    try {
      const { error } = await photoService.updatePhoto(
        photoId,
        user.id,
        { is_primary: true }
      );
      if (!error) {
        await loadUserPhotos();
        Alert.alert('Success', 'Photo set as primary');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update photo');
    }
  };

  // Only use user photos (no Google photos to avoid API charges)
  const sortedPhotos: SwipeablePhoto[] = userPhotos
    .map(photo => ({
      url: photo.photo_url,
      thumbnailUrl: photo.thumbnail_url,
      displayUrl: photo.display_url,
      caption: photo.caption,
      isUserPhoto: true,
      photoId: photo.id,
      isPrimary: photo.is_primary,
      userId: photo.user_id
    }))
    .sort((a, b) => {
      // Sort by primary status first
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });
  
  const handlePhotoPress = (index: number) => {
    setSelectedPhotoIndex(index);
    setViewerVisible(true);
  };

  if (loading) {
    return (
      <View style={{ padding: DarkTheme.spacing.lg }}>
        <ActivityIndicator size="large" color={DarkTheme.colors.accent.blue} />
      </View>
    );
  }

  if (sortedPhotos.length === 0) {
    return (
      <View style={{ 
        padding: DarkTheme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 180,
      }}>
        <Text style={{
          fontSize: 16,
          color: DarkTheme.colors.semantic.secondaryLabel,
          textAlign: 'center',
          marginBottom: DarkTheme.spacing.lg,
        }}>
          Be the first to add a photo!
        </Text>
        <PhotoUploadButton
          googlePlaceId={place.google_place_id}
          onPhotoUploaded={() => {
            loadUserPhotos();
            onPhotoUpload?.();
          }}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: DarkTheme.spacing.md }}
        contentContainerStyle={{ paddingHorizontal: DarkTheme.spacing.lg }}
      >
        {sortedPhotos.map((photo, index) => (
          <TouchableOpacity
            key={`${photo.url}-${index}`}
            onPress={() => handlePhotoPress(index)}
            style={{ marginRight: DarkTheme.spacing.sm }}
          >
            <View>
              <Image
                source={{ uri: photo.thumbnailUrl || photo.url }}
                style={{
                  width: PHOTO_SIZE,
                  height: PHOTO_SIZE,
                  borderRadius: DarkTheme.borderRadius.md,
                  backgroundColor: DarkTheme.colors.semantic.quaternarySystemFill,
                }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                recyclingKey={photo.photoId || photo.url}
                priority="high"
              />
              {photo.isPrimary && (
                <View style={{
                  position: 'absolute',
                  top: DarkTheme.spacing.xs,
                  left: DarkTheme.spacing.xs,
                  backgroundColor: DarkTheme.colors.accent.blue,
                  paddingHorizontal: DarkTheme.spacing.sm,
                  paddingVertical: 2,
                  borderRadius: DarkTheme.borderRadius.sm,
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: 'white',
                  }}>PRIMARY</Text>
                </View>
              )}
              {photo.isUserPhoto && (
                <View style={{
                  position: 'absolute',
                  bottom: DarkTheme.spacing.xs,
                  left: DarkTheme.spacing.xs,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  paddingHorizontal: DarkTheme.spacing.sm,
                  paddingVertical: 2,
                  borderRadius: DarkTheme.borderRadius.sm,
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '500',
                    color: 'white',
                  }}>USER PHOTO</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Swipeable Photo Viewer */}
      <SwipeablePhotoViewer
        photos={sortedPhotos}
        initialIndex={selectedPhotoIndex || 0}
        visible={viewerVisible}
        onClose={() => {
          setViewerVisible(false);
          setSelectedPhotoIndex(null);
        }}
        onSetPrimary={handleSetPrimary}
        onDelete={handleDeletePhoto}
        currentUserId={user?.id}
      />
    </>
  );
}