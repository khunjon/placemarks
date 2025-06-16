import React from 'react';
import { View, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Spacing, BorderRadius, Shadows } from '../../constants/Spacing';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const getCardStyles = (
  variant: CardVariant,
  padding: CardPadding,
  isInteractive: boolean,
  disabled: boolean
): ViewStyle => {
  // Base styles
  const baseStyle: ViewStyle = {
    borderRadius: BorderRadius.component.card,
    overflow: 'hidden',
  };

  // Padding styles
  const paddingStyles = {
    none: {},
    sm: { padding: Spacing.sm },
    md: { padding: Spacing.md },
    lg: { padding: Spacing.lg },
  };

  // Variant styles
  const variantStyles = {
    default: {
      backgroundColor: Colors.semantic.surfacePrimary,
      borderWidth: 1,
      borderColor: Colors.semantic.borderPrimary,
      ...Shadows.dark.xs,
    },
    elevated: {
      backgroundColor: Colors.semantic.surfacePrimary,
      borderWidth: 0,
      ...Shadows.dark.md,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: Colors.semantic.borderSecondary,
    },
    filled: {
      backgroundColor: Colors.semantic.surfaceSecondary,
      borderWidth: 0,
    },
  };

  return {
    ...baseStyle,
    ...variantStyles[variant],
    ...paddingStyles[padding],
    ...(disabled && { opacity: 0.6 }),
  };
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  style,
  disabled = false,
}: CardProps) {
  const cardStyle = getCardStyles(variant, padding, !!onPress, disabled);

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}

// Preset card components for common use cases
export const ElevatedCard = (props: Omit<CardProps, 'variant'>) => (
  <Card {...props} variant="elevated" />
);

export const OutlinedCard = (props: Omit<CardProps, 'variant'>) => (
  <Card {...props} variant="outlined" />
);

export const FilledCard = (props: Omit<CardProps, 'variant'>) => (
  <Card {...props} variant="filled" />
);

// Specialized card components
export interface ContentCardProps extends Omit<CardProps, 'children'> {
  header?: React.ReactNode;
  content: React.ReactNode;
  footer?: React.ReactNode;
  headerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  footerStyle?: ViewStyle;
}

export function ContentCard({
  header,
  content,
  footer,
  headerStyle,
  contentStyle,
  footerStyle,
  padding = 'none',
  ...cardProps
}: ContentCardProps) {
  return (
    <Card {...cardProps} padding={padding}>
      {header && (
        <View
          style={[
            {
              paddingHorizontal: Spacing.md,
              paddingTop: Spacing.md,
              paddingBottom: content ? Spacing.sm : Spacing.md,
            },
            headerStyle,
          ]}
        >
          {header}
        </View>
      )}
      
      {content && (
        <View
          style={[
            {
              paddingHorizontal: Spacing.md,
              paddingVertical: header || footer ? 0 : Spacing.md,
            },
            contentStyle,
          ]}
        >
          {content}
        </View>
      )}
      
      {footer && (
        <View
          style={[
            {
              paddingHorizontal: Spacing.md,
              paddingTop: content ? Spacing.sm : Spacing.md,
              paddingBottom: Spacing.md,
              borderTopWidth: 1,
              borderTopColor: Colors.semantic.borderPrimary,
            },
            footerStyle,
          ]}
        >
          {footer}
        </View>
      )}
    </Card>
  );
}

// List card for consistent list item styling
export interface ListCardProps extends Omit<CardProps, 'children'> {
  children: React.ReactNode;
  showDivider?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export function ListCard({
  children,
  showDivider = true,
  isFirst = false,
  isLast = false,
  style,
  ...cardProps
}: ListCardProps) {
  const listCardStyle: ViewStyle = {
    borderRadius: 0,
    ...(isFirst && {
      borderTopLeftRadius: BorderRadius.component.card,
      borderTopRightRadius: BorderRadius.component.card,
    }),
    ...(isLast && {
      borderBottomLeftRadius: BorderRadius.component.card,
      borderBottomRightRadius: BorderRadius.component.card,
    }),
    ...(showDivider && !isLast && {
      borderBottomWidth: 1,
      borderBottomColor: Colors.semantic.borderPrimary,
    }),
  };

  return (
    <Card
      {...cardProps}
      variant="filled"
      padding="none"
      style={[listCardStyle, style]}
    >
      {children}
    </Card>
  );
} 