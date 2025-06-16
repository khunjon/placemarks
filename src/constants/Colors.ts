// Bangkok-themed Color Palette for Dark Mode
export const Colors = {
  // Primary Brand Colors
  primary: {
    50: '#FFF9E6',
    100: '#FFF0B3',
    200: '#FFE680',
    300: '#FFDC4D',
    400: '#FFD21A',
    500: '#FFD700', // Main gold
    600: '#E6C200',
    700: '#CCAD00',
    800: '#B39900',
    900: '#998500',
  },

  // Secondary Colors (Bangkok-inspired)
  secondary: {
    50: '#FFF4E6',
    100: '#FFE0B3',
    200: '#FFCC80',
    300: '#FFB84D',
    400: '#FFA41A',
    500: '#FF8C42', // Saffron
    600: '#E67D3B',
    700: '#CC6E34',
    800: '#B35F2D',
    900: '#995026',
  },

  // Neutral Colors (Dark Theme)
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    850: '#2C2C2E', // iOS dark secondary
    900: '#1C1C1E', // iOS dark primary
    950: '#000000',
  },

  // Semantic Colors
  semantic: {
    success: '#30D158',
    warning: '#FFD60A',
    error: '#FF453A',
    info: '#0A84FF',
    
    // Text Colors
    textPrimary: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#EBEBF599', // 60% opacity
    textQuaternary: '#EBEBF54D', // 30% opacity
    textDisabled: '#EBEBF538', // 22% opacity
    
    // Background Colors
    backgroundPrimary: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',
    backgroundQuaternary: '#3A3A3C',
    
    // Surface Colors
    surfacePrimary: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    surfaceTertiary: '#3A3A3C',
    
    // Border Colors
    borderPrimary: '#38383A',
    borderSecondary: '#48484A',
    borderTertiary: '#545458',
  },

  // Accent Colors
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
    mint: '#00D4AA',
    cyan: '#64D2FF',
  },

  // Bangkok-specific Colors
  bangkok: {
    gold: '#FFD700',
    saffron: '#FF8C42',
    emerald: '#50C878',
    ruby: '#E0115F',
    sapphire: '#0F52BA',
    temple: '#8B4513',
    market: '#FF6B35',
    tukTuk: '#FFE135',
    river: '#16213E',
    skyline: '#1A1A2E',
  },

  // Gradients
  gradients: {
    primary: ['#FFD700', '#FFA500'],
    secondary: ['#FF8C42', '#FF6B35'],
    sunset: ['#FF6B35', '#F7931E'],
    river: ['#16213E', '#0F3460'],
    temple: ['#8B4513', '#A0522D'],
    success: ['#30D158', '#28A745'],
    error: ['#FF453A', '#DC3545'],
  },

  // Overlay Colors
  overlay: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.2)',
    heavy: 'rgba(255, 255, 255, 0.3)',
    dark: 'rgba(0, 0, 0, 0.3)',
    darker: 'rgba(0, 0, 0, 0.5)',
    darkest: 'rgba(0, 0, 0, 0.7)',
  },

  // Transparent Colors
  transparent: {
    primary: 'rgba(255, 215, 0, 0.1)', // Gold with 10% opacity
    secondary: 'rgba(255, 140, 66, 0.1)', // Saffron with 10% opacity
    success: 'rgba(48, 209, 88, 0.1)',
    warning: 'rgba(255, 214, 10, 0.1)',
    error: 'rgba(255, 69, 58, 0.1)',
    info: 'rgba(10, 132, 255, 0.1)',
  },
} as const;

// Color utility functions
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const isDarkColor = (color: string): boolean => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
};

// Export default color scheme
export default Colors; 