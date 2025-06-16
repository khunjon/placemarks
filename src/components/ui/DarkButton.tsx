import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DarkTheme } from '../../constants/theme';

export interface DarkButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'bangkok';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: any;
  textStyle?: any;
}

const getVariantStyles = (variant: DarkButtonProps['variant']) => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: DarkTheme.colors.accent.blue,
        borderColor: DarkTheme.colors.accent.blue,
        textColor: DarkTheme.colors.system.white,
      };
    case 'secondary':
      return {
        backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
        borderColor: DarkTheme.colors.semantic.separator,
        textColor: DarkTheme.colors.semantic.label,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderColor: DarkTheme.colors.semantic.separator,
        textColor: DarkTheme.colors.accent.blue,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: DarkTheme.colors.accent.blue,
      };
    case 'destructive':
      return {
        backgroundColor: DarkTheme.colors.status.error,
        borderColor: DarkTheme.colors.status.error,
        textColor: DarkTheme.colors.system.white,
      };
    case 'bangkok':
      return {
        backgroundColor: DarkTheme.colors.bangkok.gold,
        borderColor: DarkTheme.colors.bangkok.gold,
        textColor: DarkTheme.colors.system.black,
      };
    default:
      return {
        backgroundColor: DarkTheme.colors.accent.blue,
        borderColor: DarkTheme.colors.accent.blue,
        textColor: DarkTheme.colors.system.white,
      };
  }
};

const getSizeStyles = (size: DarkButtonProps['size']) => {
  switch (size) {
    case 'small':
      return {
        paddingVertical: DarkTheme.spacing.sm,
        paddingHorizontal: DarkTheme.spacing.md,
        borderRadius: DarkTheme.borderRadius.sm,
        typography: DarkTheme.typography.callout,
        iconSize: 16,
      };
    case 'large':
      return {
        paddingVertical: DarkTheme.spacing.lg,
        paddingHorizontal: DarkTheme.spacing.xl,
        borderRadius: DarkTheme.borderRadius.lg,
        typography: DarkTheme.typography.headline,
        iconSize: 24,
      };
    default: // medium
      return {
        paddingVertical: DarkTheme.spacing.md,
        paddingHorizontal: DarkTheme.spacing.lg,
        borderRadius: DarkTheme.borderRadius.md,
        typography: DarkTheme.typography.headline,
        iconSize: 20,
      };
  }
};

export default function DarkButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: DarkButtonProps) {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  
  const isDisabled = disabled || loading;
  const opacity = isDisabled ? 0.6 : 1;

  const renderIcon = () => {
    if (loading) {
      return (
        <ActivityIndicator 
          size="small" 
          color={variantStyles.textColor}
          style={{ 
            marginRight: iconPosition === 'left' ? DarkTheme.spacing.sm : 0,
            marginLeft: iconPosition === 'right' ? DarkTheme.spacing.sm : 0,
          }}
        />
      );
    }

    if (!icon) return null;

    return (
      <Icon 
        name={icon} 
        size={sizeStyles.iconSize} 
        color={variantStyles.textColor}
        style={{ 
          marginRight: iconPosition === 'left' ? DarkTheme.spacing.sm : 0,
          marginLeft: iconPosition === 'right' ? DarkTheme.spacing.sm : 0,
        }}
      />
    );
  };

  const buttonContent = () => (
    <>
      {(icon || loading) && iconPosition === 'left' && renderIcon()}
      <Text 
        style={[
          sizeStyles.typography,
          { 
            color: variantStyles.textColor,
            fontWeight: '600',
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
      {(icon || loading) && iconPosition === 'right' && renderIcon()}
    </>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: 1,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderRadius: sizeStyles.borderRadius,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          ...DarkTheme.shadows.small,
        },
        fullWidth && { width: '100%' },
        style,
      ]}
      activeOpacity={0.8}
    >
      {buttonContent()}
    </TouchableOpacity>
  );
}

// Preset button variants for common use cases
export const PrimaryButton = (props: Omit<DarkButtonProps, 'variant'>) => (
  <DarkButton {...props} variant="primary" />
);

export const SecondaryButton = (props: Omit<DarkButtonProps, 'variant'>) => (
  <DarkButton {...props} variant="secondary" />
);

export const OutlineButton = (props: Omit<DarkButtonProps, 'variant'>) => (
  <DarkButton {...props} variant="outline" />
);

export const GhostButton = (props: Omit<DarkButtonProps, 'variant'>) => (
  <DarkButton {...props} variant="ghost" />
);

export const DestructiveButton = (props: Omit<DarkButtonProps, 'variant'>) => (
  <DarkButton {...props} variant="destructive" />
);

export const BangkokButton = (props: Omit<DarkButtonProps, 'variant'>) => (
  <DarkButton {...props} variant="bangkok" />
); 