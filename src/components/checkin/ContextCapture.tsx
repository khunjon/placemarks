import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CheckInContext, WeatherContext, CompanionType, MealType, TransportationMethod } from '../../types';

interface ContextCaptureProps {
  context: CheckInContext;
  weatherContext: WeatherContext;
  companionType?: CompanionType;
  mealType?: MealType;
  transportationMethod?: TransportationMethod;
  visitDuration?: number;
  wouldReturn: boolean;
  onContextChange: (context: CheckInContext) => void;
  onWeatherContextChange: (weatherContext: WeatherContext) => void;
  onCompanionTypeChange: (companionType: CompanionType) => void;
  onMealTypeChange: (mealType: MealType) => void;
  onTransportationMethodChange: (method: TransportationMethod) => void;
  onVisitDurationChange: (duration: number) => void;
  onWouldReturnChange: (wouldReturn: boolean) => void;
}

export default function ContextCapture({
  context,
  weatherContext,
  companionType,
  mealType,
  transportationMethod,
  visitDuration,
  wouldReturn,
  onContextChange,
  onWeatherContextChange,
  onCompanionTypeChange,
  onMealTypeChange,
  onTransportationMethodChange,
  onVisitDurationChange,
  onWouldReturnChange,
}: ContextCaptureProps) {
  
  const renderOptionButtons = <T extends string>(
    title: string,
    options: { value: T; label: string; icon?: string }[],
    selectedValue: T | undefined,
    onSelect: (value: T) => void,
    allowMultiple: boolean = false
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              selectedValue === option.value && styles.selectedOption,
            ]}
            onPress={() => onSelect(option.value)}
          >
            {option.icon && <Text style={styles.optionIcon}>{option.icon}</Text>}
            <Text style={[
              styles.optionText,
              selectedValue === option.value && styles.selectedOptionText,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderToggleButtons = (
    title: string,
    options: { key: keyof CheckInContext; label: string; icon?: string }[]
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              context[option.key] && styles.selectedOption,
            ]}
            onPress={() => onContextChange({
              ...context,
              [option.key]: !context[option.key],
            })}
          >
            {option.icon && <Text style={styles.optionIcon}>{option.icon}</Text>}
            <Text style={[
              styles.optionText,
              context[option.key] && styles.selectedOptionText,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const environmentOptions = [
    { value: 'indoor' as const, label: 'Indoor', icon: '🏢' },
    { value: 'outdoor' as const, label: 'Outdoor', icon: '🌳' },
    { value: 'mixed' as const, label: 'Mixed', icon: '🏪' },
  ];

  const locationTypeOptions = [
    { value: 'mall' as const, label: 'Mall', icon: '🏬' },
    { value: 'street' as const, label: 'Street', icon: '🛣️' },
    { value: 'building' as const, label: 'Building', icon: '🏢' },
    { value: 'market' as const, label: 'Market', icon: '🏪' },
    { value: 'rooftop' as const, label: 'Rooftop', icon: '🏙️' },
    { value: 'riverside' as const, label: 'Riverside', icon: '🌊' },
  ];

  const btsProximityOptions = [
    { value: 'walking' as const, label: 'Walking Distance', icon: '🚶' },
    { value: 'near' as const, label: 'Near BTS', icon: '🚇' },
    { value: 'far' as const, label: 'Far from BTS', icon: '🚌' },
    { value: 'none' as const, label: 'No BTS Access', icon: '🚗' },
  ];

  const noiseLevelOptions = [
    { value: 'quiet' as const, label: 'Quiet', icon: '🤫' },
    { value: 'moderate' as const, label: 'Moderate', icon: '🗣️' },
    { value: 'loud' as const, label: 'Loud', icon: '📢' },
  ];

  const priceTierOptions = [
    { value: 'street' as const, label: 'Street Food (฿)', icon: '🍜' },
    { value: 'casual' as const, label: 'Casual (฿฿)', icon: '🍽️' },
    { value: 'mid' as const, label: 'Mid-range (฿฿฿)', icon: '🍷' },
    { value: 'upscale' as const, label: 'Upscale (฿฿฿฿)', icon: '🥂' },
    { value: 'luxury' as const, label: 'Luxury (฿฿฿฿฿)', icon: '💎' },
  ];

  const crowdLevelOptions = [
    { value: 'empty' as const, label: 'Empty', icon: '😴' },
    { value: 'few' as const, label: 'Few People', icon: '😌' },
    { value: 'moderate' as const, label: 'Moderate', icon: '😊' },
    { value: 'busy' as const, label: 'Busy', icon: '😅' },
    { value: 'packed' as const, label: 'Packed', icon: '😰' },
  ];

  const weatherConditionOptions = [
    { value: 'sunny' as const, label: 'Sunny', icon: '☀️' },
    { value: 'cloudy' as const, label: 'Cloudy', icon: '☁️' },
    { value: 'rainy' as const, label: 'Rainy', icon: '🌧️' },
    { value: 'stormy' as const, label: 'Stormy', icon: '⛈️' },
  ];

  const temperatureOptions = [
    { value: 'cool' as const, label: 'Cool', icon: '❄️' },
    { value: 'comfortable' as const, label: 'Comfortable', icon: '😊' },
    { value: 'warm' as const, label: 'Warm', icon: '🌤️' },
    { value: 'hot' as const, label: 'Hot', icon: '🔥' },
    { value: 'sweltering' as const, label: 'Sweltering', icon: '🥵' },
  ];

  const companionOptions = [
    { value: 'solo' as const, label: 'Solo', icon: '🧘' },
    { value: 'partner' as const, label: 'Partner', icon: '💑' },
    { value: 'friends' as const, label: 'Friends', icon: '👥' },
    { value: 'family' as const, label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { value: 'business' as const, label: 'Business', icon: '💼' },
    { value: 'date' as const, label: 'Date', icon: '💕' },
  ];

  const mealOptions = [
    { value: 'breakfast' as const, label: 'Breakfast', icon: '🌅' },
    { value: 'brunch' as const, label: 'Brunch', icon: '🥐' },
    { value: 'lunch' as const, label: 'Lunch', icon: '🍽️' },
    { value: 'afternoon_snack' as const, label: 'Snack', icon: '🍪' },
    { value: 'dinner' as const, label: 'Dinner', icon: '🌆' },
    { value: 'late_night' as const, label: 'Late Night', icon: '🌙' },
    { value: 'drinks' as const, label: 'Drinks', icon: '🍹' },
  ];

  const transportOptions = [
    { value: 'walking' as const, label: 'Walking', icon: '🚶' },
    { value: 'bts' as const, label: 'BTS', icon: '🚇' },
    { value: 'mrt' as const, label: 'MRT', icon: '🚊' },
    { value: 'bus' as const, label: 'Bus', icon: '🚌' },
    { value: 'taxi' as const, label: 'Taxi', icon: '🚕' },
    { value: 'grab' as const, label: 'Grab', icon: '📱' },
    { value: 'motorcycle' as const, label: 'Motorcycle', icon: '🏍️' },
    { value: 'car' as const, label: 'Car', icon: '🚗' },
    { value: 'boat' as const, label: 'Boat', icon: '🛥️' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Place Context */}
      {renderOptionButtons('Environment', environmentOptions, context.environment, 
        (value) => onContextChange({ ...context, environment: value }))}
      
      {renderOptionButtons('Location Type', locationTypeOptions, context.location_type, 
        (value) => onContextChange({ ...context, location_type: value }))}
      
      {renderOptionButtons('BTS Proximity', btsProximityOptions, context.bts_proximity, 
        (value) => onContextChange({ ...context, bts_proximity: value }))}
      
      {renderOptionButtons('Noise Level', noiseLevelOptions, context.noise_level, 
        (value) => onContextChange({ ...context, noise_level: value }))}
      
      {renderOptionButtons('Price Tier', priceTierOptions, context.price_tier, 
        (value) => onContextChange({ ...context, price_tier: value }))}
      
      {renderOptionButtons('Crowd Level', crowdLevelOptions, context.crowd_level, 
        (value) => onContextChange({ ...context, crowd_level: value }))}

      {/* Amenities */}
      {renderToggleButtons('Amenities', [
        { key: 'air_conditioning', label: 'Air Conditioning', icon: '❄️' },
        { key: 'wifi_available', label: 'WiFi Available', icon: '📶' },
        { key: 'parking_available', label: 'Parking Available', icon: '🅿️' },
      ])}

      {/* Weather Context */}
      {renderOptionButtons('Weather', weatherConditionOptions, weatherContext.condition, 
        (value) => onWeatherContextChange({ ...weatherContext, condition: value }))}
      
      {renderOptionButtons('Temperature Feel', temperatureOptions, weatherContext.temperature_feel, 
        (value) => onWeatherContextChange({ ...weatherContext, temperature_feel: value }))}

      {/* Visit Context */}
      {renderOptionButtons('Companion', companionOptions, companionType, onCompanionTypeChange)}
      
      {renderOptionButtons('Meal Type', mealOptions, mealType, onMealTypeChange)}
      
      {renderOptionButtons('Transportation', transportOptions, transportationMethod, onTransportationMethodChange)}

      {/* Would Return */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Would you return?</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, wouldReturn && styles.selectedOption]}
            onPress={() => onWouldReturnChange(true)}
          >
            <Text style={styles.optionIcon}>👍</Text>
            <Text style={[styles.optionText, wouldReturn && styles.selectedOptionText]}>
              Yes, I'd return
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, !wouldReturn && styles.selectedOption]}
            onPress={() => onWouldReturnChange(false)}
          >
            <Text style={styles.optionIcon}>👎</Text>
            <Text style={[styles.optionText, !wouldReturn && styles.selectedOptionText]}>
              No, probably not
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  optionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  optionText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#1976D2',
    fontWeight: '600',
  },
}); 