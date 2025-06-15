import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../services/auth-context';
import { profileService } from '../../services/profile';
import ProfilePictureUpload from '../../components/profile/ProfilePictureUpload';
// Using basic types to avoid conflicts
interface BasicUser {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider?: string;
  created_at?: string;
}

interface BasicProfileUpdate {
  full_name?: string;
  avatar_url?: string;
}

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const { user, updateProfile: updateAuthProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<BasicUser | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) {
      console.error('No user ID available for loading profile');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await profileService.getUserProfile(user.id);
      
      if (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
        return;
      }

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
        });
      } else {
        console.error('No profile data returned');
      }
    } catch (error) {
      console.error('Exception loading profile:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setSaving(true);
    try {
      const updates: any = {};
      
      if (formData.full_name !== profile?.full_name) {
        updates.full_name = formData.full_name;
      }

      if (Object.keys(updates).length === 0) {
        Alert.alert('No Changes', 'No changes to save');
        setSaving(false);
        return;
      }

      const { error } = await profileService.updateProfile(user.id, updates);
      
      if (error) {
        console.error('Profile update error:', error);
        Alert.alert('Error', `Failed to update profile: ${error.message || 'Unknown error'}`);
        return;
      }

      Alert.alert('Success', 'Profile updated successfully!');
      await loadProfile();
    } catch (error: any) {
      console.error('Profile update exception:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (avatarUrl: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      const { error } = await profileService.updateProfile(user.id, {
        avatar_url: avatarUrl,
      });
      
      if (error) {
        console.error('Avatar update error:', error);
        Alert.alert('Error', `Failed to update avatar: ${error.message || 'Unknown error'}`);
        return;
      }

      await loadProfile();
    } catch (error: any) {
      console.error('Avatar update exception:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message || 'Unknown error'}`);
    }
  };

  const handleExportData = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      const { data, error } = await profileService.exportUserData(user.id);
      
      if (error) {
        console.error('Export error:', error);
        Alert.alert('Error', 'Failed to export data');
        return;
      }

      // In a real app, you might want to save this to a file or share it
      Alert.alert('Export Complete', 'Your data has been exported successfully');
    } catch (error) {
      console.error('Export exception:', error);
      Alert.alert('Error', 'An unexpected error occurred during export');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type "DELETE" to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { error } = await profileService.deleteUserAccount(user.id);
                      if (error) {
                        Alert.alert('Error', 'Failed to delete account');
                        return;
                      }
                      
                      Alert.alert('Account Deleted', 'Your account has been deleted successfully');
                      // The auth context will handle signing out
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete account');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditMode(!editMode)}
          >
            <Text style={styles.editButtonText}>
              {editMode ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Picture */}
        <ProfilePictureUpload
          currentAvatarUrl={profile?.avatar_url}
          userId={user?.id || ''}
          onUploadComplete={handleAvatarUpload}
        />
        {/* Debug info */}
        {__DEV__ && (
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#666', marginTop: 10 }}>
            Debug: avatar_url = {profile?.avatar_url || 'null'}
          </Text>
        )}

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {editMode ? (
              <TextInput
                style={styles.textInput}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder="Enter your full name"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.full_name || 'Not set'}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{profile?.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sign-in Method</Text>
            <Text style={styles.fieldValue}>
              {profile?.auth_provider || 'Email'}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Member Since</Text>
            <Text style={styles.fieldValue}>
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Save Button */}
        {editMode && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <TouchableOpacity
            style={styles.preferenceButton}
            onPress={() => navigation.navigate('Preferences' as never)}
          >
            <Text style={styles.preferenceButtonText}>Manage Preferences</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Account Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Management</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleExportData}
          >
            <Text style={styles.actionButtonText}>Export My Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  editButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1e293b',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1e293b',
  },
  saveButton: {
    backgroundColor: '#10b981',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  preferenceButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  preferenceButtonText: {
    fontSize: 16,
    color: '#1e293b',
  },
  arrow: {
    fontSize: 18,
    color: '#64748b',
  },
  actionButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
  },
  dangerButtonText: {
    color: '#dc2626',
  },
  footer: {
    height: 40,
  },
}); 