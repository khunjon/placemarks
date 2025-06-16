import { Theme } from 'react-native-elements';

// iOS Dark Mode Color Palette
export const Colors = {
  // iOS System Colors - Dark Mode
  system: {
    black: '#000000',
    white: '#FFFFFF',
    gray: '#8E8E93',
    gray2: '#636366',
    gray3: '#48484A',
    gray4: '#3A3A3C',
    gray5: '#2C2C2E',
    gray6: '#1C1C1E',
  },
  
  // iOS Semantic Colors - Dark Mode
  semantic: {
    label: '#FFFFFF',
    secondaryLabel: '#EBEBF5',
    tertiaryLabel: '#EBEBF5',
    quaternaryLabel: '#EBEBF5',
    systemFill: '#787880',
    secondarySystemFill: '#787880',
    tertiarySystemFill: '#767680',
    quaternarySystemFill: '#767680',
    placeholderText: '#EBEBF5',
    systemBackground: '#000000',
    secondarySystemBackground: '#1C1C1E',
    tertiarySystemBackground: '#2C2C2E',
    systemGroupedBackground: '#000000',
    secondarySystemGroupedBackground: '#1C1C1E',
    tertiarySystemGroupedBackground: '#2C2C2E',
    separator: '#38383A',
    opaqueSeparator: '#38383A',
  },
  
  // iOS Accent Colors - Dark Mode
  accent: {
    blue: '#0A84FF',
    green: '#30D158',
    indigo: '#5E5CE6',
    orange: '#FF9F0A',
    pink: '#FF2D92',
    purple: '#BF5AF2',
    red: '#FF453A',
    teal: '#40C8E0',
    yellow: '#FFD60A',
  },
  
  // Bangkok-Specific Brand Colors - Dark Mode
  bangkok: {
    // Traditional Thai colors adapted for dark mode
    gold: '#FFD700',
    saffron: '#FF8C42',
    emerald: '#50C878',
    ruby: '#E0115F',
    sapphire: '#0F52BA',
    
    // Bangkok cityscape inspired
    skyline: '#1A1A2E',
    riverColor: '#16213E',
    temple: '#8B4513',
    market: '#FF6B35',
    tukTuk: '#FFE135',
    
    // Location-specific gradients
    sunset: ['#FF6B35', '#F7931E'],
    riverGradient: ['#16213E', '#0F3460'],
    templeGradient: ['#8B4513', '#A0522D'],
  },
  
  // Status Colors - Dark Mode
  status: {
    success: '#30D158',
    warning: '#FFD60A',
    error: '#FF453A',
    info: '#0A84FF',
  },
  
  // Transparency Levels
  opacity: {
    high: 'rgba(255, 255, 255, 0.87)',
    medium: 'rgba(255, 255, 255, 0.60)',
    disabled: 'rgba(255, 255, 255, 0.38)',
    divider: 'rgba(255, 255, 255, 0.12)',
    background: 'rgba(0, 0, 0, 0.04)',
  },
} as const;

// Typography Scale for Dark Mode
export const Typography = {
  // iOS Text Styles
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    color: Colors.semantic.label,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    color: Colors.semantic.label,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    color: Colors.semantic.label,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
    color: Colors.semantic.label,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    color: Colors.semantic.label,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: Colors.semantic.label,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
    color: Colors.semantic.label,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: Colors.semantic.secondaryLabel,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: Colors.semantic.secondaryLabel,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: Colors.semantic.secondaryLabel,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
    color: Colors.semantic.tertiaryLabel,
  },
} as const;

// Spacing System
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// Border Radius
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 50,
} as const;

// Shadows for Dark Mode
export const Shadows = {
  small: {
    shadowColor: Colors.system.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.system.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.system.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// React Native Elements Dark Theme Configuration
export const ReactNativeElementsTheme: Theme = {
  colors: {
    primary: Colors.accent.blue,
    secondary: Colors.bangkok.gold,
    success: Colors.status.success,
    warning: Colors.status.warning,
    error: Colors.status.error,
    grey0: Colors.system.gray6,
    grey1: Colors.system.gray5,
    grey2: Colors.system.gray4,
    grey3: Colors.system.gray3,
    grey4: Colors.system.gray2,
    grey5: Colors.system.gray,
    greyOutline: Colors.semantic.separator,
    searchBg: Colors.semantic.tertiarySystemBackground,
    platform: {
      ios: {
        primary: Colors.accent.blue,
        secondary: Colors.bangkok.gold,
        grey: Colors.system.gray,
        searchBg: Colors.semantic.tertiarySystemBackground,
        success: Colors.status.success,
        error: Colors.status.error,
        warning: Colors.status.warning,
      },
      android: {
        primary: Colors.accent.blue,
        secondary: Colors.bangkok.gold,
        grey: Colors.system.gray,
        searchBg: Colors.semantic.tertiarySystemBackground,
        success: Colors.status.success,
        error: Colors.status.error,
        warning: Colors.status.warning,
      },
      web: {
        primary: Colors.accent.blue,
        secondary: Colors.bangkok.gold,
        grey: Colors.system.gray,
        searchBg: Colors.semantic.tertiarySystemBackground,
        success: Colors.status.success,
        error: Colors.status.error,
        warning: Colors.status.warning,
      },
    },
  },
};

// Component Style Configurations (separate from RNE theme)
export const ComponentStyles = {
  Button: {
    titleStyle: {
      ...Typography.headline,
      color: Colors.system.white,
    },
    buttonStyle: {
      backgroundColor: Colors.accent.blue,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
  },
  Header: {
    backgroundColor: Colors.semantic.systemBackground,
    centerComponentStyle: {
      ...Typography.headline,
      color: Colors.semantic.label,
    },
    leftComponentStyle: {
      color: Colors.accent.blue,
    },
    rightComponentStyle: {
      color: Colors.accent.blue,
    },
  },
  Input: {
    inputStyle: {
      ...Typography.body,
      color: Colors.semantic.label,
    },
    placeholderTextColor: Colors.semantic.placeholderText,
    inputContainerStyle: {
      backgroundColor: Colors.semantic.tertiarySystemBackground,
      borderBottomColor: Colors.semantic.separator,
      borderRadius: BorderRadius.sm,
      paddingHorizontal: Spacing.md,
    },
  },
  Card: {
    containerStyle: {
      backgroundColor: Colors.semantic.secondarySystemBackground,
      borderColor: Colors.semantic.separator,
      borderRadius: BorderRadius.md,
      ...Shadows.medium,
    },
    titleStyle: {
      ...Typography.headline,
      color: Colors.semantic.label,
    },
  },
  ListItem: {
    containerStyle: {
      backgroundColor: Colors.semantic.secondarySystemBackground,
      borderBottomColor: Colors.semantic.separator,
    },
    titleStyle: {
      ...Typography.body,
      color: Colors.semantic.label,
    },
    subtitleStyle: {
      ...Typography.subhead,
      color: Colors.semantic.secondaryLabel,
    },
  },
  Text: {
    style: {
      ...Typography.body,
      color: Colors.semantic.label,
    },
  },
} as const;

// Bangkok-Specific Component Themes
export const BangkokThemes = {
  // Place card theme with Bangkok colors
  placeCard: {
    container: {
      backgroundColor: Colors.semantic.secondarySystemBackground,
      borderColor: Colors.semantic.separator,
      borderRadius: BorderRadius.lg,
      ...Shadows.medium,
    },
    title: {
      ...Typography.headline,
      color: Colors.semantic.label,
    },
    subtitle: {
      ...Typography.subhead,
      color: Colors.bangkok.gold,
    },
    description: {
      ...Typography.callout,
      color: Colors.semantic.secondaryLabel,
    },
  },
  
  // Map theme
  map: {
    style: 'dark' as const,
    customMapStyle: [
      {
        elementType: 'geometry',
        stylers: [{ color: Colors.system.gray6 }],
      },
      {
        elementType: 'labels.text.fill',
        stylers: [{ color: Colors.semantic.label }],
      },
      {
        elementType: 'labels.text.stroke',
        stylers: [{ color: Colors.system.black }],
      },
             {
         featureType: 'water',
         elementType: 'geometry',
         stylers: [{ color: Colors.bangkok.riverGradient[1] }],
       },
    ],
  },
  
  // Navigation theme
  navigation: {
    headerStyle: {
      backgroundColor: Colors.semantic.systemBackground,
      borderBottomColor: Colors.semantic.separator,
    },
    headerTitleStyle: {
      ...Typography.headline,
      color: Colors.semantic.label,
    },
    headerTintColor: Colors.accent.blue,
    tabBarStyle: {
      backgroundColor: Colors.semantic.systemBackground,
      borderTopColor: Colors.semantic.separator,
    },
    tabBarActiveTintColor: Colors.accent.blue,
    tabBarInactiveTintColor: Colors.system.gray,
  },
} as const;

// Type definitions
export type ColorKeys = keyof typeof Colors;
export type TypographyKeys = keyof typeof Typography;
export type SpacingKeys = keyof typeof Spacing;
export type BorderRadiusKeys = keyof typeof BorderRadius;
export type ShadowKeys = keyof typeof Shadows;

// Theme interface
export interface PlacemarksTheme {
  colors: typeof Colors;
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  shadows: typeof Shadows;
  reactNativeElements: typeof ReactNativeElementsTheme;
  componentStyles: typeof ComponentStyles;
  bangkok: typeof BangkokThemes;
}

// Main theme export
export const DarkTheme: PlacemarksTheme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  reactNativeElements: ReactNativeElementsTheme,
  componentStyles: ComponentStyles,
  bangkok: BangkokThemes,
} as const;

// Default export
export default DarkTheme; 