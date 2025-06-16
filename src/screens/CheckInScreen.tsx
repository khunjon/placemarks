import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  RoundedSearchBar, 
  Typography, 
  Title3, 
  Body, 
  SecondaryText,
  Card,
  ElevatedCard 
} from '../components/common';
import PlaceCard, { PlaceCardProps } from '../components/places/PlaceCard';
import CheckInHistoryCard, { CheckInHistoryCardProps } from '../components/checkins/CheckInHistoryCard';

// Mock data for nearby places
const mockNearbyPlaces: Omit<PlaceCardProps, 'onCheckIn'>[] = [
  {
    id: '1',
    name: 'Chatuchak Weekend Market',
    type: 'shopping',
    description: 'Famous weekend market with thousands of stalls selling everything from clothes to food',
    address: '587/10 Kamphaeng Phet 2 Rd, Chatuchak',
    distance: '0.3km',
    rating: 4.5,
    priceLevel: 2,
    isOpen: true,
    btsStation: 'Mo Chit',
  },
  {
    id: '2',
    name: 'Wat Pho Temple',
    type: 'temple',
    description: 'Historic Buddhist temple famous for its giant reclining Buddha statue',
    address: '2 Sanamchai Road, Grand Palace Subdistrict',
    distance: '1.2km',
    rating: 4.8,
    isOpen: true,
  },
  {
    id: '3',
    name: 'Café Tartine',
    type: 'cafe',
    description: 'Cozy French-style café serving excellent coffee and pastries',
    address: '27 Sukhumvit Soi 11, Khlong Toei Nuea',
    distance: '0.8km',
    rating: 4.3,
    priceLevel: 3,
    isOpen: true,
    btsStation: 'Nana',
  },
  {
    id: '4',
    name: 'Gaggan Anand',
    type: 'restaurant',
    description: 'Progressive Indian cuisine restaurant with innovative molecular gastronomy',
    address: '68/1 Soi Langsuan, Ploenchit Rd',
    distance: '2.1km',
    rating: 4.9,
    priceLevel: 4,
    isOpen: false,
    btsStation: 'Chit Lom',
  },
  {
    id: '5',
    name: 'Lumpini Park',
    type: 'park',
    description: 'Large public park in the heart of Bangkok, perfect for jogging and relaxation',
    address: 'Rama IV Rd, Pathum Wan District',
    distance: '1.5km',
    rating: 4.2,
    isOpen: true,
    btsStation: 'Sala Daeng',
  },
];

// Mock data for recent check-ins
const mockRecentCheckIns: CheckInHistoryCardProps[] = [
  {
    id: '1',
    placeName: 'Siam Paragon',
    placeType: 'shopping',
    checkInTime: '2 hours ago',
    rating: 4,
    note: 'Great shopping mall with lots of luxury brands. The food court on the 4th floor is amazing!',
    photoCount: 3,
    btsStation: 'Siam',
  },
  {
    id: '2',
    placeName: 'Blue Elephant Restaurant',
    placeType: 'restaurant',
    checkInTime: '1 day ago',
    rating: 5,
    note: 'Exceptional Thai cuisine in a beautiful colonial setting. The massaman curry was incredible.',
    photoCount: 5,
  },
  {
    id: '3',
    placeName: 'Jim Thompson House',
    placeType: 'attraction',
    checkInTime: '3 days ago',
    rating: 4,
    note: 'Fascinating museum showcasing traditional Thai architecture and silk collection.',
    photoCount: 8,
    btsStation: 'National Stadium',
  },
  {
    id: '4',
    placeName: 'Rooftop Bar at Lebua',
    placeType: 'restaurant',
    checkInTime: '1 week ago',
    rating: 5,
    note: 'Stunning views of Bangkok skyline. Perfect for sunset drinks!',
    photoCount: 12,
    btsStation: 'Saphan Taksin',
  },
];

export default function CheckInScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleCheckIn = (placeId: string, placeName: string) => {
    Alert.alert(
      'Check In',
      `Would you like to check in at ${placeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Check In', 
          onPress: () => {
            console.log(`Checking in at ${placeName} (ID: ${placeId})`);
            // Here you would typically navigate to a check-in form or handle the check-in
          }
        },
      ]
    );
  };

  const handlePlacePress = (placeId: string) => {
    console.log(`Place pressed: ${placeId}`);
    // Here you would typically navigate to place details
  };

  const handleHistoryPress = (checkInId: string) => {
    console.log(`Check-in history pressed: ${checkInId}`);
    // Here you would typically navigate to check-in details
  };

  const filteredPlaces = mockNearbyPlaces.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
      }}>
        <Typography variant="largeTitle" style={{ fontWeight: 'bold' }}>
          Check In
        </Typography>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingTop: Spacing.lg,
          paddingBottom: Spacing.md,
        }}>
          <RoundedSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search places..."
            onClear={() => setSearchQuery('')}
          />
        </View>

        {/* Nearby Places Section */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
          marginBottom: Spacing.layout.sectionSpacing,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: Spacing.md,
          }}>
            <Title3>Nearby Places</Title3>
            <SecondaryText>
              {filteredPlaces.length} place{filteredPlaces.length !== 1 ? 's' : ''}
            </SecondaryText>
          </View>

          {filteredPlaces.length > 0 ? (
            filteredPlaces.map((place) => (
              <View key={place.id} style={{ marginBottom: Spacing.layout.cardSpacing }}>
                <PlaceCard
                  {...place}
                  onCheckIn={() => handleCheckIn(place.id, place.name)}
                  onPress={() => handlePlacePress(place.id)}
                />
              </View>
            ))
          ) : (
            <ElevatedCard padding="lg">
              <View style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
                <Body color="secondary" style={{ textAlign: 'center' }}>
                  {searchQuery 
                    ? `No places found matching "${searchQuery}"`
                    : 'No nearby places found'
                  }
                </Body>
              </View>
            </ElevatedCard>
          )}
        </View>

        {/* Recent Check-ins Section */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: Spacing.md,
          }}>
            <Title3>Recent Check-ins</Title3>
            <SecondaryText>
              {mockRecentCheckIns.length} check-in{mockRecentCheckIns.length !== 1 ? 's' : ''}
            </SecondaryText>
          </View>

          {mockRecentCheckIns.length > 0 ? (
            mockRecentCheckIns.map((checkIn) => (
              <View key={checkIn.id} style={{ marginBottom: Spacing.layout.cardSpacing }}>
                <CheckInHistoryCard
                  {...checkIn}
                  onPress={() => handleHistoryPress(checkIn.id)}
                />
              </View>
            ))
          ) : (
            <ElevatedCard padding="lg">
              <View style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
                <Body color="secondary" style={{ textAlign: 'center' }}>
                  No recent check-ins
                </Body>
              </View>
            </ElevatedCard>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 