import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LucideIcon } from '../icons';
import { Colors } from '../../constants/Colors';
import { Spacing, BorderRadius, Shadows, Typography } from '../../constants/Spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const getButtonStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
  disabled: boolean,
  fullWidth: boolean
): { container: ViewStyle; text: TextStyle; iconSize: number } => {
  // Base styles
  const baseContainer: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.component.button,
    ...Shadows.dark.sm,
  };

  const baseText: TextStyle = {
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  };

  // Size variations
  const sizeStyles = {
    sm: {
      container: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        minHeight: 36,
      },
      text: {
        fontSize: Typography.fontSize.md,
        lineHeight: Typography.lineHeight.md,
      },
      iconSize: Spacing.iconSize.sm,
    },
    md: {
      container: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        minHeight: 44,
      },
      text: {
        fontSize: Typography.fontSize.lg,
        lineHeight: Typography.lineHeight.lg,
      },
      iconSize: Spacing.iconSize.md,
    },
    lg: {
      container: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        minHeight: 52,
      },
      text: {
        fontSize: Typography.fontSize.xl,
        lineHeight: Typography.lineHeight.xl,
      },
      iconSize: Spacing.iconSize.lg,
    },
  };

  // Variant styles
  const variantStyles = {
    primary: {
      container: {
        backgroundColor: disabled ? Colors.neutral[600] : Colors.primary[500],
        borderWidth: 0,
      },
      text: {
        color: disabled ? Colors.semantic.textDisabled : Colors.neutral[950],
      },
    },
    secondary: {
      container: {
        backgroundColor: disabled ? Colors.neutral[800] : Colors.secondary[500],
        borderWidth: 0,
      },
      text: {
        color: disabled ? Colors.semantic.textDisabled : Colors.neutral[950],
      },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? Colors.semantic.borderPrimary : Colors.primary[500],
      },
      text: {
        color: disabled ? Colors.semantic.textDisabled : Colors.primary[500],
      },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      text: {
        color: disabled ? Colors.semantic.textDisabled : Colors.semantic.textPrimary,
      },
    },
    destructive: {
      container: {
        backgroundColor: disabled ? Colors.neutral[600] : Colors.semantic.error,
        borderWidth: 0,
      },
      text: {
        color: disabled ? Colors.semantic.textDisabled : Colors.semantic.textPrimary,
      },
    },
  };

  return {
    container: {
      ...baseContainer,
      ...sizeStyles[size].container,
      ...variantStyles[variant].container,
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.6 }),
    },
    text: {
      ...baseText,
      ...sizeStyles[size].text,
      ...variantStyles[variant].text,
    },
    iconSize: sizeStyles[size].iconSize,
  };
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const styles = getButtonStyles(variant, size, disabled || loading, fullWidth);
  
  const iconColor = 
    variant === 'outline' || variant === 'ghost' 
      ? (disabled ? Colors.semantic.textDisabled : Colors.primary[500])
      : variant === 'destructive'
      ? Colors.semantic.textPrimary
      : Colors.neutral[950];

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator
            size="small"
            color={iconColor}
            style={{ marginRight: Spacing.sm }}
          />
          <Text style={[styles.text, textStyle]}>Loading...</Text>
        </View>
      );
    }

    if (Icon) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {iconPosition === 'left' && (
            <Icon
              size={styles.iconSize}
              color={iconColor}
              strokeWidth={2}
              style={{ marginRight: Spacing.sm }}
            />
          )}
          <Text style={[styles.text, textStyle]}>{title}</Text>
          {iconPosition === 'right' && (
            <Icon
              size={styles.iconSize}
              color={iconColor}
              strokeWidth={2}
              style={{ marginLeft: Spacing.sm }}
            />
          )}
        </View>
      );
    }

    return <Text style={[styles.text, textStyle]}>{title}</Text>;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

// Preset button components for common use cases
export const PrimaryButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button {...props} variant="primary" />
);

export const SecondaryButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button {...props} variant="secondary" />
);

export const OutlineButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button {...props} variant="outline" />
);

export const GhostButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button {...props} variant="ghost" />
);

export const DestructiveButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button {...props} variant="destructive" />
); 