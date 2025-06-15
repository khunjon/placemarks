// App Configuration
export const APP_CONFIG = {
  name: 'Placemarks',
  version: '1.0.0',
  scheme: 'placemarks',
};

// Bangkok-specific constants
export const BANGKOK_CONFIG = {
  center: {
    latitude: 13.7563,
    longitude: 100.5018,
  },
  defaultRadius: 5000, // 5km
  districts: [
    'Sukhumvit',
    'Silom',
    'Siam',
    'Chatuchak',
    'Thonglor',
    'Ekkamai',
    'Ari',
    'Phrom Phong',
    'Asok',
    'Ratchathewi',
  ],
};

// Place categories
export const PLACE_CATEGORIES = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bar: 'Bar',
  shopping: 'Shopping',
  attraction: 'Attraction',
  hotel: 'Hotel',
  transport: 'Transport',
  service: 'Service',
};

// Price levels
export const PRICE_LEVELS = {
  0: 'Free',
  1: 'Inexpensive',
  2: 'Moderate',
  3: 'Expensive',
  4: 'Very Expensive',
};

// API Configuration
export const API_CONFIG = {
  googlePlaces: {
    baseUrl: 'https://maps.googleapis.com/maps/api/place',
    nearbySearchRadius: 5000,
    autocompleteRadius: 50000,
  },
  supabase: {
    maxRetries: 3,
    timeout: 10000,
  },
};

// UI Constants
export const UI_CONFIG = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
}; 