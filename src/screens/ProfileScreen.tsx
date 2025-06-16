import React, { useEffect, useState } from 'react';
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
import { useAuth } from '../services/auth-context';
import { checkInsService, listsService } from '../services/supabase';
import { CheckIn } from '../types/database';
import type { ProfileStackScreenProps } from '../navigation/types';

type ProfileScreenProps = ProfileStackScreenProps<'Profile'>;

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, loading } = useAuth();
  const [userStats, setUserStats] = useState({
    checkInsThisMonth: 0,
    totalPlacesVisited: 0,
    listsCreated: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      setLoadingStats(true);
      
      // Get check-ins for this month
      const { data: checkIns } = await checkInsService.getCheckIns(user.id);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const checkInsThisMonth = checkIns?.filter((checkIn: CheckIn) => {
        const checkInDate = new Date(checkIn.timestamp);
        return checkInDate.getMonth() === currentMonth && checkInDate.getFullYear() === currentYear;
      }).length || 0;

      // Get total unique places visited (from check-ins)
      const uniquePlaces = new Set(checkIns?.map((checkIn: CheckIn) => checkIn.place_id) || []);
      const totalPlacesVisited = uniquePlaces.size;

      // Get user's lists
      const { data: lists } = await listsService.getLists(user.id);
      const listsCreated = lists?.filter(list => !list.auto_generated).length || 0;

      setUserStats({
        checkInsThisMonth,
        totalPlacesVisited,
        listsCreated,
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
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

  // Show loading state while user data is being loaded
  if (loading || !user) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: DarkTheme.colors.semantic.systemBackground,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={[
          DarkTheme.typography.body,
          { color: DarkTheme.colors.semantic.secondaryLabel }
        ]}>
          {loading ? 'Loading profile...' : 'Please sign in to view your profile'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: DarkTheme.colors.semantic.systemBackground,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* User Profile Header */}
      <View style={{ paddingTop: DarkTheme.spacing.lg }}>
        <UserProfileHeader
          name={user?.full_name || 'User'}
          email={user?.email || ''}
          avatarUrl={user?.avatar_url}
          onEditPress={handleEditProfile}
        />
      </View>

      {/* Achievements Section */}
      <AchievementSection />

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
            subtitle={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            value={loadingStats ? '...' : userStats.checkInsThisMonth.toString()}
            showArrow={false}
          />
          
          <SettingItem
            icon={MapPin}
            iconColor={DarkTheme.colors.accent.purple}
            title="Total Places Visited"
            subtitle="All-time count"
            value={loadingStats ? '...' : userStats.totalPlacesVisited.toString()}
            showArrow={false}
          />
          
          <SettingItem
            icon={List}
            iconColor={DarkTheme.colors.accent.teal}
            title="Lists Created"
            subtitle="Custom collections"
            value={loadingStats ? '...' : userStats.listsCreated.toString()}
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
            icon={Settings}
            iconColor={DarkTheme.colors.accent.orange}
            title="Recommendation Preferences"
            subtitle="Transit, environment, and price preferences"
            onPress={() => handleSettingPress('Recommendation Preferences')}
          />
          
          <SettingItem
            icon={Bell}
            iconColor={DarkTheme.colors.accent.red}
            title="Notifications"
            subtitle="Push notifications and alerts"
            value="On"
            onPress={() => handleSettingPress('Notifications')}
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