import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, User } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Title2, 
  Body,
  PrimaryButton,
  GhostButton,
  ElevatedCard 
} from '../components/common';
import type { ProfileStackScreenProps } from '../navigation/types';

type EditProfileScreenProps = ProfileStackScreenProps<'EditProfile'>;

export default function EditProfileScreen({ route, navigation }: EditProfileScreenProps) {
  const { userId, userName, userEmail } = route.params;

  const handleSave = () => {
    Alert.alert(
      'Profile Updated',
      'Your profile has been updated successfully!',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      {/* Header */}
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

        <Title2>Edit Profile</Title2>

        <PrimaryButton
          title=""
          onPress={handleSave}
          icon={Check}
          size="sm"
        />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingVertical: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar */}
        <ElevatedCard padding="lg" style={{ marginBottom: Spacing.xl }}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: `${Colors.primary[500]}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.md,
                borderWidth: 3,
                borderColor: Colors.primary[500],
              }}
            >
              <User
                size={40}
                color={Colors.primary[500]}
                strokeWidth={2}
              />
            </View>
            
            <PrimaryButton
              title="Change Photo"
              size="sm"
              onPress={() => Alert.alert('Change Photo', 'Photo selection coming soon!')}
            />
          </View>
        </ElevatedCard>

        {/* Profile Information */}
        <View style={{ gap: Spacing.lg }}>
          <ElevatedCard padding="lg">
            <Typography variant="headline" style={{ marginBottom: Spacing.sm }}>
              Name
            </Typography>
            <Body>{userName}</Body>
          </ElevatedCard>

          <ElevatedCard padding="lg">
            <Typography variant="headline" style={{ marginBottom: Spacing.sm }}>
              Email
            </Typography>
            <Body color="secondary">{userEmail}</Body>
          </ElevatedCard>

          <ElevatedCard padding="lg">
            <Typography variant="headline" style={{ marginBottom: Spacing.sm }}>
              Bio
            </Typography>
            <Body color="secondary">
              Bangkok explorer and food enthusiast. Always looking for the next great adventure!
            </Body>
          </ElevatedCard>

          <ElevatedCard padding="lg">
            <Typography variant="headline" style={{ marginBottom: Spacing.sm }}>
              Location
            </Typography>
            <Body color="secondary">Bangkok, Thailand</Body>
          </ElevatedCard>
        </View>

        {/* Save Button */}
        <View style={{ marginTop: Spacing.xl }}>
          <PrimaryButton
            title="Save Changes"
            onPress={handleSave}
            icon={Check}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 