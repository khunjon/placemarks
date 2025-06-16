import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Star, MapPin, Users, Calendar, Target } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Title2, 
  Title3,
  Body,
  SecondaryText,
  ElevatedCard 
} from '../components/common';
import type { ProfileStackScreenProps } from '../navigation/types';

type AchievementDetailScreenProps = ProfileStackScreenProps<'AchievementDetail'>;

// Mock achievement data
const getAchievementData = (achievementId: string) => {
  const achievements = {
    'temple_explorer': {
      id: 'temple_explorer',
      name: 'Temple Explorer',
      description: 'Visit 10 different temples in Bangkok',
      category: 'exploration',
      isCompleted: true,
      progress: 10,
      target: 10,
      current: 10,
      completedDate: '2024-01-15',
      iconName: 'temple',
      iconColor: Colors.bangkok.temple,
      points: 50,
      rarity: 'Common',
      tips: [
        'Visit Wat Pho for the famous reclining Buddha',
        'Don\'t miss the Golden Buddha at Wat Traimit',
        'Explore the Grand Palace complex',
        'Check out the floating market temples',
      ],
      relatedPlaces: [
        'Wat Pho Temple',
        'Wat Arun (Temple of Dawn)',
        'Wat Traimit (Golden Buddha)',
        'Wat Benchamabophit (Marble Temple)',
      ],
    },
    'foodie_master': {
      id: 'foodie_master',
      name: 'Foodie Master',
      description: 'Try 25 different restaurants and street food stalls',
      category: 'expertise',
      isCompleted: false,
      progress: 18,
      target: 25,
      current: 18,
      completedDate: null,
      iconName: 'food',
      iconColor: Colors.bangkok.market,
      points: 75,
      rarity: 'Rare',
      tips: [
        'Try street food at Chatuchak Market',
        'Experience fine dining in Sukhumvit',
        'Don\'t miss the floating market food',
        'Sample local desserts at MBK',
      ],
      relatedPlaces: [
        'Chatuchak Weekend Market',
        'Gaggan Anand Restaurant',
        'Jay Fai Street Food',
        'Or Tor Kor Market',
      ],
    },
  };

  return achievements[achievementId as keyof typeof achievements] || achievements.temple_explorer;
};

export default function AchievementDetailScreen({ route, navigation }: AchievementDetailScreenProps) {
  const { achievementId, achievementName } = route.params;
  const achievement = getAchievementData(achievementId);

  const getProgressPercentage = () => {
    return (achievement.progress / achievement.target) * 100;
  };

  const getCategoryIcon = () => {
    switch (achievement.category) {
      case 'exploration':
        return MapPin;
      case 'social':
        return Users;
      case 'collection':
        return Star;
      case 'expertise':
        return Trophy;
      default:
        return Target;
    }
  };

  const getCategoryColor = () => {
    switch (achievement.category) {
      case 'exploration':
        return Colors.accent.blue;
      case 'social':
        return Colors.accent.purple;
      case 'collection':
        return Colors.accent.yellow;
      case 'expertise':
        return Colors.accent.green;
      default:
        return Colors.semantic.textSecondary;
    }
  };

  const CategoryIcon = getCategoryIcon();

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
        {/* Achievement Header */}
        <ElevatedCard padding="lg" style={{ marginBottom: Spacing.xl }}>
          <View style={{
            alignItems: 'center',
            marginBottom: Spacing.lg,
          }}>
            {/* Achievement Icon */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: `${achievement.iconColor}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.md,
                borderWidth: 3,
                borderColor: achievement.isCompleted ? achievement.iconColor : Colors.semantic.borderSecondary,
              }}
            >
              <CategoryIcon
                size={40}
                color={achievement.iconColor}
                strokeWidth={2}
              />
            </View>

            {/* Achievement Name */}
            <Title2 style={{ 
              textAlign: 'center', 
              marginBottom: Spacing.sm,
              color: achievement.isCompleted ? Colors.semantic.textPrimary : Colors.semantic.textSecondary,
            }}>
              {achievement.name}
            </Title2>

            {/* Achievement Description */}
            <Body color="secondary" style={{ textAlign: 'center', marginBottom: Spacing.md }}>
              {achievement.description}
            </Body>

            {/* Status Badge */}
            <View
              style={{
                backgroundColor: achievement.isCompleted 
                  ? `${Colors.accent.green}20` 
                  : `${Colors.accent.yellow}20`,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.xs,
                borderRadius: 20,
                marginBottom: Spacing.md,
              }}
            >
              <Typography
                variant="callout"
                style={{
                  color: achievement.isCompleted ? Colors.accent.green : Colors.accent.yellow,
                  fontWeight: '600',
                }}
              >
                {achievement.isCompleted ? '✅ COMPLETED' : '🎯 IN PROGRESS'}
              </Typography>
            </View>

            {/* Completion Date */}
            {achievement.isCompleted && achievement.completedDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Calendar size={16} color={Colors.semantic.textSecondary} strokeWidth={2} />
                <SecondaryText style={{ marginLeft: Spacing.xs }}>
                  Completed on {new Date(achievement.completedDate).toLocaleDateString()}
                </SecondaryText>
              </View>
            )}
          </View>
        </ElevatedCard>

        {/* Progress Section */}
        <ElevatedCard padding="lg" style={{ marginBottom: Spacing.xl }}>
          <Title3 style={{ marginBottom: Spacing.md }}>Progress</Title3>
          
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: Spacing.sm,
          }}>
            <Body>{achievement.current} of {achievement.target}</Body>
            <Body color="brand">{Math.round(getProgressPercentage())}%</Body>
          </View>

          {/* Progress Bar */}
          <View
            style={{
              height: 8,
              backgroundColor: Colors.semantic.backgroundSecondary,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: Spacing.md,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${getProgressPercentage()}%`,
                backgroundColor: achievement.isCompleted ? Colors.accent.green : Colors.primary[500],
                borderRadius: 4,
              }}
            />
          </View>

          {/* Achievement Stats */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: Spacing.md,
            borderTopWidth: 1,
            borderTopColor: Colors.semantic.borderSecondary,
          }}>
            <View style={{ alignItems: 'center' }}>
              <SecondaryText style={{ fontSize: 12 }}>POINTS</SecondaryText>
              <Typography variant="callout" color="brand" style={{ fontWeight: '600' }}>
                {achievement.points}
              </Typography>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <SecondaryText style={{ fontSize: 12 }}>RARITY</SecondaryText>
              <Typography variant="callout" style={{ fontWeight: '600' }}>
                {achievement.rarity}
              </Typography>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <SecondaryText style={{ fontSize: 12 }}>CATEGORY</SecondaryText>
              <Typography variant="callout" style={{ 
                fontWeight: '600',
                color: getCategoryColor(),
              }}>
                {achievement.category.charAt(0).toUpperCase() + achievement.category.slice(1)}
              </Typography>
            </View>
          </View>
        </ElevatedCard>

        {/* Tips Section */}
        {achievement.tips && achievement.tips.length > 0 && (
          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.xl }}>
            <Title3 style={{ marginBottom: Spacing.md }}>Tips to Complete</Title3>
            {achievement.tips.map((tip, index) => (
              <View key={index} style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: index === achievement.tips.length - 1 ? 0 : Spacing.sm,
              }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: Colors.primary[500],
                    marginTop: 8,
                    marginRight: Spacing.sm,
                  }}
                />
                <Body color="secondary" style={{ flex: 1 }}>
                  {tip}
                </Body>
              </View>
            ))}
          </ElevatedCard>
        )}

        {/* Related Places */}
        {achievement.relatedPlaces && achievement.relatedPlaces.length > 0 && (
          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.xl }}>
            <Title3 style={{ marginBottom: Spacing.md }}>Related Places</Title3>
            {achievement.relatedPlaces.map((place, index) => (
              <View key={index} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: Spacing.sm,
                borderBottomWidth: index === achievement.relatedPlaces.length - 1 ? 0 : 1,
                borderBottomColor: Colors.semantic.borderSecondary,
              }}>
                <MapPin size={16} color={Colors.semantic.textSecondary} strokeWidth={2} />
                <Body style={{ marginLeft: Spacing.sm, flex: 1 }}>
                  {place}
                </Body>
              </View>
            ))}
          </ElevatedCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
} 