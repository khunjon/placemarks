import React, { useState } from 'react';
import { TouchableOpacity, Alert, ActivityIndicator, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from '../icons';
import { DarkTheme } from '../../constants/theme';
import { photoService } from '../../services/photoService';
import { useAuth } from '../../services/auth-context';

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

  const handleUploadPhoto = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to upload photos.');
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
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
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
      Alert.alert('Permission Required', 'Photo library permission is required to select photos.');
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
        Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
      } else {
        Alert.alert('Success', 'Photo uploaded successfully!');
        onPhotoUploaded?.();
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert('Upload Failed', 'An unexpected error occurred.');
    } finally {
      setUploading(false);
    }
  };

  if (compact) {
    return (
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
    );
  }

  return (
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
  );
}