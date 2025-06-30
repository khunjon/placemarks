import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon, Check } from '../icons';
import { DarkTheme } from '../../constants/theme';

export interface AchievementProps {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  isCompleted: boolean;
  progress?: number; // 0-100 for in-progress achievements
  target?: number; // Target number for completion
  current?: number; // Current progress number
  completedDate?: string; // Date when completed
  category: 'exploration' | 'social' | 'collection' | 'expertise';
}

const getCategoryColor = (category: AchievementProps['category']) => {
  switch (category) {
    case 'exploration':
      return DarkTheme.colors.accent.blue;
    case 'social':
      return DarkTheme.colors.accent.green;
    case 'collection':
      return DarkTheme.colors.accent.purple;
    case 'expertise':
      return DarkTheme.colors.bangkok.gold;
    default:
      return DarkTheme.colors.semantic.secondaryLabel;
  }
};

export default function Achievement({
  name,
  description,
  icon: Icon,
  iconColor,
  isCompleted,
  progress = 0,
  target,
  current,
  completedDate,
  category,
}: AchievementProps) {
  const categoryColor = getCategoryColor(category);
  const progressPercentage = isCompleted ? 100 : progress;

  return (
    <View
      style={{
        backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
        borderColor: isCompleted
          ? `${iconColor}40`
          : DarkTheme.colors.semantic.separator,
        borderWidth: 1,
        borderRadius: DarkTheme.borderRadius.md,
        padding: DarkTheme.spacing.md,
        marginBottom: DarkTheme.spacing.sm,
        ...DarkTheme.shadows.small,
        ...(isCompleted && {
          backgroundColor: `${iconColor}08`,
        }),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}
      >
        {/* Achievement Icon */}
        <View
          style={{
            position: 'relative',
            marginRight: DarkTheme.spacing.md,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: `${iconColor}20`,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: isCompleted ? 2 : 1,
              borderColor: isCompleted ? iconColor : `${iconColor}40`,
            }}
          >
            <Icon
              size={24}
              color={iconColor}

            />
          </View>

          {/* Completion Badge */}
          {isCompleted && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: DarkTheme.colors.status.success,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: DarkTheme.colors.semantic.secondarySystemBackground,
              }}
            >
              <Check
                size={12}
                color={DarkTheme.colors.system.white}

              />
            </View>
          )}
        </View>

        {/* Achievement Content */}
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: DarkTheme.spacing.xs,
            }}
          >
            <Text
              style={[
                DarkTheme.typography.headline,
                {
                  color: DarkTheme.colors.semantic.label,
                  fontWeight: '600',
                  flex: 1,
                }
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>

            {/* Category Badge */}
            <View
              style={{
                backgroundColor: `${categoryColor}20`,
                paddingHorizontal: DarkTheme.spacing.xs,
                paddingVertical: 2,
                borderRadius: DarkTheme.borderRadius.xs,
              }}
            >
              <Text
                style={[
                  DarkTheme.typography.caption2,
                  {
                    color: categoryColor,
                    fontWeight: '600',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }
                ]}
              >
                {category}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={[
              DarkTheme.typography.subhead,
              {
                color: DarkTheme.colors.semantic.secondaryLabel,
                marginBottom: DarkTheme.spacing.sm,
                lineHeight: 18,
              }
            ]}
            numberOfLines={2}
          >
            {description}
          </Text>

          {/* Progress or Completion Info */}
          {isCompleted ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text
                style={[
                  DarkTheme.typography.caption1,
                  {
                    color: DarkTheme.colors.status.success,
                    fontWeight: '600',
                  }
                ]}
              >
                Completed
              </Text>
              {completedDate && (
                <>
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: DarkTheme.colors.semantic.separator,
                      marginHorizontal: DarkTheme.spacing.xs,
                    }}
                  />
                  <Text
                    style={[
                      DarkTheme.typography.caption1,
                      {
                        color: DarkTheme.colors.semantic.tertiaryLabel,
                      }
                    ]}
                  >
                    {completedDate}
                  </Text>
                </>
              )}
            </View>
          ) : (
            <View>
              {/* Progress Text */}
              {current !== undefined && target !== undefined && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: DarkTheme.spacing.xs,
                  }}
                >
                  <Text
                    style={[
                      DarkTheme.typography.caption1,
                      {
                        color: DarkTheme.colors.semantic.secondaryLabel,
                        fontWeight: '600',
                      }
                    ]}
                  >
                    {current} / {target}
                  </Text>
                  <Text
                    style={[
                      DarkTheme.typography.caption1,
                      {
                        color: DarkTheme.colors.semantic.tertiaryLabel,
                      }
                    ]}
                  >
                    {Math.round(progressPercentage)}%
                  </Text>
                </View>
              )}

              {/* Progress Bar */}
              <View
                style={{
                  height: 6,
                  backgroundColor: DarkTheme.colors.semantic.quaternarySystemFill,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${progressPercentage}%`,
                    backgroundColor: iconColor,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}