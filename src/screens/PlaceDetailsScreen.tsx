import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, Alert, TextInput, TouchableOpacity, Keyboard, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Star, Clock, DollarSign, Navigation, Camera, Heart, Share, Edit3 } from 'lucide-react-native';
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
  SecondaryButton,
  GhostButton,
  ElevatedCard 
} from '../components/common';
import Toast from '../components/ui/Toast';

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
  notes: '', // User's personal notes about this place
};

export default function PlaceDetailsScreen({ route, navigation }: PlaceDetailsScreenProps) {
  const { placeId, placeName, source } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  
  // Notes state
  const [notes, setNotes] = useState(mockPlaceData.notes);
  const [tempNotes, setTempNotes] = useState(mockPlaceData.notes);
  const [editingNotes, setEditingNotes] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Keyboard listeners for precise height tracking
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Handle text input focus with keyboard-aware scrolling
  const handleTextInputFocus = () => {
    // Small delay to ensure keyboard animation starts
    setTimeout(() => {
      textInputRef.current?.measureInWindow((x, y, width, height) => {
        // Use actual keyboard height if available, otherwise estimate
        const actualKeyboardHeight = keyboardHeight || (Platform.OS === 'ios' ? 300 : 250);
        const screenHeight = Dimensions.get('window').height;
        const availableHeight = screenHeight - actualKeyboardHeight;
        
        // Position the input in the upper portion of the available space
        const targetY = y - (availableHeight * 0.3); // Position at 30% from top of available space
        
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, targetY),
          animated: true,
        });
      });
    }, 150);
  };

  // Toast helper functions
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Handle notes operations
  const handleEditNotes = () => {
    setTempNotes(notes);
    setEditingNotes(true);
  };

  const handleSaveNotes = () => {
    // Here you would typically save to your backend/database
    setNotes(tempNotes);
    setEditingNotes(false);
    showToast('Notes saved');
  };

  const handleCancelNotes = () => {
    setTempNotes(notes);
    setEditingNotes(false);
  };

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
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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

            {/* Your Notes */}
            <ElevatedCard padding="lg" style={{ marginBottom: Spacing.layout.cardSpacing }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
                <Title3>Your Notes</Title3>
                {!editingNotes && (
                  <TouchableOpacity onPress={handleEditNotes}>
                    <Edit3 size={18} color={Colors.semantic.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
              
              {editingNotes ? (
                <View>
                  <TextInput
                    ref={textInputRef}
                    style={{
                      backgroundColor: Colors.semantic.backgroundSecondary,
                      borderRadius: 8,
                      padding: Spacing.sm,
                      marginBottom: Spacing.sm,
                      minHeight: 80,
                      color: Colors.semantic.textPrimary,
                      fontSize: 16,
                      textAlignVertical: 'top',
                      borderWidth: 1,
                      borderColor: Colors.semantic.borderSecondary,
                    }}
                    multiline
                    placeholder="Add your notes about this place..."
                    placeholderTextColor={Colors.semantic.textTertiary}
                    value={tempNotes}
                    onChangeText={setTempNotes}
                    onFocus={handleTextInputFocus}
                    maxLength={500}
                  />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <GhostButton
                      title="Cancel"
                      onPress={handleCancelNotes}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      title="Save"
                      onPress={handleSaveNotes}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleEditNotes}
                  style={{
                    backgroundColor: Colors.semantic.backgroundSecondary,
                    borderRadius: 8,
                    padding: Spacing.sm,
                    minHeight: 60,
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: Colors.semantic.borderSecondary,
                  }}
                >
                  <Body color={notes ? 'primary' : 'secondary'}>
                    {notes || 'Tap to add notes about this place...'}
                  </Body>
                </TouchableOpacity>
              )}
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
      </KeyboardAvoidingView>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
} 