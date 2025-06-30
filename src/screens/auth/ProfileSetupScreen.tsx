import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth';
import { UserPreferences } from '../../types';

const BANGKOK_DISTRICTS = [
  'Sukhumvit', 'Silom', 'Siam', 'Chatuchak', 'Thonglor', 'Ekkamai',
  'Ari', 'Phrom Phong', 'Asok', 'Sathorn', 'Lumpini', 'Ratchathewi'
];

const CUISINE_TYPES = [
  'Thai', 'Japanese', 'Korean', 'Chinese', 'Italian', 'American',
  'Indian', 'Mexican', 'French', 'Mediterranean', 'Vietnamese', 'Fusion'
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free', 'Dairy-Free',
  'Nut-Free', 'Seafood Allergy', 'No Pork', 'No Beef'
];

export default function ProfileSetupScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    favorite_districts: [],
    dietary_restrictions: [],
    preferred_cuisines: [],
    price_range: 'mid',
    transport_preference: 'bts',
    activity_types: [],
  });

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const handleDistrictToggle = (district: string) => {
    setPreferences(prev => ({
      ...prev,
      favorite_districts: toggleArrayItem(prev.favorite_districts, district),
    }));
  };

  const handleCuisineToggle = (cuisine: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_cuisines: toggleArrayItem(prev.preferred_cuisines, cuisine),
    }));
  };

  const handleDietaryToggle = (restriction: string) => {
    setPreferences(prev => ({
      ...prev,
      dietary_restrictions: toggleArrayItem(prev.dietary_restrictions || [], restriction),
    }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await authService.updateProfile({ preferences });
      Alert.alert(
        'Profile Updated!',
        'Your preferences have been saved. You can always update them later in settings.',
        [{ text: 'Continue', onPress: () => navigation.navigate('Home' as never) }]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Setup?',
      'You can set up your preferences later in the app settings.',
      [
        { text: 'Go Back', style: 'cancel' },
        { text: 'Skip', onPress: () => navigation.navigate('Home' as never) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>
            Help us personalize your Bangkok experience
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Districts</Text>
          <Text style={styles.sectionDescription}>
            Which areas of Bangkok do you love or want to explore?
          </Text>
          <View style={styles.tagContainer}>
            {BANGKOK_DISTRICTS.map((district) => (
              <TouchableOpacity
                key={district}
                style={[
                  styles.tag,
                  preferences.favorite_districts.includes(district) && styles.tagSelected,
                ]}
                onPress={() => handleDistrictToggle(district)}
              >
                <Text
                  style={[
                    styles.tagText,
                    preferences.favorite_districts.includes(district) && styles.tagTextSelected,
                  ]}
                >
                  {district}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food Preferences</Text>
          <Text style={styles.sectionDescription}>
            What types of cuisine do you enjoy?
          </Text>
          <View style={styles.tagContainer}>
            {CUISINE_TYPES.map((cuisine) => (
              <TouchableOpacity
                key={cuisine}
                style={[
                  styles.tag,
                  preferences.preferred_cuisines.includes(cuisine) && styles.tagSelected,
                ]}
                onPress={() => handleCuisineToggle(cuisine)}
              >
                <Text
                  style={[
                    styles.tagText,
                    preferences.preferred_cuisines.includes(cuisine) && styles.tagTextSelected,
                  ]}
                >
                  {cuisine}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          <Text style={styles.sectionDescription}>
            Any dietary requirements we should know about?
          </Text>
          <View style={styles.tagContainer}>
            {DIETARY_RESTRICTIONS.map((restriction) => (
              <TouchableOpacity
                key={restriction}
                style={[
                  styles.tag,
                  (preferences.dietary_restrictions || []).includes(restriction) && styles.tagSelected,
                ]}
                onPress={() => handleDietaryToggle(restriction)}
              >
                <Text
                  style={[
                    styles.tagText,
                    (preferences.dietary_restrictions || []).includes(restriction) && styles.tagTextSelected,
                  ]}
                >
                  {restriction}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <Text style={styles.sectionDescription}>
            What's your typical spending preference?
          </Text>
          <View style={styles.priceContainer}>
            {[
              { key: 'budget', label: 'Budget', description: '฿ - Street food & local spots' },
              { key: 'mid', label: 'Mid-range', description: '฿฿ - Casual dining' },
              { key: 'upscale', label: 'Upscale', description: '฿฿฿ - Fine dining' },
              { key: 'luxury', label: 'Luxury', description: '฿฿฿฿ - Premium experiences' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.priceOption,
                  preferences.price_range === option.key && styles.priceOptionSelected,
                ]}
                onPress={() => setPreferences(prev => ({ ...prev, price_range: option.key as any }))}
              >
                <Text
                  style={[
                    styles.priceLabel,
                    preferences.price_range === option.key && styles.priceLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.priceDescription,
                    preferences.price_range === option.key && styles.priceDescriptionSelected,
                  ]}
                >
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transportation</Text>
          <Text style={styles.sectionDescription}>
            How do you prefer to get around Bangkok?
          </Text>
          <View style={styles.transportContainer}>
            {[
              { key: 'bts', label: 'BTS/MRT', description: 'Sky train & subway' },
              { key: 'taxi', label: 'Taxi/Grab', description: 'Car rides' },
              { key: 'walking', label: 'Walking', description: 'On foot exploration' },
              { key: 'car', label: 'Own Car', description: 'Personal vehicle' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.transportOption,
                  preferences.transport_preference === option.key && styles.transportOptionSelected,
                ]}
                onPress={() => setPreferences(prev => ({ ...prev, transport_preference: option.key as any }))}
              >
                <Text
                  style={[
                    styles.transportLabel,
                    preferences.transport_preference === option.key && styles.transportLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.transportDescription,
                    preferences.transport_preference === option.key && styles.transportDescriptionSelected,
                  ]}
                >
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save & Continue'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tagSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tagText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  tagTextSelected: {
    color: 'white',
  },
  priceContainer: {
    gap: 12,
  },
  priceOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priceOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  priceLabelSelected: {
    color: '#2563eb',
  },
  priceDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  priceDescriptionSelected: {
    color: '#1d4ed8',
  },
  transportContainer: {
    gap: 12,
  },
  transportOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  transportOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  transportLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  transportLabelSelected: {
    color: '#2563eb',
  },
  transportDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  transportDescriptionSelected: {
    color: '#1d4ed8',
  },
  buttonContainer: {
    gap: 16,
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: 16,
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
}); 