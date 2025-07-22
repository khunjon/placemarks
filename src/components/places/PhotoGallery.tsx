import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { X, Trash2, Star, Camera } from '../icons';
import { DarkTheme } from '../../constants/theme';
import { photoService } from '../../services/photoService';
import { useAuth } from '../../services/auth-context';
import { UserPlacePhoto, Place } from '../../types';

interface PhotoGalleryProps {
  place: Place;
  onPhotoUpload?: () => void;
}

// Define a type for combined photos
type CombinedPhoto = {
  url: string;
  thumbnailUrl?: string;
  displayUrl?: string;
  caption?: string;
  isUserPhoto: boolean;
  photoId?: string;
  isPrimary?: boolean;
  userId?: string;
};

const { width: screenWidth } = Dimensions.get('window');
const PHOTO_SIZE = (screenWidth - DarkTheme.spacing.lg * 3) / 2;

export default function PhotoGallery({ place, onPhotoUpload }: PhotoGalleryProps) {
  const { user } = useAuth();
  const [userPhotos, setUserPhotos] = useState<UserPlacePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<CombinedPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUserPhotos();
  }, [place.google_place_id]);

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
            setDeleting(true);
            try {
              const { error } = await photoService.deletePhoto(photoId, user.id);
              if (!error) {
                setSelectedPhoto(null);
                await loadUserPhotos();
                onPhotoUpload?.();
              } else {
                Alert.alert('Error', 'Failed to delete photo');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo');
            } finally {
              setDeleting(false);
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
  const sortedPhotos: CombinedPhoto[] = userPhotos
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
        minHeight: 200,
      }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: DarkTheme.colors.semantic.quaternarySystemFill,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: DarkTheme.spacing.md,
        }}>
          <Camera size={32} color={DarkTheme.colors.semantic.tertiaryLabel} />
        </View>
        <Text style={{
          fontSize: 16,
          color: DarkTheme.colors.semantic.secondaryLabel,
          textAlign: 'center',
          marginBottom: DarkTheme.spacing.xs,
        }}>
          No photos yet
        </Text>
        <Text style={{
          fontSize: 14,
          color: DarkTheme.colors.semantic.tertiaryLabel,
          textAlign: 'center',
        }}>
          Be the first to add a photo!
        </Text>
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
            onPress={() => setSelectedPhoto(photo)}
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

      {/* Photo Viewer Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        {selectedPhoto && (
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
          }}>
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 50,
                right: DarkTheme.spacing.lg,
                padding: DarkTheme.spacing.sm,
                zIndex: 1,
              }}
              onPress={() => setSelectedPhoto(null)}
            >
              <X size={24} color="white" />
            </TouchableOpacity>

            <Image
              source={{ uri: selectedPhoto.displayUrl || selectedPhoto.url }}
              style={{
                width: screenWidth,
                height: screenWidth,
                resizeMode: 'contain',
              }}
            />

            {selectedPhoto.caption && (
              <View style={{
                position: 'absolute',
                bottom: 100,
                left: 0,
                right: 0,
                paddingHorizontal: DarkTheme.spacing.lg,
              }}>
                <Text style={{
                  fontSize: 16,
                  color: 'white',
                  textAlign: 'center',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: DarkTheme.spacing.md,
                  borderRadius: DarkTheme.borderRadius.md,
                }}>
                  {selectedPhoto.caption}
                </Text>
              </View>
            )}

            {selectedPhoto.isUserPhoto && selectedPhoto.userId === user?.id && (
              <View style={{
                position: 'absolute',
                bottom: DarkTheme.spacing.xl,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: DarkTheme.spacing.md,
              }}>
                {!selectedPhoto.isPrimary && (
                  <TouchableOpacity
                    onPress={() => handleSetPrimary(selectedPhoto.photoId!)}
                    style={{
                      backgroundColor: DarkTheme.colors.accent.blue,
                      paddingVertical: DarkTheme.spacing.sm,
                      paddingHorizontal: DarkTheme.spacing.lg,
                      borderRadius: DarkTheme.borderRadius.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Star size={16} color="white" style={{ marginRight: DarkTheme.spacing.xs }} />
                    <Text style={{ color: 'white', fontWeight: '500' }}>
                      Set as Primary
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  onPress={() => handleDeletePhoto(selectedPhoto.photoId!)}
                  disabled={deleting}
                  style={{
                    backgroundColor: DarkTheme.colors.status.error,
                    paddingVertical: DarkTheme.spacing.sm,
                    paddingHorizontal: DarkTheme.spacing.lg,
                    borderRadius: DarkTheme.borderRadius.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: deleting ? 0.5 : 1,
                  }}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Trash2 size={16} color="white" style={{ marginRight: DarkTheme.spacing.xs }} />
                      <Text style={{ color: 'white', fontWeight: '500' }}>
                        Delete
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </Modal>
    </>
  );
}