import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { 
  BarChart3,
  Calendar,
  List,
  Settings
} from '../../components/icons';
import { DarkTheme } from '../../constants/theme';
import { UserProfileHeader, SettingItem } from '../../components/profile';
import { useAuth } from '../../services/auth-context';
import { checkInsService, EnrichedCheckIn } from '../../services/checkInsService';
import { listsService } from '../../services/listsService';
import { userRatingsService } from '../../services/userRatingsService';
import type { ProfileStackScreenProps } from '../../navigation/types';

type ProfileScreenProps = ProfileStackScreenProps<'Profile'>;

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, loading } = useAuth();
  const [userStats, setUserStats] = useState({
    totalCheckIns: 0,
    checkInsThisMonth: 0,
    totalRatings: 0,
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
      
      // Get all check-ins
      const checkIns = await checkInsService.getUserCheckIns(user.id);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const checkInsThisMonth = checkIns?.filter((checkIn: EnrichedCheckIn) => {
        const checkInDate = new Date(checkIn.timestamp);
        return checkInDate.getMonth() === currentMonth && checkInDate.getFullYear() === currentYear;
      }).length || 0;

      // Get total ratings from user_place_ratings table
      const ratingStats = await userRatingsService.getUserRatingStats(user.id);
      const totalRatings = ratingStats.totalRatings || 0;

      // Get user's lists
      const lists = await listsService.getUserLists(user.id);
      const listsCreated = lists?.filter((list: any) => list.type === 'user').length || 0;

      setUserStats({
        totalCheckIns: checkIns?.length || 0,
        checkInsThisMonth,
        totalRatings,
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
    if (setting === 'Recommendations') {
      navigation.navigate('RecommendationSettings');
    } else {
      console.log(`${setting} pressed`);
      Alert.alert(setting, `${setting} settings coming soon!`);
    }
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

        {/* KPI Grid */}
        <View
          style={{
            paddingHorizontal: DarkTheme.spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: DarkTheme.spacing.sm,
            }}
          >
            {/* Lists KPI */}
            <View
              style={{
                flex: 1,
                backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                borderRadius: DarkTheme.spacing.sm,
                padding: DarkTheme.spacing.md,
                alignItems: 'center',
              }}
            >
              <List 
                size={20} 
                color={DarkTheme.colors.accent.teal}
                style={{ marginBottom: DarkTheme.spacing.xs }}
              />
              <Text
                style={[
                  DarkTheme.typography.title2,
                  {
                    color: DarkTheme.colors.semantic.label,
                    fontWeight: 'bold',
                    marginBottom: 2,
                  }
                ]}
              >
                {loadingStats ? '...' : userStats.listsCreated.toString()}
              </Text>
              <Text
                style={[
                  DarkTheme.typography.caption2,
                  {
                    color: DarkTheme.colors.semantic.secondaryLabel,
                    textAlign: 'center',
                  }
                ]}
              >
                Lists
              </Text>
            </View>

            {/* Ratings KPI */}
            <View
              style={{
                flex: 1,
                backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                borderRadius: DarkTheme.spacing.sm,
                padding: DarkTheme.spacing.md,
                alignItems: 'center',
              }}
            >
              <BarChart3 
                size={20} 
                color={DarkTheme.colors.accent.purple}
                style={{ marginBottom: DarkTheme.spacing.xs }}
              />
              <Text
                style={[
                  DarkTheme.typography.title2,
                  {
                    color: DarkTheme.colors.semantic.label,
                    fontWeight: 'bold',
                    marginBottom: 2,
                  }
                ]}
              >
                {loadingStats ? '...' : userStats.totalRatings.toString()}
              </Text>
              <Text
                style={[
                  DarkTheme.typography.caption2,
                  {
                    color: DarkTheme.colors.semantic.secondaryLabel,
                    textAlign: 'center',
                  }
                ]}
              >
                Ratings
              </Text>
            </View>

            {/* Check-Ins KPI */}
            <View
              style={{
                flex: 1,
                backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                borderRadius: DarkTheme.spacing.sm,
                padding: DarkTheme.spacing.md,
                alignItems: 'center',
              }}
            >
              <Calendar 
                size={20} 
                color={DarkTheme.colors.accent.orange}
                style={{ marginBottom: DarkTheme.spacing.xs }}
              />
              <Text
                style={[
                  DarkTheme.typography.title2,
                  {
                    color: DarkTheme.colors.semantic.label,
                    fontWeight: 'bold',
                    marginBottom: 2,
                  }
                ]}
              >
                {loadingStats ? '...' : userStats.totalCheckIns.toString()}
              </Text>
              <Text
                style={[
                  DarkTheme.typography.caption2,
                  {
                    color: DarkTheme.colors.semantic.secondaryLabel,
                    textAlign: 'center',
                  }
                ]}
              >
                Check-ins
              </Text>
            </View>
          </View>
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
            title="Recommendations"
            subtitle="Refine how recommendations are made"
            onPress={() => handleSettingPress('Recommendations')}
          />
        </View>
      </View>

      {/* Bottom Spacing for Tab Bar */}
      <View style={{ height: DarkTheme.spacing.xl }} />
    </ScrollView>
  );
} 