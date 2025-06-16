import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';

export interface SettingItemProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  showArrow?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export default function SettingItem({
  icon: Icon,
  iconColor = DarkTheme.colors.semantic.secondaryLabel,
  title,
  subtitle,
  value,
  showArrow = true,
  onPress,
  disabled = false,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: DarkTheme.spacing.md,
        paddingHorizontal: DarkTheme.spacing.lg,
        backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
        borderBottomWidth: 1,
        borderBottomColor: DarkTheme.colors.semantic.separator,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: `${iconColor}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: DarkTheme.spacing.md,
        }}
      >
        <Icon
          size={18}
          color={iconColor}
          strokeWidth={2}
        />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text
          style={[
            DarkTheme.typography.body,
            {
              color: DarkTheme.colors.semantic.label,
              fontWeight: '500',
              marginBottom: subtitle ? DarkTheme.spacing.xs : 0,
            }
          ]}
        >
          {title}
        </Text>
        
        {subtitle && (
          <Text
            style={[
              DarkTheme.typography.caption1,
              {
                color: DarkTheme.colors.semantic.secondaryLabel,
              }
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Value */}
      {value && (
        <Text
          style={[
            DarkTheme.typography.subhead,
            {
              color: DarkTheme.colors.semantic.secondaryLabel,
              marginRight: showArrow ? DarkTheme.spacing.sm : 0,
            }
          ]}
        >
          {value}
        </Text>
      )}

      {/* Arrow */}
      {showArrow && onPress && (
        <ChevronRight
          size={20}
          color={DarkTheme.colors.semantic.tertiaryLabel}
          strokeWidth={2}
        />
      )}
    </TouchableOpacity>
  );
} 