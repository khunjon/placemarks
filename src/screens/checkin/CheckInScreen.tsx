import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { 
  CheckInContext, 
  WeatherContext, 
  CompanionType, 
  MealType, 
  TransportationMethod,
  AspectRatings,
  BANGKOK_TAGS
} from '../../types/checkins';
import { checkInsService } from '../../services/checkins';
import RatingSystem from '../../components/checkin/RatingSystem';
import ContextCapture from '../../components/checkin/ContextCapture';
import PhotoUpload from '../../components/checkin/PhotoUpload';

type CheckInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CheckIn'>;
type CheckInScreenRouteProp = RouteProp<RootStackParamList, 'CheckIn'>;

interface Props {
  navigation: CheckInScreenNavigationProp;
  route: CheckInScreenRouteProp;
}

export default function CheckInScreen({ navigation, route }: Props) {
  const { placeId, placeName } = route.params;

  // Form state
  const [overallRating, setOverallRating] = useState(0);
  const [aspectRatings, setAspectRatings] = useState<AspectRatings>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Context state
  const [context, setContext] = useState<CheckInContext>({
    environment: 'indoor',
    location_type: 'building',
    bts_proximity: 'near',
    air_conditioning: true,
    noise_level: 'moderate',
    price_tier: 'casual',
    crowd_level: 'moderate',
    wifi_available: false,
    parking_available: false,
  });

  const [weatherContext, setWeatherContext] = useState<WeatherContext>({
    condition: 'sunny',
    temperature_feel: 'warm',
    humidity_level: 'moderate',
  });

  const [companionType, setCompanionType] = useState<CompanionType>('solo');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [transportationMethod, setTransportationMethod] = useState<TransportationMethod>('bts');
  const [visitDuration, setVisitDuration] = useState<number>(60);
  const [wouldReturn, setWouldReturn] = useState(true);

  // Auto-detect current time and suggest meal type
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 10) setMealType('breakfast');
    else if (hour < 12) setMealType('brunch');
    else if (hour < 15) setMealType('lunch');
    else if (hour < 17) setMealType('afternoon_snack');
    else if (hour < 22) setMealType('dinner');
    else setMealType('late_night');
  }, []);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const validateForm = (): boolean => {
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please provide an overall rating for this place.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const checkInData = {
        place_id: placeId,
        rating: overallRating,
        aspect_ratings: aspectRatings,
        tags: selectedTags,
        context,
        photos,
        notes: notes.trim() || undefined,
        weather_context: weatherContext,
        companion_type: companionType,
        meal_type: mealType,
        transportation_method: transportationMethod,
        visit_duration: visitDuration,
        would_return: wouldReturn,
      };

      await checkInsService.createCheckIn(checkInData);

      Alert.alert(
        'Check-in Saved!',
        'Your check-in has been saved successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating check-in:', error);
      Alert.alert(
        'Error',
        'Failed to save your check-in. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTagSection = () => {
    const allTags = [
      ...BANGKOK_TAGS.FOOD,
      ...BANGKOK_TAGS.ATMOSPHERE,
      ...BANGKOK_TAGS.LOCATION,
      ...BANGKOK_TAGS.EXPERIENCE,
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags</Text>
        <Text style={styles.sectionSubtitle}>
          Help others discover this place (optional)
        </Text>
        <View style={styles.tagsContainer}>
          {allTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagButton,
                selectedTags.includes(tag) && styles.selectedTag,
              ]}
              onPress={() => handleTagToggle(tag)}
            >
              <Text style={[
                styles.tagText,
                selectedTags.includes(tag) && styles.selectedTagText,
              ]}>
                {tag.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Check in at</Text>
          <Text style={styles.placeName}>{placeName}</Text>
        </View>

        {/* Rating System */}
        <RatingSystem
          overallRating={overallRating}
          aspectRatings={aspectRatings}
          onOverallRatingChange={setOverallRating}
          onAspectRatingChange={(aspect, rating) => 
            setAspectRatings(prev => ({ ...prev, [aspect]: rating }))
          }
        />

        {/* Photo Upload */}
        <PhotoUpload
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={5}
        />

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Share your experience... (optional)"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            maxLength={500}
          />
          <Text style={styles.characterCount}>{notes.length}/500</Text>
        </View>

        {/* Tags */}
        {renderTagSection()}

        {/* Context Capture */}
        <ContextCapture
          context={context}
          weatherContext={weatherContext}
          companionType={companionType}
          mealType={mealType}
          transportationMethod={transportationMethod}
          visitDuration={visitDuration}
          wouldReturn={wouldReturn}
          onContextChange={setContext}
          onWeatherContextChange={setWeatherContext}
          onCompanionTypeChange={setCompanionType}
          onMealTypeChange={setMealType}
          onTransportationMethodChange={setTransportationMethod}
          onVisitDurationChange={setVisitDuration}
          onWouldReturnChange={setWouldReturn}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Saving Check-in...' : 'Save Check-in'}
          </Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  placeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedTag: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  tagText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
}); 