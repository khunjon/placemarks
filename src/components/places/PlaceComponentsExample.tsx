import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';

import { RootStackParamList, EnrichedPlace, Location } from '../../types';
import { PlaceCard, PlaceAutocomplete, PlaceSelector, usePlaceNavigation } from './';
import { checkInsService } from '../../services/checkInsService';
import { DarkTheme } from '../../constants/theme';

/**
 * Example component demonstrating how to use the updated place components
 * with Google Place IDs. This shows the simplified patterns without UUID conversion.
 */
export default function PlaceComponentsExample() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { navigateToPlace, createCheckInHandler } = usePlaceNavigation(navigation, 'search');
  
  const [selectedGooglePlaceId, setSelectedGooglePlaceId] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<EnrichedPlace | null>(null);

  // Example: User's current location for location-based searches
  const userLocation: Location = {
    latitude: 13.7563,
    longitude: 100.5018
  };

  // Example: Place data from enriched_places view
  const examplePlace: EnrichedPlace = {
    google_place_id: 'ChIJXeZ10ABC123def456ghi789jkl',
    name: 'Chatuchak Weekend Market',
    formatted_address: 'Kamphaeng Phet 2 Rd, Chatuchak, Bangkok 10900, Thailand',
    geometry: {
      location: { lat: 13.7998, lng: 100.5501 },
      viewport: {
        northeast: { lat: 13.8011, lng: 100.5514 },
        southwest: { lat: 13.7985, lng: 100.5488 }
      }
    },
    types: ['shopping_mall', 'tourist_attraction', 'point_of_interest', 'establishment'],
    rating: 4.2,
    price_level: 2,
    formatted_phone_number: '+66 2 272 4441',
    website: 'https://www.chatuchakmarket.org',
    opening_hours: {
      open_now: true,
      weekday_text: [
        'Monday: Closed',
        'Tuesday: Closed',
        'Wednesday: 6:00 AM – 6:00 PM',
        'Thursday: 6:00 AM – 6:00 PM',
        'Friday: 6:00 AM – 6:00 PM',
        'Saturday: 6:00 AM – 6:00 PM',
        'Sunday: 6:00 AM – 6:00 PM'
      ]
    },
    photo_urls: ['https://example.com/photo1.jpg'],
    primary_image_url: 'https://example.com/primary.jpg',
    display_description: 'One of the largest weekend markets in the world',
    is_featured: true,
    has_editorial_content: true,
    business_status: 'OPERATIONAL'
  };

  // Example: Handling check-ins with Google Place IDs
  const handleCheckIn = async (googlePlaceId: string, placeName: string) => {
    try {
      // This is now much simpler - no UUID conversion needed!
      const checkIn = await checkInsService.createCheckIn('user-id', {
        place_id: googlePlaceId, // Direct Google Place ID usage
        rating: 'thumbs_up',
        comment: 'Great place!',
        photos: [],
        tags: ['weekend', 'shopping']
      });
      
      console.log('Check-in created:', checkIn);
    } catch (error) {
      console.error('Error creating check-in:', error);
    }
  };

  const checkInHandler = createCheckInHandler(handleCheckIn);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Place Components with Google Place IDs</Text>
      <Text style={styles.subtitle}>Simplified - no UUID conversion needed!</Text>

      {/* Example 1: PlaceCard with EnrichedPlace object */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. PlaceCard with EnrichedPlace</Text>
        <PlaceCard
          googlePlaceId={examplePlace.google_place_id}
          place={examplePlace} // Pass full enriched place object
          name={examplePlace.name}
          address={examplePlace.formatted_address}
          distance="2.1 km"
          btsStation="Mo Chit"
          onCheckIn={checkInHandler}
          onPress={() => navigateToPlace(examplePlace.google_place_id, examplePlace.name)}
          showCheckInButton={true} // Show for demo purposes
        />
      </View>

      {/* Example 2: PlaceCard with individual props */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. PlaceCard with individual props</Text>
        <PlaceCard
          googlePlaceId="ChIJYZ123ABC456def789ghi012jkl"
          name="Terminal 21"
          type="shopping"
          description="Shopping mall with country-themed floors"
          address="2, 88 Sukhumvit Rd, Khlong Toei, Bangkok"
          distance="1.5 km"
          rating={4.3}
          priceLevel={3}
          isOpen={true}
          btsStation="Asok"
          onCheckIn={checkInHandler}
          onPress={() => navigateToPlace("ChIJYZ123ABC456def789ghi012jkl", "Terminal 21")}
          showCheckInButton={true} // Show for demo purposes
        />
      </View>

      {/* Example 3: PlaceAutocomplete */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. PlaceAutocomplete</Text>
        <PlaceAutocomplete
          onPlaceSelect={(suggestion) => {
            console.log('Selected suggestion:', suggestion);
          }}
          onGooglePlaceIdSelect={(googlePlaceId, placeName) => {
            console.log('Direct Google Place ID:', googlePlaceId, placeName);
            // This is the new, cleaner callback
          }}
          location={userLocation}
          placeholder="Search places in Bangkok..."
          clearOnSelect={false}
        />
      </View>

      {/* Example 4: PlaceSelector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. PlaceSelector</Text>
        <PlaceSelector
          onPlaceSelect={(googlePlaceId, place) => {
            setSelectedGooglePlaceId(googlePlaceId);
            setSelectedPlace(place || null);
            console.log('Selected place:', googlePlaceId, place?.name);
          }}
          selectedGooglePlaceId={selectedGooglePlaceId}
          location={userLocation}
          title="Choose a place"
          showSelectedPlace={true}
          allowDeselection={true}
        />
      </View>

      {/* Example 5: Navigation patterns */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Navigation Examples</Text>
        <Text style={styles.codeExample}>
          {`// Navigate to place details
navigateToPlace(googlePlaceId, placeName);

// Navigate to map with place
navigateToMapWithPlace(googlePlaceId, region);

// Create check-in handler
const handler = createCheckInHandler(async (id, name) => {
  await checkInsService.createCheckIn(userId, {
    place_id: id, // Direct Google Place ID!
    rating: 'thumbs_up'
  });
});`}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ✅ No more UUID conversion logic{'\n'}
          ✅ Direct Google Place ID usage{'\n'}
          ✅ Simplified component interfaces{'\n'}
          ✅ Enhanced type safety
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkTheme.colors.semantic.systemBackground,
    padding: DarkTheme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DarkTheme.colors.semantic.label,
    marginBottom: DarkTheme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: DarkTheme.colors.semantic.secondaryLabel,
    marginBottom: DarkTheme.spacing.lg,
  },
  section: {
    marginBottom: DarkTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DarkTheme.colors.semantic.label,
    marginBottom: DarkTheme.spacing.md,
  },
  codeExample: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: DarkTheme.colors.semantic.secondaryLabel,
    backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
    padding: DarkTheme.spacing.md,
    borderRadius: DarkTheme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: DarkTheme.colors.bangkok.gold,
  },
  footer: {
    marginTop: DarkTheme.spacing.xl,
    padding: DarkTheme.spacing.md,
    backgroundColor: DarkTheme.colors.bangkok.gold + '20',
    borderRadius: DarkTheme.borderRadius.md,
  },
  footerText: {
    fontSize: 14,
    color: DarkTheme.colors.semantic.label,
    lineHeight: 20,
  },
});