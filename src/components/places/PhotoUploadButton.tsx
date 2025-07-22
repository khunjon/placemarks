import React, { useState, Fragment } from 'react';
import { TouchableOpacity, Alert, ActivityIndicator, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from '../icons';
import { DarkTheme } from '../../constants/theme';
import { photoService } from '../../services/photoService';
import { useAuth } from '../../services/auth-context';
import Toast from '../ui/Toast';

interface PhotoUploadButtonProps {
  googlePlaceId: string;
  onPhotoUploaded?: () => void;
  compact?: boolean;
}

export default function PhotoUploadButton({ 
  googlePlaceId, 
  onPhotoUploaded,
  compact = false 
}: PhotoUploadButtonProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleUploadPhoto = () => {
    if (!user) {
      showToast('Please sign in to upload photos.', 'error');
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo for this place',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => openCamera() },
        { text: 'Choose from Library', onPress: () => openImagePicker() }
      ]
    );
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Camera permission is required to take photos.', 'error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      quality: 0.9,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const openImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Photo library permission is required to select photos.', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      quality: 0.9,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (imageUri: string) => {
    if (!user) return;

    setUploading(true);
    try {
      // Upload photo directly without caption prompt
      const { error } = await photoService.uploadPlacePhoto(
        user.id,
        googlePlaceId,
        imageUri,
        undefined // No caption - can be added later if needed
      );

      if (error) {
        showToast('Failed to upload photo. Please try again.', 'error');
      } else {
        showToast('Photo uploaded successfully!', 'success');
        onPhotoUploaded?.();
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      showToast('An unexpected error occurred.', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (compact) {
    return (
      <>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
        <TouchableOpacity
          onPress={handleUploadPhoto}
          disabled={uploading}
          style={{
            padding: DarkTheme.spacing.sm,
            backgroundColor: DarkTheme.colors.semantic.systemBackground,
            borderRadius: DarkTheme.borderRadius.md,
            borderWidth: 1,
            borderColor: DarkTheme.colors.semantic.separator,
          }}
        >
          {uploading ? (
            <ActivityIndicator 
              size="small" 
              color={DarkTheme.colors.accent.blue} 
            />
          ) : (
            <Camera 
              size={20} 
              color={DarkTheme.colors.accent.blue} 
            />
          )}
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <TouchableOpacity
        onPress={handleUploadPhoto}
        disabled={uploading}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: DarkTheme.colors.semantic.systemBackground,
          borderRadius: DarkTheme.borderRadius.md,
          borderWidth: 1,
          borderColor: DarkTheme.colors.semantic.separator,
          paddingVertical: DarkTheme.spacing.md,
          paddingHorizontal: DarkTheme.spacing.lg,
        }}
      >
        {uploading ? (
          <ActivityIndicator 
            size="small" 
            color={DarkTheme.colors.accent.blue} 
          />
        ) : (
          <>
            <Camera 
              size={20} 
              color={DarkTheme.colors.accent.blue} 
              style={{ marginRight: DarkTheme.spacing.sm }}
            />
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: DarkTheme.colors.accent.blue,
            }}>
              Add Photo
            </Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}