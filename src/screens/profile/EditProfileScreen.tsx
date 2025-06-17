import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Camera, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { DarkTheme } from '../../constants/theme';
import { useAuth } from '../../services/auth-context';
import { authService } from '../../services/auth';

interface EditProfileScreenProps {
  navigation: any;
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(''); // Will add bio field to user type later
  const [avatarUri, setAvatarUri] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Check if there are any changes
    const nameChanged = name !== (user?.full_name || '');
    const bioChanged = bio !== '';
    const avatarChanged = avatarUri !== (user?.avatar_url || '');
    setHasChanges(nameChanged || bioChanged || avatarChanged);
  }, [name, bio, avatarUri, user]);

  const handleSave = async () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    // Prevent multiple simultaneous updates
    if (loading) {
      console.log('Update already in progress, ignoring...');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting profile update...');
      let finalAvatarUrl = avatarUri;

      // Upload new avatar if it's a local URI
      if (avatarUri && avatarUri.startsWith('file://')) {
        try {
          console.log('Uploading avatar...');
          finalAvatarUrl = await authService.uploadAvatar(avatarUri);
          console.log('Avatar uploaded successfully:', finalAvatarUrl);
        } catch (error) {
          console.error('Avatar upload error:', error);
          Alert.alert('Error', 'Failed to upload profile photo. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Update profile directly using authService instead of auth context
      const updateData: any = {
        full_name: name.trim(),
      };
      
      if (finalAvatarUrl && finalAvatarUrl !== user?.avatar_url) {
        updateData.avatar_url = finalAvatarUrl;
      }
      
      console.log('Updating profile with data:', updateData);
      
      // Call authService directly to avoid auth context complications
      await authService.updateProfile(updateData);
      
      console.log('Profile updated successfully');
      
      // Refresh the user data in auth context
      await refreshUser();
      
      // Navigate back immediately
      navigation.goBack();
      
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert('Error', `Failed to update profile: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose how you want to update your profile photo',
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const openImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is required to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: DarkTheme.colors.semantic.systemBackground 
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: DarkTheme.spacing.lg,
        paddingVertical: DarkTheme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: DarkTheme.colors.semantic.separator,
      }}>
        <TouchableOpacity
          onPress={handleCancel}
          style={{
            padding: DarkTheme.spacing.xs,
          }}
          activeOpacity={0.7}
        >
          <X 
            size={24} 
            color={DarkTheme.colors.semantic.label}
            strokeWidth={2}
          />
        </TouchableOpacity>

        <Text style={[
          DarkTheme.typography.title2,
          { 
            color: DarkTheme.colors.semantic.label,
            fontWeight: 'bold',
          }
        ]}>
          Edit Profile
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !hasChanges}
          style={{
            backgroundColor: hasChanges && !loading 
              ? DarkTheme.colors.bangkok.gold 
              : DarkTheme.colors.semantic.tertiarySystemBackground,
            paddingHorizontal: DarkTheme.spacing.md,
            paddingVertical: DarkTheme.spacing.xs,
            borderRadius: DarkTheme.borderRadius.md,
            opacity: loading ? 0.6 : 1,
          }}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator 
              size="small" 
              color={DarkTheme.colors.system.black} 
            />
          ) : (
            <Text style={[
              DarkTheme.typography.callout,
              { 
                color: hasChanges 
                  ? DarkTheme.colors.system.black 
                  : DarkTheme.colors.semantic.tertiaryLabel,
                fontWeight: '600',
              }
            ]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: DarkTheme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo Section */}
        <View style={{
          alignItems: 'center',
          paddingVertical: DarkTheme.spacing.xl,
          backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
        }}>
          <TouchableOpacity
            onPress={handleChangePhoto}
            activeOpacity={0.8}
            style={{
              position: 'relative',
              marginBottom: DarkTheme.spacing.md,
            }}
          >
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: DarkTheme.colors.bangkok.gold + '20',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: DarkTheme.colors.bangkok.gold,
              }}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{
                    width: 94,
                    height: 94,
                    borderRadius: 47,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <User
                  size={50}
                  color={DarkTheme.colors.bangkok.gold}
                  strokeWidth={2}
                />
              )}
            </View>

            {/* Camera Icon Overlay */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: DarkTheme.colors.bangkok.gold,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: DarkTheme.colors.semantic.secondarySystemBackground,
              }}
            >
              <Camera
                size={16}
                color={DarkTheme.colors.system.black}
                strokeWidth={2}
              />
            </View>
          </TouchableOpacity>

          <Text style={[
            DarkTheme.typography.callout,
            { 
              color: DarkTheme.colors.bangkok.gold,
              fontWeight: '600',
            }
          ]}>
            Change Photo
          </Text>
        </View>

        {/* Form Fields */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
          paddingTop: DarkTheme.spacing.lg,
        }}>
          {/* Name Field */}
          <View style={{ marginBottom: DarkTheme.spacing.lg }}>
            <Text style={[
              DarkTheme.typography.headline,
              { 
                color: DarkTheme.colors.semantic.label,
                marginBottom: DarkTheme.spacing.sm,
                fontWeight: '600',
              }
            ]}>
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
              style={[
                DarkTheme.typography.body,
                {
                  backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                  color: DarkTheme.colors.semantic.label,
                  paddingHorizontal: DarkTheme.spacing.md,
                  paddingVertical: DarkTheme.spacing.sm,
                  borderRadius: DarkTheme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: DarkTheme.colors.semantic.separator,
                  minHeight: 44,
                }
              ]}
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Text style={[
              DarkTheme.typography.caption2,
              { 
                color: DarkTheme.colors.semantic.tertiaryLabel,
                marginTop: DarkTheme.spacing.xs,
                textAlign: 'right',
              }
            ]}>
              {name.length}/50
            </Text>
          </View>

          {/* Bio Field */}
          <View style={{ marginBottom: DarkTheme.spacing.lg }}>
            <Text style={[
              DarkTheme.typography.headline,
              { 
                color: DarkTheme.colors.semantic.label,
                marginBottom: DarkTheme.spacing.sm,
                fontWeight: '600',
              }
            ]}>
              Bio
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us a bit about yourself..."
              placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
              style={[
                DarkTheme.typography.body,
                {
                  backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                  color: DarkTheme.colors.semantic.label,
                  paddingHorizontal: DarkTheme.spacing.md,
                  paddingVertical: DarkTheme.spacing.sm,
                  borderRadius: DarkTheme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: DarkTheme.colors.semantic.separator,
                  minHeight: 100,
                  textAlignVertical: 'top',
                }
              ]}
              maxLength={500}
              multiline
              numberOfLines={4}
              returnKeyType="default"
            />
            <Text style={[
              DarkTheme.typography.caption2,
              { 
                color: DarkTheme.colors.semantic.tertiaryLabel,
                marginTop: DarkTheme.spacing.xs,
                textAlign: 'right',
              }
            ]}>
              {bio.length}/500
            </Text>
          </View>

          {/* Help Text */}
          <View style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            padding: DarkTheme.spacing.md,
            borderRadius: DarkTheme.borderRadius.md,
            marginTop: DarkTheme.spacing.md,
          }}>
            <Text style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                lineHeight: 18,
              }
            ]}>
              Your profile information helps other users discover and connect with you. 
              Your name and bio will be visible to other users when you share lists or check-ins.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 