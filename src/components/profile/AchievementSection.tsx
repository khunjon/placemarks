import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Trophy, Award, Target, Coffee, MapPin, List, Star } from '../icons';
import { DarkTheme } from '../../constants/theme';
import Achievement, { AchievementProps } from './Achievement';

// Mock achievement data
const mockAchievements: AchievementProps[] = [
  {
    id: '1',
    name: 'Explorer',
    description: 'Check in to 10 different places',
    icon: MapPin,
    iconColor: DarkTheme.colors.accent.blue,
    isCompleted: true,
    target: 10,
    current: 10,
    completedDate: 'Dec 15, 2024',
    category: 'exploration',
  },
  {
    id: '2',
    name: 'Foodie',
    description: 'Visit 5 restaurants and rate them',
    icon: Star,
    iconColor: DarkTheme.colors.accent.orange,
    isCompleted: true,
    target: 5,
    current: 5,
    completedDate: 'Dec 10, 2024',
    category: 'expertise',
  },
  {
    id: '3',
    name: 'Coffee Connoisseur',
    description: 'Check in to 10 coffee shops',
    icon: Coffee,
    iconColor: DarkTheme.colors.bangkok.temple,
    isCompleted: false,
    progress: 70,
    target: 10,
    current: 7,
    category: 'expertise',
  },
  {
    id: '4',
    name: 'List Curator',
    description: 'Create 5 custom lists',
    icon: List,
    iconColor: DarkTheme.colors.accent.purple,
    isCompleted: false,
    progress: 60,
    target: 5,
    current: 3,
    category: 'collection',
  },
  {
    id: '5',
    name: 'Local Expert',
    description: 'Reach 100 total check-ins',
    icon: Award,
    iconColor: DarkTheme.colors.bangkok.gold,
    isCompleted: false,
    progress: 45,
    target: 100,
    current: 45,
    category: 'expertise',
  },
  {
    id: '6',
    name: 'Adventurer',
    description: 'Visit 20 different places',
    icon: Target,
    iconColor: DarkTheme.colors.accent.green,
    isCompleted: false,
    progress: 75,
    target: 20,
    current: 15,
    category: 'exploration',
  },
];

type FilterType = 'all' | 'completed' | 'in-progress';

export default function AchievementSection() {
  const [filter, setFilter] = useState<FilterType>('all');

  const completedAchievements = mockAchievements.filter(a => a.isCompleted);
  const inProgressAchievements = mockAchievements.filter(a => !a.isCompleted);

  const filteredAchievements =
    filter === 'completed' ? completedAchievements :
    filter === 'in-progress' ? inProgressAchievements :
    mockAchievements;

  const totalPoints = completedAchievements.length * 100;

  return (
    <View
      style={{
        backgroundColor: DarkTheme.colors.semantic.systemBackground,
        paddingVertical: DarkTheme.spacing.lg,
      }}
    >
      {/* Section Header */}
      <View
        style={{
          paddingHorizontal: DarkTheme.spacing.lg,
          marginBottom: DarkTheme.spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: DarkTheme.spacing.sm,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Trophy
              size={24}
              color={DarkTheme.colors.bangkok.gold}

            />
            <Text
              style={[
                DarkTheme.typography.title3,
                {
                  color: DarkTheme.colors.semantic.label,
                  fontWeight: 'bold',
                  marginLeft: DarkTheme.spacing.sm,
                }
              ]}
            >
              Achievements
            </Text>
          </View>

          {/* Achievement Points */}
          <View
            style={{
              backgroundColor: DarkTheme.colors.bangkok.gold + '20',
              paddingHorizontal: DarkTheme.spacing.sm,
              paddingVertical: DarkTheme.spacing.xs,
              borderRadius: DarkTheme.borderRadius.sm,
            }}
          >
            <Text
              style={[
                DarkTheme.typography.caption1,
                {
                  color: DarkTheme.colors.bangkok.gold,
                  fontWeight: '700',
                }
              ]}
            >
              {totalPoints} pts
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: DarkTheme.spacing.md,
          }}
        >
          <Text
            style={[
              DarkTheme.typography.subhead,
              {
                color: DarkTheme.colors.semantic.secondaryLabel,
              }
            ]}
          >
            {completedAchievements.length} of {mockAchievements.length} completed
          </Text>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: DarkTheme.colors.semantic.separator,
              marginHorizontal: DarkTheme.spacing.sm,
            }}
          />
          <Text
            style={[
              DarkTheme.typography.subhead,
              {
                color: DarkTheme.colors.semantic.secondaryLabel,
              }
            ]}
          >
            {inProgressAchievements.length} in progress
          </Text>
        </View>

        {/* Filter Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingRight: DarkTheme.spacing.lg,
          }}
        >
          {(['all', 'completed', 'in-progress'] as FilterType[]).map((filterType) => (
            <TouchableOpacity
              key={filterType}
              onPress={() => setFilter(filterType)}
              style={{
                backgroundColor: filter === filterType
                  ? DarkTheme.colors.bangkok.gold
                  : DarkTheme.colors.semantic.tertiarySystemFill,
                paddingHorizontal: DarkTheme.spacing.md,
                paddingVertical: DarkTheme.spacing.sm,
                borderRadius: DarkTheme.borderRadius.md,
                marginRight: DarkTheme.spacing.sm,
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  DarkTheme.typography.callout,
                  {
                    color: filter === filterType
                      ? DarkTheme.colors.system.black
                      : DarkTheme.colors.semantic.secondaryLabel,
                    fontWeight: filter === filterType ? '600' : '500',
                    textTransform: 'capitalize',
                  }
                ]}
              >
                {filterType === 'in-progress' ? 'In Progress' : filterType}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Achievements List */}
      <ScrollView
        style={{
          paddingHorizontal: DarkTheme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {filteredAchievements.length > 0 ? (
          filteredAchievements.map((achievement) => (
            <Achievement
              key={achievement.id}
              {...achievement}
            />
          ))
        ) : (
          <View
            style={{
              alignItems: 'center',
              paddingVertical: DarkTheme.spacing.xl,
            }}
          >
            <Text
              style={[
                DarkTheme.typography.body,
                {
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  textAlign: 'center',
                }
              ]}
            >
              No achievements in this category yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}