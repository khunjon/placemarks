// Spacing System based on 4px grid
export const Spacing = {
  // Base spacing units (4px grid)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Component-specific spacing
  component: {
    // Padding
    paddingXs: 8,
    paddingSm: 12,
    paddingMd: 16,
    paddingLg: 20,
    paddingXl: 24,

    // Margins
    marginXs: 4,
    marginSm: 8,
    marginMd: 12,
    marginLg: 16,
    marginXl: 20,

    // Gaps
    gapXs: 4,
    gapSm: 8,
    gapMd: 12,
    gapLg: 16,
    gapXl: 20,
  },

  // Layout spacing
  layout: {
    screenPadding: 16,
    sectionSpacing: 24,
    cardSpacing: 12,
    listItemSpacing: 8,
    buttonSpacing: 12,
  },

  // Icon sizes
  iconSize: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Avatar sizes
  avatarSize: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
    xxl: 120,
  },
} as const;

// Border Radius System
export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,

  // Component-specific radius
  component: {
    button: 8,
    card: 12,
    input: 8,
    badge: 16,
    avatar: 9999,
    modal: 16,
  },
} as const;

// Shadow/Elevation System
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  xs: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1,
    elevation: 1,
  },

  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 2.62,
    elevation: 2,
  },

  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.19,
    shadowRadius: 5.62,
    elevation: 4,
  },

  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 10.32,
    elevation: 8,
  },

  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 15.46,
    elevation: 12,
  },

  // Dark mode shadows (more subtle)
  dark: {
    xs: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 1,
      elevation: 1,
    },

    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 2.62,
      elevation: 2,
    },

    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5.62,
      elevation: 4,
    },

    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 10.32,
      elevation: 8,
    },

    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 15.46,
      elevation: 12,
    },
  },
} as const;

// Typography Scale
export const Typography = {
  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    xxxxl: 32,
  },

  // Line heights
  lineHeight: {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
    xxl: 32,
    xxxl: 36,
    xxxxl: 40,
  },

  // Font weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // iOS-style text styles
  ios: {
    largeTitle: {
      fontSize: 34,
      lineHeight: 41,
      fontWeight: '700' as const,
    },
    title1: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700' as const,
    },
    title2: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as const,
    },
    title3: {
      fontSize: 20,
      lineHeight: 25,
      fontWeight: '600' as const,
    },
    headline: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '400' as const,
    },
    callout: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '400' as const,
    },
    subhead: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '400' as const,
    },
    footnote: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400' as const,
    },
    caption1: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
    },
    caption2: {
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '400' as const,
    },
  },
} as const;

// Animation/Transition constants
export const Animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  
  easing: {
    easeInOut: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    linear: 'linear',
  },
} as const;

// Z-index scale
export const ZIndex = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
} as const;

export default {
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
  Animation,
  ZIndex,
}; 