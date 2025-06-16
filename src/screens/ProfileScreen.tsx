import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { 
  MapPin, 
  DollarSign, 
  Bell, 
  Map, 
  Shield, 
  Download,
  BarChart3,
  Calendar,
  List,
  Settings,
  Navigation,
  TreePine
} from 'lucide-react-native';
import { DarkTheme } from '../constants/theme';
import { UserProfileHeader, SettingItem, AchievementSection } from '../components/profile';

export default function ProfileScreen() {
  const handleEditProfile = () => {
    console.log('Edit profile pressed');
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleSettingPress = (setting: string) => {
    console.log(`${setting} pressed`);
    Alert.alert(setting, `${setting} settings coming soon!`);
  };

  const handleExportData = () => {
    console.log('Export data pressed');
    Alert.alert(
      'Export Data',
      'Your data will be exported as a JSON file. This may take a few moments.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => console.log('Exporting data...') }
      ]
    );
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: DarkTheme.colors.semantic.systemBackground,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* User Profile Header */}
      <UserProfileHeader
        name="Alex Thompson"
        email="alex.thompson@email.com"
        onEditPress={handleEditProfile}
      />

      {/* Achievements Section */}
      <AchievementSection />

      {/* Location Preferences Section */}
      <View
        style={{
          backgroundColor: DarkTheme.colors.semantic.systemBackground,
          paddingTop: DarkTheme.spacing.lg,
        }}
      >
        <View
          style={{
            paddingHorizontal: DarkTheme.spacing.lg,
            marginBottom: DarkTheme.spacing.sm,
          }}
        >
          <Text
            style={[
              DarkTheme.typography.title3,
              {
                color: DarkTheme.colors.semantic.label,
                fontWeight: 'bold',
              }
            ]}
          >
            Location Preferences
          </Text>
        </View>

        <View
          style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: DarkTheme.colors.semantic.separator,
          }}
        >
          <SettingItem
            icon={Navigation}
            iconColor={DarkTheme.colors.accent.blue}
            title="Transit Priority"
            subtitle="Prefer BTS/MRT accessible places"
            value="High"
            onPress={() => handleSettingPress('Transit Priority')}
          />
          
          <SettingItem
            icon={TreePine}
            iconColor={DarkTheme.colors.accent.green}
            title="Environment Preference"
            subtitle="Indoor vs outdoor places"
            value="Mixed"
            onPress={() => handleSettingPress('Environment Preference')}
          />
          
          <SettingItem
            icon={DollarSign}
            iconColor={DarkTheme.colors.bangkok.gold}
            title="Price Range"
            subtitle="Preferred spending level"
            value="₿₿-₿₿₿"
            onPress={() => handleSettingPress('Price Range')}
            showArrow={false}
          />
        </View>
      </View>

      {/* Your Data Section */}
      <View
        style={{
          backgroundColor: DarkTheme.colors.semantic.systemBackground,
          paddingTop: DarkTheme.spacing.lg,
        }}
      >
        <View
          style={{
            paddingHorizontal: DarkTheme.spacing.lg,
            marginBottom: DarkTheme.spacing.sm,
          }}
        >
          <Text
            style={[
              DarkTheme.typography.title3,
              {
                color: DarkTheme.colors.semantic.label,
                fontWeight: 'bold',
              }
            ]}
          >
            Your Data
          </Text>
        </View>

        <View
          style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: DarkTheme.colors.semantic.separator,
          }}
        >
          <SettingItem
            icon={Calendar}
            iconColor={DarkTheme.colors.accent.orange}
            title="Check-ins This Month"
            subtitle="December 2024"
            value="12"
            showArrow={false}
          />
          
          <SettingItem
            icon={MapPin}
            iconColor={DarkTheme.colors.accent.purple}
            title="Total Places Visited"
            subtitle="All-time count"
            value="127"
            showArrow={false}
          />
          
          <SettingItem
            icon={List}
            iconColor={DarkTheme.colors.accent.teal}
            title="Lists Created"
            subtitle="Custom collections"
            value="8"
            showArrow={false}
          />
          
          <SettingItem
            icon={Download}
            iconColor={DarkTheme.colors.accent.indigo}
            title="Export Data"
            subtitle="Download your data as JSON"
            onPress={handleExportData}
          />
        </View>
      </View>

      {/* App Settings Section */}
      <View
        style={{
          backgroundColor: DarkTheme.colors.semantic.systemBackground,
          paddingTop: DarkTheme.spacing.lg,
          paddingBottom: DarkTheme.spacing.xl,
        }}
      >
        <View
          style={{
            paddingHorizontal: DarkTheme.spacing.lg,
            marginBottom: DarkTheme.spacing.sm,
          }}
        >
          <Text
            style={[
              DarkTheme.typography.title3,
              {
                color: DarkTheme.colors.semantic.label,
                fontWeight: 'bold',
              }
            ]}
          >
            App Settings
          </Text>
        </View>

        <View
          style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: DarkTheme.colors.semantic.separator,
          }}
        >
          <SettingItem
            icon={Bell}
            iconColor={DarkTheme.colors.accent.red}
            title="Notifications"
            subtitle="Push notifications and alerts"
            value="On"
            onPress={() => handleSettingPress('Notifications')}
          />
          
          <SettingItem
            icon={Map}
            iconColor={DarkTheme.colors.accent.green}
            title="Map Preferences"
            subtitle="Default map style and settings"
            onPress={() => handleSettingPress('Map Preferences')}
          />
          
          <SettingItem
            icon={Shield}
            iconColor={DarkTheme.colors.accent.blue}
            title="Account & Privacy"
            subtitle="Security and privacy settings"
            onPress={() => handleSettingPress('Account & Privacy')}
          />
        </View>
      </View>

      {/* Bottom Spacing for Tab Bar */}
      <View style={{ height: DarkTheme.spacing.xl }} />
    </ScrollView>
  );
} 