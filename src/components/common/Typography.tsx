import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Typography as TypographyConstants } from '../../constants/Spacing';

export type TextVariant = 
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption1'
  | 'caption2';

export type TextColor = 
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'disabled'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'brand';

export interface TypographyProps {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: TextColor;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onPress?: () => void;
  selectable?: boolean;
  testID?: string;
}

const getTextColor = (color: TextColor): string => {
  switch (color) {
    case 'primary':
      return Colors.semantic.textPrimary;
    case 'secondary':
      return Colors.semantic.textSecondary;
    case 'tertiary':
      return Colors.semantic.textTertiary;
    case 'quaternary':
      return Colors.semantic.textQuaternary;
    case 'disabled':
      return Colors.semantic.textDisabled;
    case 'success':
      return Colors.semantic.success;
    case 'warning':
      return Colors.semantic.warning;
    case 'error':
      return Colors.semantic.error;
    case 'info':
      return Colors.semantic.info;
    case 'brand':
      return Colors.primary[500];
    default:
      return Colors.semantic.textPrimary;
  }
};

const getTextStyle = (variant: TextVariant): TextStyle => {
  return {
    ...TypographyConstants.ios[variant],
    color: Colors.semantic.textPrimary, // Default color, will be overridden by color prop
  };
};

export default function Typography({
  children,
  variant = 'body',
  color = 'primary',
  style,
  numberOfLines,
  onPress,
  selectable = false,
  testID,
}: TypographyProps) {
  const textStyle = getTextStyle(variant);
  const textColor = getTextColor(color);

  return (
    <Text
      style={[
        textStyle,
        { color: textColor },
        style,
      ]}
      numberOfLines={numberOfLines}
      onPress={onPress}
      selectable={selectable}
      testID={testID}
    >
      {children}
    </Text>
  );
}

// Preset typography components for common use cases
export const LargeTitle = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="largeTitle" />
);

export const Title1 = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="title1" />
);

export const Title2 = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="title2" />
);

export const Title3 = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="title3" />
);

export const Headline = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="headline" />
);

export const Body = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="body" />
);

export const Callout = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="callout" />
);

export const Subhead = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="subhead" />
);

export const Footnote = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="footnote" />
);

export const Caption1 = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="caption1" />
);

export const Caption2 = (props: Omit<TypographyProps, 'variant'>) => (
  <Typography {...props} variant="caption2" />
);

// Semantic typography components
export const ErrorText = (props: Omit<TypographyProps, 'color'>) => (
  <Typography {...props} color="error" />
);

export const SuccessText = (props: Omit<TypographyProps, 'color'>) => (
  <Typography {...props} color="success" />
);

export const WarningText = (props: Omit<TypographyProps, 'color'>) => (
  <Typography {...props} color="warning" />
);

export const InfoText = (props: Omit<TypographyProps, 'color'>) => (
  <Typography {...props} color="info" />
);

export const BrandText = (props: Omit<TypographyProps, 'color'>) => (
  <Typography {...props} color="brand" />
);

export const SecondaryText = (props: Omit<TypographyProps, 'color'>) => (
  <Typography {...props} color="secondary" />
);

export const DisabledText = (props: Omit<TypographyProps, 'color'>) => (
  <Typography {...props} color="disabled" />
); 