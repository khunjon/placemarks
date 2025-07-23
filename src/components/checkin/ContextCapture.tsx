import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CheckInContext, WeatherContext, CompanionType, MealType, TransportationMethod } from '../../types';
import { 
  Building, Trees, Store, Building2, Route, Waves, PersonStanding, Train, Bus, Car,
  Volume, Volume1, Volume2, Utensils, Wine, Zzz, Smile, CloudRain, CloudSun, Flame,
  Thermometer, Wifi, ParkingCircle, Sunrise, Cookie, Sunset, Moon, ThumbsUp, ThumbsDown,
  Briefcase, Users, Heart, Phone, Bike, Ship
} from '../icons';

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
    options: { value: T; label: string; icon?: React.ComponentType<any> | string }[],
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
            {option.icon && (
              typeof option.icon === 'string' ? (
                <Text style={styles.optionIcon}>{option.icon}</Text>
              ) : (
                <option.icon size={16} color="#666" style={styles.optionIconComponent} />
              )
            )}
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
    options: { key: keyof CheckInContext; label: string; icon?: React.ComponentType<any> }[]
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
            {option.icon && (
              typeof option.icon === 'string' ? (
                <Text style={styles.optionIcon}>{option.icon}</Text>
              ) : (
                <option.icon size={16} color="#666" style={styles.optionIconComponent} />
              )
            )}
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
    { value: 'indoor' as const, label: 'Indoor', icon: Building },
    { value: 'outdoor' as const, label: 'Outdoor', icon: Trees },
    { value: 'mixed' as const, label: 'Mixed', icon: Store },
  ];

  const locationTypeOptions = [
    { value: 'mall' as const, label: 'Mall', icon: Building2 },
    { value: 'street' as const, label: 'Street', icon: Route },
    { value: 'building' as const, label: 'Building', icon: Building },
    { value: 'market' as const, label: 'Market', icon: Store },
    { value: 'rooftop' as const, label: 'Rooftop', icon: Building2 },
    { value: 'riverside' as const, label: 'Riverside', icon: Waves },
  ];

  const btsProximityOptions = [
    { value: 'walking' as const, label: 'Walking Distance', icon: PersonStanding },
    { value: 'near' as const, label: 'Near BTS', icon: Train },
    { value: 'far' as const, label: 'Far from BTS', icon: Bus },
    { value: 'none' as const, label: 'No BTS Access', icon: Car },
  ];

  const noiseLevelOptions = [
    { value: 'quiet' as const, label: 'Quiet', icon: Volume },
    { value: 'moderate' as const, label: 'Moderate', icon: Volume1 },
    { value: 'loud' as const, label: 'Loud', icon: Volume2 },
  ];

  const priceTierOptions = [
    { value: 'street' as const, label: 'Street Food (฿)', icon: '🍜' },
    { value: 'casual' as const, label: 'Casual (฿฿)', icon: '🍽️' },
    { value: 'mid' as const, label: 'Mid-range (฿฿฿)', icon: '🍷' },
    { value: 'upscale' as const, label: 'Upscale (฿฿฿฿)', icon: '🥂' },
    { value: 'luxury' as const, label: 'Luxury (฿฿฿฿฿)', icon: '💎' },
  ];

  const crowdLevelOptions = [
    { value: 'empty' as const, label: 'Empty', icon: Zzz },
    { value: 'few' as const, label: 'Few People', icon: Smile },
    { value: 'moderate' as const, label: 'Moderate', icon: Smile },
    { value: 'busy' as const, label: 'Busy', icon: Users },
    { value: 'packed' as const, label: 'Packed', icon: Users },
  ];

  const weatherConditionOptions = [
    { value: 'sunny' as const, label: 'Sunny', icon: CloudSun },
    { value: 'cloudy' as const, label: 'Cloudy', icon: CloudSun },
    { value: 'rainy' as const, label: 'Rainy', icon: CloudRain },
    { value: 'stormy' as const, label: 'Stormy', icon: CloudRain },
  ];

  const temperatureOptions = [
    { value: 'cool' as const, label: 'Cool', icon: CloudSun },
    { value: 'comfortable' as const, label: 'Comfortable', icon: Smile },
    { value: 'warm' as const, label: 'Warm', icon: CloudSun },
    { value: 'hot' as const, label: 'Hot', icon: Flame },
    { value: 'sweltering' as const, label: 'Sweltering', icon: Thermometer },
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
    { value: 'walking' as const, label: 'Walking', icon: PersonStanding },
    { value: 'bts' as const, label: 'BTS', icon: Train },
    { value: 'mrt' as const, label: 'MRT', icon: Train },
    { value: 'bus' as const, label: 'Bus', icon: Bus },
    { value: 'taxi' as const, label: 'Taxi', icon: Car },
    { value: 'grab' as const, label: 'Grab', icon: Phone },
    { value: 'motorcycle' as const, label: 'Motorcycle', icon: Bike },
    { value: 'car' as const, label: 'Car', icon: Car },
    { value: 'boat' as const, label: 'Boat', icon: Ship },
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
        { key: 'air_conditioning', label: 'Air Conditioning', icon: CloudSun },
        { key: 'wifi_available', label: 'WiFi Available', icon: Wifi },
        { key: 'parking_available', label: 'Parking Available', icon: ParkingCircle },
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
            <ThumbsUp size={16} color="#666" style={styles.optionIconComponent} />
            <Text style={[styles.optionText, wouldReturn && styles.selectedOptionText]}>
              Yes, I'd return
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, !wouldReturn && styles.selectedOption]}
            onPress={() => onWouldReturnChange(false)}
          >
            <ThumbsDown size={16} color="#666" style={styles.optionIconComponent} />
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
  optionIconComponent: {
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