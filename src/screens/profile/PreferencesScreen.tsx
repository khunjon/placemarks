import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Bell, MapPin, Shield, Database } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { 
  Typography, 
  Title2, 
  Title3,
  Body,
  ElevatedCard 
} from '../../components/common';
import SettingItem from '../../components/profile/SettingItem';
import type { ProfileStackScreenProps } from '../../navigation/types';

type PreferencesScreenProps = ProfileStackScreenProps<'Preferences'>;

export default function PreferencesScreen({ route, navigation }: PreferencesScreenProps) {
  const { section } = route.params;

  const getPreferencesForSection = () => {
    switch (section) {
      case 'location':
        return [
          {
            icon: MapPin,
            iconColor: Colors.accent.blue,
            title: 'Location Services',
            subtitle: 'Allow app to access your location',
            value: 'Enabled',
          },
          {
            icon: MapPin,
            iconColor: Colors.accent.green,
            title: 'Background Location',
            subtitle: 'Track location when app is closed',
            value: 'Disabled',
          },
        ];
      case 'notifications':
        return [
          {
            icon: Bell,
            iconColor: Colors.accent.yellow,
            title: 'Push Notifications',
            subtitle: 'Receive notifications about new places',
            value: 'Enabled',
          },
          {
            icon: Bell,
            iconColor: Colors.accent.purple,
            title: 'Check-in Reminders',
            subtitle: 'Remind me to check in at places',
            value: 'Enabled',
          },
        ];
      case 'privacy':
        return [
          {
            icon: Shield,
            iconColor: Colors.accent.red,
            title: 'Profile Visibility',
            subtitle: 'Who can see your profile',
            value: 'Friends Only',
          },
          {
            icon: Shield,
            iconColor: Colors.accent.orange,
            title: 'Check-in Privacy',
            subtitle: 'Who can see your check-ins',
            value: 'Public',
          },
        ];
      case 'data':
        return [
          {
            icon: Database,
            iconColor: Colors.accent.blue,
            title: 'Data Usage',
            subtitle: 'Manage app data consumption',
            value: 'Standard',
          },
          {
            icon: Database,
            iconColor: Colors.accent.green,
            title: 'Offline Mode',
            subtitle: 'Download data for offline use',
            value: 'Enabled',
          },
        ];
      default:
        return [
          {
            icon: Settings,
            iconColor: Colors.semantic.textSecondary,
            title: 'General Settings',
            subtitle: 'App preferences and configuration',
            value: '',
          },
        ];
    }
  };

  const sectionTitle = section 
    ? section.charAt(0).toUpperCase() + section.slice(1) + ' Preferences'
    : 'Preferences';

  const preferences = getPreferencesForSection();

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingVertical: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Title2 style={{ marginBottom: Spacing.sm }}>
            {sectionTitle}
          </Title2>
          <Body color="secondary">
            Customize your {section || 'app'} settings and preferences.
          </Body>
        </View>

        {/* Preferences List */}
        <ElevatedCard padding="none">
          {preferences.map((preference, index) => (
                          <SettingItem
                key={index}
                icon={preference.icon}
                iconColor={preference.iconColor}
                title={preference.title}
                subtitle={preference.subtitle}
                value={preference.value}
                onPress={() => console.log(`Tapped ${preference.title}`)}
                showArrow={true}
              />
          ))}
        </ElevatedCard>

        {/* Additional Info */}
        <View style={{ marginTop: Spacing.xl }}>
          <ElevatedCard padding="lg">
            <Title3 style={{ marginBottom: Spacing.sm }}>
              About {sectionTitle}
            </Title3>
            <Body color="secondary">
              {section === 'location' && 
                'Location services help us provide personalized recommendations and nearby place suggestions. Your location data is kept private and secure.'}
              {section === 'notifications' && 
                'Stay updated with the latest place recommendations, friend activities, and important app updates through push notifications.'}
              {section === 'privacy' && 
                'Control who can see your profile, check-ins, and lists. Your privacy is important to us and you have full control over your data visibility.'}
              {section === 'data' && 
                'Manage how the app uses your device storage and internet connection. Enable offline mode to access your saved places without internet.'}
              {!section && 
                'Configure your app preferences to get the best experience from Placemarks. All settings can be changed at any time.'}
            </Body>
          </ElevatedCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 