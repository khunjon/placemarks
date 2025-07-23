import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Keyboard, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { 
  Typography, 
  Title3,
  Body, 
  SecondaryText,
  ElevatedCard,
  PrimaryButton,
  LoadingState,
} from '../../components/common';
import Toast from '../../components/ui/Toast';
import { useAuth } from '../../services/auth-context';
import { checkInsService, ThumbsRating, checkInUtils } from '../../services/checkInsService';
import type { CheckInStackScreenProps } from '../../navigation/types';
import { ThumbsUp, ThumbsDown, CheckCircle } from '../../components/icons';

type CheckInFormScreenProps = CheckInStackScreenProps<'CheckInForm'>;

export default function CheckInFormScreen({ navigation, route }: CheckInFormScreenProps) {
  const { user } = useAuth();
  const { placeId, placeName, placeType } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  
  const [selectedRating, setSelectedRating] = useState<ThumbsRating | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  // Handle rating selection
  const handleRatingSelect = (rating: ThumbsRating) => {
    setSelectedRating(rating);
  };

  // Handle text input focus
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

  // Handle check-in submission
  const handleCheckIn = async () => {
    if (!user) {
      showToast('You must be logged in to check in.', 'error');
      return;
    }

    try {
      setLoading(true);
      Keyboard.dismiss();

      // Create check-in (rating and comment are optional)
      await checkInsService.createCheckIn(user.id, {
        place_id: placeId,
        rating: selectedRating || undefined,
        comment: comment.trim() || undefined,
      });

      // Show success toast and navigate back
      showToast(`Check-in successful at ${placeName}! 🎉`);
      
      // Navigate back to the main CheckIn screen after a short delay to let user see the toast
      setTimeout(() => {
        navigation.popToTop();
      }, 1500);

    } catch (error) {
      console.error('Error creating check-in:', error);
      showToast('Check-in failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Render rating option
  const renderRatingOption = (rating: ThumbsRating, IconComponent: React.ComponentType<any>, label: string) => {
    const isSelected = selectedRating === rating;
    
    return (
      <TouchableOpacity
        key={rating}
        onPress={() => handleRatingSelect(rating)}
        style={{
          flex: 1,
          alignItems: 'center',
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.sm,
          borderRadius: 16,
          backgroundColor: isSelected 
            ? checkInUtils.getRatingColor(rating) + '20' // 20% opacity
            : Colors.semantic.backgroundSecondary,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected 
            ? checkInUtils.getRatingColor(rating)
            : Colors.semantic.borderSecondary,
          marginHorizontal: Spacing.xs,
          minHeight: 80,
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
      >
        <IconComponent 
          size={28}
          color={isSelected 
            ? checkInUtils.getRatingColor(rating)
            : Colors.semantic.textSecondary}
          style={{ 
            marginBottom: Spacing.sm,
          }}
        />
        <Body 
          style={{ 
            fontWeight: isSelected ? '600' : '400',
            color: isSelected 
              ? checkInUtils.getRatingColor(rating)
              : Colors.semantic.textSecondary,
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          {label}
        </Body>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary 
      }}>
        <LoadingState message="Checking you in..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      
      {/* Header */}
      <View style={{
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: Spacing.md }}
        >
          <Typography variant="body" color="primary">
            ← Cancel
          </Typography>
        </TouchableOpacity>
        <Typography variant="title2" style={{ fontWeight: 'bold', flex: 1 }}>
          Check In
        </Typography>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingHorizontal: Spacing.layout.screenPadding,
            paddingVertical: Spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Place Information */}
          <ElevatedCard padding="md" style={{ marginBottom: Spacing.lg }}>
            <View style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
              <Title3 style={{ textAlign: 'center', marginBottom: Spacing.xs }}>
                {placeName}
              </Title3>
              <SecondaryText style={{ textAlign: 'center', fontSize: 14 }}>
                {placeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SecondaryText>
            </View>
          </ElevatedCard>

          {/* Rating Selection */}
          <View style={{ marginBottom: Spacing.xl }}>
            <Body style={{ 
              fontWeight: '600', 
              marginBottom: Spacing.md,
              textAlign: 'center',
            }}>
              How was your experience? (optional)
            </Body>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              marginHorizontal: Spacing.sm,
            }}>
              {renderRatingOption('thumbs_down', ThumbsDown, 'Not Great')}
              {renderRatingOption('neutral', CheckCircle, 'Okay')}
              {renderRatingOption('thumbs_up', ThumbsUp, 'Great!')}
            </View>
          </View>

          {/* Comment Field */}
          <View style={{ marginBottom: Spacing.xl }}>
            <Body style={{ 
              fontWeight: '600', 
              marginBottom: Spacing.md 
            }}>
              Add a comment (optional)
            </Body>
            
            <ElevatedCard padding="none">
              <TextInput
                ref={textInputRef}
                value={comment}
                onChangeText={setComment}
                placeholder="Share your thoughts about this place..."
                placeholderTextColor={Colors.semantic.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  padding: Spacing.lg,
                  fontSize: 16,
                  lineHeight: 22,
                  color: Colors.semantic.textPrimary,
                  minHeight: 100,
                  fontFamily: 'System', // Use system font
                }}
                maxLength={500}
                onFocus={handleTextInputFocus}
              />
            </ElevatedCard>
            
            <SecondaryText style={{ 
              fontSize: 12, 
              marginTop: Spacing.xs,
              textAlign: 'right',
            }}>
              {comment.length}/500
            </SecondaryText>
          </View>

          {/* Check In Button */}
          <PrimaryButton
            title="Check In"
            onPress={handleCheckIn}
            disabled={loading}
            style={{
              marginBottom: Spacing.lg,
            }}
          />

          {/* Helper Text */}
          <SecondaryText style={{ 
            textAlign: 'center', 
            fontSize: 14,
            lineHeight: 20,
          }}>
            You can always edit your rating or add a comment later from the place details.
          </SecondaryText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}