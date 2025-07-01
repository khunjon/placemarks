import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DarkTheme } from '../../constants/theme';

export interface LocationBadgeProps {
  type: 'bts' | 'price' | 'distance' | 'category' | 'rating' | 'status';
  value: string | number;
  label?: string;
  variant?: 'default' | 'compact' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'bangkok';
  icon?: string;
  onPress?: () => void;
  style?: any;
}

const getBadgeConfig = (type: LocationBadgeProps['type'], value: string | number) => {
  switch (type) {
    case 'bts':
      return {
        icon: 'train',
        color: DarkTheme.colors.bangkok.sapphire,
        backgroundColor: `${DarkTheme.colors.bangkok.sapphire}20`,
        label: typeof value === 'string' ? value : `${value}m`,
        prefix: 'BTS',
      };
    case 'price':
      const priceLevel = typeof value === 'number' ? value : parseInt(value.toString());
      return {
        icon: 'attach-money',
        color: DarkTheme.colors.bangkok.gold,
        backgroundColor: `${DarkTheme.colors.bangkok.gold}20`,
        label: '฿'.repeat(Math.min(Math.max(priceLevel, 1), 4)),
        prefix: '',
      };
    case 'distance':
      return {
        icon: 'location-on',
        color: DarkTheme.colors.accent.blue,
        backgroundColor: `${DarkTheme.colors.accent.blue}20`,
        label: typeof value === 'string' ? value : `${value}km`,
        prefix: '',
      };
    case 'category':
      return {
        icon: 'category',
        color: DarkTheme.colors.accent.purple,
        backgroundColor: `${DarkTheme.colors.accent.purple}20`,
        label: value.toString(),
        prefix: '',
      };
    case 'rating':
      return {
        icon: 'star',
        color: DarkTheme.colors.accent.yellow,
        backgroundColor: `${DarkTheme.colors.accent.yellow}20`,
        label: typeof value === 'number' ? value.toFixed(1) : value.toString(),
        prefix: '',
      };
    case 'status':
      return {
        icon: 'info',
        color: DarkTheme.colors.status.info,
        backgroundColor: `${DarkTheme.colors.status.info}20`,
        label: value.toString(),
        prefix: '',
      };
    default:
      return {
        icon: 'info',
        color: DarkTheme.colors.semantic.secondaryLabel,
        backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
        label: value.toString(),
        prefix: '',
      };
  }
};

const getColorConfig = (color: LocationBadgeProps['color']) => {
  switch (color) {
    case 'primary':
      return {
        color: DarkTheme.colors.accent.blue,
        backgroundColor: `${DarkTheme.colors.accent.blue}20`,
      };
    case 'secondary':
      return {
        color: DarkTheme.colors.semantic.secondaryLabel,
        backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
      };
    case 'success':
      return {
        color: DarkTheme.colors.status.success,
        backgroundColor: `${DarkTheme.colors.status.success}20`,
      };
    case 'warning':
      return {
        color: DarkTheme.colors.status.warning,
        backgroundColor: `${DarkTheme.colors.status.warning}20`,
      };
    case 'error':
      return {
        color: DarkTheme.colors.status.error,
        backgroundColor: `${DarkTheme.colors.status.error}20`,
      };
    case 'bangkok':
      return {
        color: DarkTheme.colors.bangkok.gold,
        backgroundColor: `${DarkTheme.colors.bangkok.gold}20`,
      };
    default:
      return {
        color: DarkTheme.colors.accent.blue,
        backgroundColor: `${DarkTheme.colors.accent.blue}20`,
      };
  }
};

const getSizeConfig = (size: LocationBadgeProps['size']) => {
  switch (size) {
    case 'small':
      return {
        paddingVertical: DarkTheme.spacing.xs,
        paddingHorizontal: DarkTheme.spacing.sm,
        borderRadius: DarkTheme.borderRadius.xs,
        typography: DarkTheme.typography.caption2,
        iconSize: 12,
      };
    case 'large':
      return {
        paddingVertical: DarkTheme.spacing.sm,
        paddingHorizontal: DarkTheme.spacing.md,
        borderRadius: DarkTheme.borderRadius.md,
        typography: DarkTheme.typography.callout,
        iconSize: 18,
      };
    default: // medium
      return {
        paddingVertical: DarkTheme.spacing.xs,
        paddingHorizontal: DarkTheme.spacing.sm,
        borderRadius: DarkTheme.borderRadius.sm,
        typography: DarkTheme.typography.caption1,
        iconSize: 14,
      };
  }
};

const getVariantStyles = (
  variant: LocationBadgeProps['variant'],
  colorConfig: { color: string; backgroundColor: string }
) => {
  switch (variant) {
    case 'compact':
      return {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingVertical: 2,
        paddingHorizontal: 4,
      };
    case 'outlined':
      return {
        backgroundColor: 'transparent',
        borderColor: colorConfig.color,
        borderWidth: 1,
      };
    case 'filled':
      return {
        backgroundColor: colorConfig.color,
        borderWidth: 0,
      };
    default: // default
      return {
        backgroundColor: colorConfig.backgroundColor,
        borderWidth: 0,
      };
  }
};

export default function LocationBadge({
  type,
  value,
  label,
  variant = 'default',
  size = 'medium',
  color,
  icon,
  onPress,
  style,
}: LocationBadgeProps) {
  const badgeConfig = getBadgeConfig(type, value);
  const colorConfig = color ? getColorConfig(color) : {
    color: badgeConfig.color,
    backgroundColor: badgeConfig.backgroundColor,
  };
  const sizeConfig = getSizeConfig(size);
  const variantStyles = getVariantStyles(variant, colorConfig);
  
  const displayIcon = icon || badgeConfig.icon;
  const displayLabel = label || badgeConfig.label;
  const isCompact = variant === 'compact';
  const isFilled = variant === 'filled';
  
  const textColor = isFilled ? DarkTheme.colors.system.white : colorConfig.color;

  const BadgeContent = () => (
    <View 
      style={[
        styles.container,
        {
          paddingVertical: isCompact ? variantStyles.paddingVertical : sizeConfig.paddingVertical,
          paddingHorizontal: isCompact ? variantStyles.paddingHorizontal : sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variantStyles.borderWidth,
        },
        style,
      ]}
    >
      {displayIcon && (
        <Icon 
          name={displayIcon} 
          size={sizeConfig.iconSize} 
          color={textColor}
          style={{ 
            marginRight: displayLabel ? DarkTheme.spacing.xs : 0 
          }}
        />
      )}
      
      {badgeConfig.prefix && !isCompact && (
        <Text 
          style={[
            sizeConfig.typography,
            { 
              color: textColor,
              fontWeight: '600',
              marginRight: DarkTheme.spacing.xs,
            }
          ]}
        >
          {badgeConfig.prefix}
        </Text>
      )}
      
      {displayLabel && (
        <Text 
          style={[
            sizeConfig.typography,
            { 
              color: textColor,
              fontWeight: isCompact ? '400' : '600',
            }
          ]}
        >
          {displayLabel}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <BadgeContent />
      </TouchableOpacity>
    );
  }

  return <BadgeContent />;
}

// Preset badge components for common use cases
export const BTSBadge = (props: Omit<LocationBadgeProps, 'type'>) => (
  <LocationBadge {...props} type="bts" />
);

export const PriceBadge = (props: Omit<LocationBadgeProps, 'type'>) => (
  <LocationBadge {...props} type="price" />
);

export const DistanceBadge = (props: Omit<LocationBadgeProps, 'type'>) => (
  <LocationBadge {...props} type="distance" />
);

export const CategoryBadge = (props: Omit<LocationBadgeProps, 'type'>) => (
  <LocationBadge {...props} type="category" />
);

export const RatingBadge = (props: Omit<LocationBadgeProps, 'type'>) => (
  <LocationBadge {...props} type="rating" />
);

export const StatusBadge = (props: Omit<LocationBadgeProps, 'type'>) => (
  <LocationBadge {...props} type="status" />
);

// Bangkok-specific preset badges
export const BangkokBTSBadge = ({ station, distance }: { station: string; distance?: string }) => (
  <View style={styles.container}>
    <BTSBadge 
      value={station} 
      size="small" 
      variant="filled"
    />
    {distance && (
      <DistanceBadge 
        value={distance} 
        size="small" 
        variant="compact"
        style={{ marginLeft: DarkTheme.spacing.xs }}
      />
    )}
  </View>
);

export const BangkokPriceTierBadge = ({ level, category }: { level: number; category?: string }) => (
  <View style={styles.container}>
    <PriceBadge 
      value={level} 
      size="small"
    />
    {category && (
      <CategoryBadge 
        value={category} 
        size="small" 
        variant="compact"
        style={{ marginLeft: DarkTheme.spacing.xs }}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 