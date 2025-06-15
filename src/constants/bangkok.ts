// Bangkok Districts with descriptions
export const BANGKOK_DISTRICTS = [
  { key: 'sukhumvit', label: 'Sukhumvit', description: 'Shopping, nightlife, expat area' },
  { key: 'silom', label: 'Silom', description: 'Business district, nightlife' },
  { key: 'siam', label: 'Siam', description: 'Shopping malls, central Bangkok' },
  { key: 'chatuchak', label: 'Chatuchak', description: 'Weekend market, local culture' },
  { key: 'khao_san', label: 'Khao San', description: 'Backpacker area, street food' },
  { key: 'thonglor', label: 'Thonglor', description: 'Trendy dining, upscale' },
  { key: 'ekkamai', label: 'Ekkamai', description: 'Hip cafes, nightlife' },
  { key: 'ari', label: 'Ari', description: 'Local neighborhood, authentic food' },
  { key: 'phrom_phong', label: 'Phrom Phong', description: 'Expat-friendly, shopping' },
  { key: 'asok', label: 'Asok', description: 'Business, entertainment' },
  { key: 'saphan_phut', label: 'Saphan Phut', description: 'Wholesale market' },
  { key: 'chinatown', label: 'Chinatown', description: 'Traditional Chinese culture' },
  { key: 'dusit', label: 'Dusit', description: 'Government area, parks' },
  { key: 'bang_sue', label: 'Bang Sue', description: 'Transport hub' },
  { key: 'lat_phrao', label: 'Lat Phrao', description: 'Local residential' },
  { key: 'huai_khwang', label: 'Huai Khwang', description: 'Night market' },
  { key: 'ratchada', label: 'Ratchada', description: 'Entertainment district' },
  { key: 'ramkhamhaeng', label: 'Ramkhamhaeng', description: 'University area' },
];

// Cuisine types popular in Bangkok
export const CUISINE_TYPES = [
  { key: 'thai', label: 'Thai' },
  { key: 'japanese', label: 'Japanese' },
  { key: 'korean', label: 'Korean' },
  { key: 'chinese', label: 'Chinese' },
  { key: 'italian', label: 'Italian' },
  { key: 'american', label: 'American' },
  { key: 'indian', label: 'Indian' },
  { key: 'mexican', label: 'Mexican' },
  { key: 'french', label: 'French' },
  { key: 'vietnamese', label: 'Vietnamese' },
  { key: 'street_food', label: 'Street Food' },
  { key: 'seafood', label: 'Seafood' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'desserts', label: 'Desserts' },
];

// Dietary restrictions
export const DIETARY_RESTRICTIONS = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
  { key: 'gluten_free', label: 'Gluten Free' },
  { key: 'dairy_free', label: 'Dairy Free' },
  { key: 'nut_free', label: 'Nut Free' },
  { key: 'low_carb', label: 'Low Carb' },
  { key: 'keto', label: 'Keto' },
];

// Price ranges with Thai Baht descriptions
export const PRICE_RANGES = [
  { key: 'budget', label: 'Budget', description: '฿50-150 per meal' },
  { key: 'moderate', label: 'Moderate', description: '฿150-400 per meal' },
  { key: 'upscale', label: 'Upscale', description: '฿400-800 per meal' },
  { key: 'luxury', label: 'Luxury', description: '฿800+ per meal' },
];

// Transportation methods in Bangkok
export const TRANSPORT_METHODS = [
  { key: 'bts', label: 'BTS Skytrain' },
  { key: 'mrt', label: 'MRT Subway' },
  { key: 'bus', label: 'Bus' },
  { key: 'taxi', label: 'Taxi' },
  { key: 'grab', label: 'Grab' },
  { key: 'walking', label: 'Walking' },
  { key: 'motorcycle', label: 'Motorcycle Taxi' },
  { key: 'car', label: 'Own Car' },
];

// Activity types
export const ACTIVITY_TYPES = [
  { key: 'dining', label: 'Dining' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'nightlife', label: 'Nightlife' },
  { key: 'culture', label: 'Culture & Arts' },
  { key: 'nature', label: 'Nature & Parks' },
  { key: 'fitness', label: 'Fitness & Sports' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'business', label: 'Business' },
  { key: 'relaxation', label: 'Relaxation & Spa' },
];

// Group size options
export const GROUP_SIZES = [
  { key: 'solo', label: 'Solo' },
  { key: 'couple', label: 'Couple' },
  { key: 'small_group', label: 'Small Group (3-5)' },
  { key: 'large_group', label: 'Large Group (6+)' },
];

// Default preferences for Bangkok users
export const DEFAULT_PREFERENCES = {
  preferred_districts: ['sukhumvit', 'siam', 'silom'],
  cuisine_preferences: ['thai', 'japanese', 'street_food'],
  dietary_restrictions: [],
  price_range: 'moderate',
  transportation_methods: ['bts', 'grab', 'walking'],
  activity_types: ['dining', 'shopping', 'culture'],
  typical_group_size: 'couple',
  notifications: {
    recommendations: true,
    check_in_reminders: true,
    social_updates: false,
    marketing: false,
  },
  privacy: {
    profile_visibility: 'friends',
    location_sharing: true,
    check_in_visibility: 'friends',
    list_sharing_default: 'friends',
  },
}; 