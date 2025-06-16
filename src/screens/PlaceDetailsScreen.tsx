import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Star, Clock, DollarSign, Navigation, Camera, Heart, Share } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Title2, 
  Title3,
  Body, 
  SecondaryText,
  PrimaryButton,
  OutlineButton,
  ElevatedCard 
} from '../components/common';

// This screen can be used from multiple stacks
interface PlaceDetailsScreenProps {
  route: {
    params: {
      placeId: string;
      placeName: string;
      source?: string;
    };
  };
  navigation: any;
}

// Mock place data
const mockPlaceData = {
  id: '1',
  name: 'Chatuchak Weekend Market',
  type: 'shopping',
  description: 'One of the world\'s largest weekend markets with over 15,000 stalls selling everything from vintage clothing to exotic pets. A must-visit destination for both locals and tourists.',
  address: '587, 10 Kamphaeng Phet 2 Rd, Chatuchak, Bangkok 10900',
  rating: 4.5,
  reviewCount: 12847,
  priceLevel: 2,
  isOpen: true,
  openingHours: 'Sat-Sun: 6:00 AM - 6:00 PM',
  btsStation: 'Mo Chit',
  distance: '2.3km',
  photos: [
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg',
    'https://example.com/photo3.jpg',
  ],
  tags: ['Shopping', 'Food', 'Vintage', 'Local Culture'],
  checkInCount: 1247,
  lastCheckIn: '2 hours ago',
};

export default function PlaceDetailsScreen({ route, navigation }: PlaceDetailsScreenProps) {
  const { placeId, placeName, source } = route.params;

  const handleCheckIn = () => {
    // Navigate to CheckInForm if we're in the CheckIn stack
    if (source === 'checkin' || source === 'search' || source === 'nearby') {
      (navigation as any).navigate('CheckInForm', {
        placeId,
        placeName,
        placeType: mockPlaceData.type,
      });
    } else {
      Alert.alert('Check In', `Check in functionality for ${placeName} would be implemented here.`);
    }
  };

  const handleGetDirections = () => {
    Alert.alert('Directions', `Getting directions to ${placeName}...`);
  };

  const handleShare = () => {
    Alert.alert('Share', `Sharing ${placeName}...`);
  };

  const handleAddToList = () => {
    Alert.alert('Add to List', `Add ${placeName} to a list...`);
  };

  const getPlaceTypeIcon = () => {
    switch (mockPlaceData.type) {
      case 'shopping':
        return '🛍️';
      case 'restaurant':
        return '🍽️';
      case 'cafe':
        return '☕';
      case 'temple':
        return '🏛️';
      case 'park':
        return '🌳';
      default:
        return '📍';
    }
  };

  const getPriceLevelText = () => {
    const level = mockPlaceData.priceLevel;
    return '$'.repeat(level) + '·'.repeat(4 - level);
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Placeholder */}
        <View style={{
          height: 200,
          backgroundColor: Colors.semantic.backgroundSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Spacing.lg,
        }}>
          <Camera size={48} color={Colors.semantic.textSecondary} strokeWidth={1.5} />
          <SecondaryText style={{ marginTop: Spacing.sm }}>
            Photo Gallery
          </SecondaryText>
        </View>

        <View style={{ paddingHorizontal: Spacing.layout.screenPadding }}>
          {/* Place Header */}
          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.layout.cardSpacing }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginBottom: Spacing.md,
            }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: `${Colors.accent.blue}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: Spacing.md,
                }}
              >
                <Typography variant="title3">
                  {getPlaceTypeIcon()}
                </Typography>
              </View>

              <View style={{ flex: 1 }}>
                <Title2 style={{ marginBottom: Spacing.xs }}>
                  {mockPlaceData.name}
                </Title2>
                
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: Spacing.sm,
                  marginBottom: Spacing.sm,
                }}>
                  {/* Rating */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Star size={16} color={Colors.accent.yellow} fill={Colors.accent.yellow} />
                    <Typography variant="callout" style={{ marginLeft: 4 }}>
                      {mockPlaceData.rating}
                    </Typography>
                    <SecondaryText style={{ marginLeft: 4 }}>
                      ({mockPlaceData.reviewCount.toLocaleString()})
                    </SecondaryText>
                  </View>

                  {/* Price Level */}
                  <SecondaryText>
                    {getPriceLevelText()}
                  </SecondaryText>

                  {/* Open Status */}
                  <View style={{
                    backgroundColor: mockPlaceData.isOpen ? Colors.accent.green + '20' : Colors.semantic.error + '20',
                    paddingHorizontal: Spacing.xs,
                    paddingVertical: 2,
                    borderRadius: 8,
                  }}>
                    <Typography
                      variant="caption2"
                      style={{
                        color: mockPlaceData.isOpen ? Colors.accent.green : Colors.semantic.error,
                        fontSize: 10,
                        fontWeight: '600',
                      }}
                    >
                      {mockPlaceData.isOpen ? 'OPEN' : 'CLOSED'}
                    </Typography>
                  </View>
                </View>

                {/* BTS Station */}
                {mockPlaceData.btsStation && (
                  <View style={{
                    backgroundColor: Colors.accent.green + '20',
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: 4,
                    borderRadius: 12,
                    alignSelf: 'flex-start',
                  }}>
                    <SecondaryText style={{ color: Colors.accent.green, fontSize: 12 }}>
                      BTS {mockPlaceData.btsStation}
                    </SecondaryText>
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: Spacing.sm,
            }}>
              <PrimaryButton
                title="Check In"
                onPress={handleCheckIn}
                icon={MapPin}
                size="sm"
                style={{ flex: 1 }}
              />
              
              <OutlineButton
                title="Directions"
                onPress={handleGetDirections}
                icon={Navigation}
                size="sm"
                style={{ flex: 1 }}
              />
            </View>
          </ElevatedCard>

          {/* Description */}
          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.layout.cardSpacing }}>
            <Title3 style={{ marginBottom: Spacing.sm }}>About</Title3>
            <Body color="secondary">{mockPlaceData.description}</Body>
          </ElevatedCard>

          {/* Details */}
          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.layout.cardSpacing }}>
            <Title3 style={{ marginBottom: Spacing.md }}>Details</Title3>
            
            <View style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <MapPin size={20} color={Colors.semantic.textSecondary} strokeWidth={2} />
                <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                  <Typography variant="callout" style={{ marginBottom: 2 }}>Address</Typography>
                  <SecondaryText>{mockPlaceData.address}</SecondaryText>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Clock size={20} color={Colors.semantic.textSecondary} strokeWidth={2} />
                <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                  <Typography variant="callout" style={{ marginBottom: 2 }}>Hours</Typography>
                  <SecondaryText>{mockPlaceData.openingHours}</SecondaryText>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <DollarSign size={20} color={Colors.semantic.textSecondary} strokeWidth={2} />
                <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                  <Typography variant="callout" style={{ marginBottom: 2 }}>Price Range</Typography>
                  <SecondaryText>{getPriceLevelText()} · Budget-friendly</SecondaryText>
                </View>
              </View>
            </View>
          </ElevatedCard>

          {/* Tags */}
          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.layout.cardSpacing }}>
            <Title3 style={{ marginBottom: Spacing.sm }}>Tags</Title3>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: Spacing.xs,
            }}>
              {mockPlaceData.tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    backgroundColor: `${Colors.primary[500]}20`,
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: Spacing.xs,
                    borderRadius: 16,
                  }}
                >
                  <Typography variant="caption1" color="brand">
                    {tag}
                  </Typography>
                </View>
              ))}
            </View>
          </ElevatedCard>

          {/* Check-in Stats */}
          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.layout.cardSpacing }}>
            <Title3 style={{ marginBottom: Spacing.sm }}>Community</Title3>
            <SecondaryText>
              {mockPlaceData.checkInCount.toLocaleString()} people have checked in here
            </SecondaryText>
            <SecondaryText style={{ marginTop: 4 }}>
              Last check-in: {mockPlaceData.lastCheckIn}
            </SecondaryText>
          </ElevatedCard>

          {/* Additional Actions */}
          <View style={{
            flexDirection: 'row',
            gap: Spacing.sm,
            marginBottom: Spacing.xl,
          }}>
            <OutlineButton
              title="Add to List"
              onPress={handleAddToList}
              icon={Heart}
              style={{ flex: 1 }}
            />
            
            <OutlineButton
              title="Share"
              onPress={handleShare}
              icon={Share}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 