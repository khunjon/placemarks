import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { profileService } from '../../services/profile';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string;
  userId: string;
  onUploadComplete: (avatarUrl: string) => void;
  size?: number;
}

export default function ProfilePictureUpload({
  currentAvatarUrl,
  userId,
  onUploadComplete,
  size = 120,
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  // Clear local image URI when currentAvatarUrl changes (after successful upload)
  useEffect(() => {
    if (currentAvatarUrl && !uploading) {
      setLocalImageUri(null);
    }
  }, [currentAvatarUrl, uploading]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload a profile picture.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Select Photo',
      'Choose how you want to select your profile picture',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Photo Library',
          onPress: () => openImagePicker(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  const openImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string) => {
    setUploading(true);
    try {
      const { data: avatarUrl, error } = await profileService.uploadAvatar(userId, imageUri);
      
      if (error) {
        console.error('Upload error:', error);
        Alert.alert('Upload Error', `Failed to upload profile picture: ${error.message || 'Unknown error'}`);
        setLocalImageUri(null);
        return;
      }

      if (avatarUrl) {
        onUploadComplete(avatarUrl);
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        console.error('Upload returned no avatar URL');
        Alert.alert('Error', 'Upload completed but no URL returned');
        setLocalImageUri(null);
      }
    } catch (error: any) {
      console.error('Upload exception:', error);
      Alert.alert('Error', `An unexpected error occurred while uploading: ${error.message || 'Unknown error'}`);
      setLocalImageUri(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setLocalImageUri(null);
            onUploadComplete('');
          },
        },
      ]
    );
  };

  const displayImageUri = localImageUri || currentAvatarUrl;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.imageContainer, { width: size, height: size }]}
        onPress={pickImage}
        disabled={uploading}
      >
        {displayImageUri ? (
          <Image
            key={displayImageUri} // Force re-render when URI changes
            source={{ uri: displayImageUri }}
            style={[styles.image, { width: size, height: size }]}
            onError={(error) => console.error('Image load error:', error)}
          />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size }]}>
            <Text style={styles.placeholderText}>Add Photo</Text>
          </View>
        )}
        
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.changeButton}
          onPress={pickImage}
          disabled={uploading}
        >
          <Text style={styles.changeButtonText}>
            {displayImageUri ? 'Change Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>

        {displayImageUri && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={removeImage}
            disabled={uploading}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  imageContainer: {
    borderRadius: 60,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    borderRadius: 60,
  },
  placeholder: {
    backgroundColor: '#e2e8f0',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  changeButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 