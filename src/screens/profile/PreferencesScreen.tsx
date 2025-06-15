import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../services/auth-context';
import { profileService } from '../../services/profile';
import {
  BangkokDistrict,
  CuisineType,
  DietaryRestriction,
  PriceRange,
  TransportMethod,
  ActivityType,
  UserPreferences,
} from '../../types';

// Simple preference types to avoid conflicts
interface SimplePreferences {
  preferred_districts: string[];
  cuisine_preferences: string[];
  dietary_restrictions: string[];
  price_range: string;
  transportation_methods: string[];
  activity_types: string[];
  typical_group_size: string;
  notifications: {
    recommendations: boolean;
    check_in_reminders: boolean;
    social_updates: boolean;
    marketing: boolean;
  };
  privacy: {
    profile_visibility: string;
    location_sharing: boolean;
    check_in_visibility: string;
    list_sharing_default: string;
  };
}

// District options with Thai names
const DISTRICT_OPTIONS: { key: BangkokDistrict; label: string; description: string }[] = [
  { key: 'sukhumvit', label: 'Sukhumvit', description: 'Shopping, nightlife, expat area' },
  { key: 'silom', label: 'Silom', description: 'Business district, nightlife' },
  { key: 'siam', label: 'Siam', description: 'Shopping malls, central Bangkok' },
  { key: 'chatuchak', label: 'Chatuchak', description: 'Weekend market, local culture' },
  { key: 'khao_san', label: 'Khao San', description: 'Backpacker area, street food' },
  { key: 'thonglor', label: 'Thonglor', description: 'Trendy dining, upscale' },
  { key: 'ekkamai', label: 'Ekkamai', description: 'Hip cafes, nightlife' },
  { key: 'ari', label: 'Ari', description: 'Local neighborhood, authentic food' },
  { key: 'phrom_phong', label: 'Phrom Phong', description: 'Expat-friendly, shopping' },
  { key: 'asok', label: 'Asok', description: 'Business, entertainment' },
];

const CUISINE_OPTIONS: { key: CuisineType; label: string }[] = [
  { key: 'thai', label: 'Thai' },
  { key: 'japanese', label: 'Japanese' },
  { key: 'korean', label: 'Korean' },
  { key: 'chinese', label: 'Chinese' },
  { key: 'italian', label: 'Italian' },
  { key: 'american', label: 'American' },
  { key: 'indian', label: 'Indian' },
  { key: 'mexican', label: 'Mexican' },
  { key: 'french', label: 'French' },
  { key: 'vietnamese', label: 'Vietnamese' },
  { key: 'street_food', label: 'Street Food' },
  { key: 'seafood', label: 'Seafood' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'desserts', label: 'Desserts' },
];

const DIETARY_OPTIONS: { key: DietaryRestriction; label: string }[] = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
  { key: 'gluten_free', label: 'Gluten Free' },
  { key: 'dairy_free', label: 'Dairy Free' },
  { key: 'nut_free', label: 'Nut Free' },
  { key: 'low_carb', label: 'Low Carb' },
  { key: 'keto', label: 'Keto' },
];

const PRICE_OPTIONS: { key: PriceRange; label: string; description: string }[] = [
  { key: 'budget', label: 'Budget', description: '฿50-150 per meal' },
  { key: 'moderate', label: 'Moderate', description: '฿150-400 per meal' },
  { key: 'upscale', label: 'Upscale', description: '฿400-800 per meal' },
  { key: 'luxury', label: 'Luxury', description: '฿800+ per meal' },
];

const TRANSPORT_OPTIONS: { key: TransportMethod; label: string }[] = [
  { key: 'bts', label: 'BTS Skytrain' },
  { key: 'mrt', label: 'MRT Subway' },
  { key: 'bus', label: 'Bus' },
  { key: 'taxi', label: 'Taxi' },
  { key: 'grab', label: 'Grab' },
  { key: 'walking', label: 'Walking' },
  { key: 'motorcycle', label: 'Motorcycle Taxi' },
  { key: 'car', label: 'Own Car' },
];

const ACTIVITY_OPTIONS: { key: ActivityType; label: string }[] = [
  { key: 'dining', label: 'Dining' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'nightlife', label: 'Nightlife' },
  { key: 'culture', label: 'Culture & Arts' },
  { key: 'nature', label: 'Nature & Parks' },
  { key: 'fitness', label: 'Fitness & Sports' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'business', label: 'Business' },
  { key: 'relaxation', label: 'Relaxation & Spa' },
];

export default function PreferencesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<SimplePreferences>({
    preferred_districts: ['sukhumvit', 'siam', 'silom'],
    cuisine_preferences: ['thai', 'japanese', 'street_food'],
    dietary_restrictions: [],
    price_range: 'moderate',
    transportation_methods: ['bts', 'grab', 'walking'],
    activity_types: ['dining', 'shopping', 'culture'],
    typical_group_size: 'couple',
    notifications: {
      recommendations: true,
      check_in_reminders: true,
      social_updates: false,
      marketing: false,
    },
    privacy: {
      profile_visibility: 'friends',
      location_sharing: true,
      check_in_visibility: 'friends',
      list_sharing_default: 'friends',
    },
  });

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await profileService.getUserProfile(user.id);
      if (error) {
        console.log('Error loading preferences:', error);
      }

      if (data?.preferences) {
        // Map the loaded preferences to our simple structure
        setPreferences(prev => ({
          ...prev,
          ...data.preferences,
        }));
      }
    } catch (error) {
      console.log('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await profileService.updatePreferences(user.id, preferences as any);
      if (error) {
        Alert.alert('Error', 'Failed to save preferences');
        return;
      }

      Alert.alert('Success', 'Preferences saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    const index = array.indexOf(item);
    if (index > -1) {
      return array.filter((_, i) => i !== index);
    } else {
      return [...array, item];
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Preferences</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={savePreferences}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bangkok Districts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Districts</Text>
          <Text style={styles.sectionDescription}>
            Select the Bangkok areas you like to visit
          </Text>
          <View style={styles.optionsGrid}>
            {DISTRICT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionCard,
                  preferences.preferred_districts.includes(option.key) && styles.selectedOption,
                ]}
                onPress={() =>
                  setPreferences(prev => ({
                    ...prev,
                    preferred_districts: toggleArrayItem(prev.preferred_districts, option.key),
                  }))
                }
              >
                <Text
                  style={[
                    styles.optionLabel,
                    preferences.preferred_districts.includes(option.key) && styles.selectedOptionText,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    preferences.preferred_districts.includes(option.key) && styles.selectedOptionDescription,
                  ]}
                >
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cuisine Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuisine Preferences</Text>
          <View style={styles.tagsContainer}>
            {CUISINE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.tag,
                  preferences.cuisine_preferences.includes(option.key) && styles.selectedTag,
                ]}
                onPress={() =>
                  setPreferences(prev => ({
                    ...prev,
                    cuisine_preferences: toggleArrayItem(prev.cuisine_preferences, option.key),
                  }))
                }
              >
                <Text
                  style={[
                    styles.tagText,
                    preferences.cuisine_preferences.includes(option.key) && styles.selectedTagText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dietary Restrictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          <View style={styles.tagsContainer}>
            {DIETARY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.tag,
                  preferences.dietary_restrictions.includes(option.key) && styles.selectedTag,
                ]}
                onPress={() =>
                  setPreferences(prev => ({
                    ...prev,
                    dietary_restrictions: toggleArrayItem(prev.dietary_restrictions, option.key),
                  }))
                }
              >
                <Text
                  style={[
                    styles.tagText,
                    preferences.dietary_restrictions.includes(option.key) && styles.selectedTagText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <Text style={styles.sectionDescription}>
            Your typical spending per meal
          </Text>
          {PRICE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.radioOption,
                preferences.price_range === option.key && styles.selectedRadio,
              ]}
              onPress={() => setPreferences(prev => ({ ...prev, price_range: option.key }))}
            >
              <View style={styles.radioButton}>
                {preferences.price_range === option.key && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.radioContent}>
                <Text style={styles.radioLabel}>{option.label}</Text>
                <Text style={styles.radioDescription}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transportation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transportation Methods</Text>
          <View style={styles.tagsContainer}>
            {TRANSPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.tag,
                  preferences.transportation_methods.includes(option.key) && styles.selectedTag,
                ]}
                onPress={() =>
                  setPreferences(prev => ({
                    ...prev,
                    transportation_methods: toggleArrayItem(prev.transportation_methods, option.key),
                  }))
                }
              >
                <Text
                  style={[
                    styles.tagText,
                    preferences.transportation_methods.includes(option.key) && styles.selectedTagText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activity Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Types</Text>
          <View style={styles.tagsContainer}>
            {ACTIVITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.tag,
                  preferences.activity_types.includes(option.key) && styles.selectedTag,
                ]}
                onPress={() =>
                  setPreferences(prev => ({
                    ...prev,
                    activity_types: toggleArrayItem(prev.activity_types, option.key),
                  }))
                }
              >
                <Text
                  style={[
                    styles.tagText,
                    preferences.activity_types.includes(option.key) && styles.selectedTagText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Group Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Typical Group Size</Text>
          {(['solo', 'couple', 'small_group', 'large_group'] as const).map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.radioOption,
                preferences.typical_group_size === size && styles.selectedRadio,
              ]}
              onPress={() => setPreferences(prev => ({ ...prev, typical_group_size: size }))}
            >
              <View style={styles.radioButton}>
                {preferences.typical_group_size === size && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioLabel}>
                {size.charAt(0).toUpperCase() + size.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Recommendations</Text>
            <Switch
              value={preferences.notifications.recommendations}
              onValueChange={(value) =>
                setPreferences(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, recommendations: value },
                }))
              }
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Check-in Reminders</Text>
            <Switch
              value={preferences.notifications.check_in_reminders}
              onValueChange={(value) =>
                setPreferences(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, check_in_reminders: value },
                }))
              }
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Social Updates</Text>
            <Switch
              value={preferences.notifications.social_updates}
              onValueChange={(value) =>
                setPreferences(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, social_updates: value },
                }))
              }
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Marketing</Text>
            <Switch
              value={preferences.notifications.marketing}
              onValueChange={(value) =>
                setPreferences(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, marketing: value },
                }))
              }
            />
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Location Sharing</Text>
            <Switch
              value={preferences.privacy.location_sharing}
              onValueChange={(value) =>
                setPreferences(prev => ({
                  ...prev,
                  privacy: { ...prev.privacy, location_sharing: value },
                }))
              }
            />
          </View>
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
  saveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  selectedOption: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  selectedOptionText: {
    color: '#2563eb',
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  selectedOptionDescription: {
    color: '#1d4ed8',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedTag: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tagText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#ffffff',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedRadio: {
    backgroundColor: '#f8fafc',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  radioDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  switchLabel: {
    fontSize: 16,
    color: '#1e293b',
  },
  footer: {
    height: 40,
  },
}); 