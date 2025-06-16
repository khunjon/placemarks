import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Camera, Star, MapPin } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Title2, 
  Title3,
  Body, 
  SecondaryText,
  PrimaryButton,
  GhostButton,
  OutlineButton,
  ElevatedCard 
} from '../components/common';
import type { CheckInStackScreenProps } from '../navigation/types';

type CheckInFormScreenProps = CheckInStackScreenProps<'CheckInForm'>;

export default function CheckInFormScreen({ route, navigation }: CheckInFormScreenProps) {
  const { placeId, placeName, placeType } = route.params;
  const [rating, setRating] = useState(0);

  const handleCheckIn = () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please rate your experience before checking in.');
      return;
    }

    Alert.alert(
      'Check In Successful!',
      `You've checked in at ${placeName}!`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
      }}>
        <GhostButton
          title=""
          onPress={() => navigation.goBack()}
          icon={X}
          size="sm"
        />

        <Title2>Check In</Title2>

        <PrimaryButton
          title=""
          onPress={handleCheckIn}
          icon={Check}
          size="sm"
          disabled={rating === 0}
        />
      </View>

      <ScrollView style={{ flex: 1, padding: Spacing.layout.screenPadding }}>
        <ElevatedCard padding="lg" style={{ marginBottom: Spacing.xl }}>
          <Title3 style={{ marginBottom: Spacing.md }}>
            {placeName}
          </Title3>
          
          <Body color="secondary">
            Rate your experience and check in!
          </Body>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: Spacing.sm,
            marginVertical: Spacing.lg,
          }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <View
                key={star}
                style={{ padding: Spacing.xs }}
                onTouchEnd={() => setRating(star)}
              >
                <Star
                  size={32}
                  color={star <= rating ? Colors.accent.yellow : Colors.semantic.textSecondary}
                  fill={star <= rating ? Colors.accent.yellow : 'transparent'}
                  strokeWidth={2}
                />
              </View>
            ))}
          </View>

          <PrimaryButton
            title="Check In"
            onPress={handleCheckIn}
            icon={MapPin}
            disabled={rating === 0}
          />
        </ElevatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}