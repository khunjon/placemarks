import { CityConfig } from './types';

export const bangkokConfig: CityConfig = {
  code: 'BKK',
  name: 'Bangkok',
  country: 'Thailand',
  timezone: 'Asia/Bangkok',
  coordinates: [100.5018, 13.7563], // [longitude, latitude] - Siam area
  
  // City boundaries for location detection
  bounds: {
    north: 13.956,  // Northern boundary
    south: 13.494,  // Southern boundary
    east: 100.928,  // Eastern boundary
    west: 100.321,  // Western boundary
  },
  
  // Bangkok districts with descriptions
  districts: [
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
  ],
  
  // Popular cuisine types in Bangkok
  cuisine_types: [
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
  ],
  
  transport_systems: {
    BTS: {
      name: 'BTS Skytrain',
      type: 'rail',
      stations: [
        'Siam', 'Chit Lom', 'Asok', 'Phrom Phong', 'Thong Lo', 'Ekkamai',
        'Nana', 'Ploenchit', 'Ratchathewi', 'Victory Monument', 'Saphan Phut',
        'National Stadium', 'Ratchadamri', 'Sala Daeng', 'Surasak', 'Saphan Taksin',
        'Krung Thon Buri', 'Wongwian Yai', 'Pho Nimit', 'Talad Phlu', 'Wutthakat',
        'Bang Wa', 'Mo Chit', 'Saphan Phut', 'Ari', 'Sanam Pao', 'Victory Monument',
        'Phaya Thai', 'Ratchathewi', 'Siam', 'National Stadium', 'Ratchadamri',
        'Sala Daeng', 'Chong Nonsi', 'Surasak', 'Saphan Taksin'
      ]
    },
    MRT: {
      name: 'MRT Subway',
      type: 'subway',
      stations: [
        'Silom', 'Lumphini', 'Khlong Toei', 'Queen Sirikit', 'Sukhumvit',
        'Phra Ram 9', 'Petchaburi', 'Ratchadaphisek', 'Lat Phrao', 'Chatuchak Park',
        'Kamphaeng Phet', 'Bang Sue', 'Tao Poon', 'Bang Pho', 'Wat Mangkon',
        'Sam Yot', 'Sanam Chai', 'Itsaraphap', 'Hua Lamphong'
      ]
    }
  },
  
  location_types: [
    'mall', 'street', 'building', 'market', 'rooftop', 'riverside',
    'temple', 'park', 'office_building', 'hotel', 'residential'
  ],
  
  price_scale: ['street', 'casual', 'mid', 'upscale', 'luxury'],
  
  categorization_rules: {
    environment: {
      outdoor_types: [
        'park', 'tourist_attraction', 'amusement_park', 'zoo', 'cemetery',
        'campground', 'rv_park', 'stadium', 'premise', 'establishment'
      ],
      indoor_types: [
        'restaurant', 'cafe', 'shopping_mall', 'store', 'gym', 'spa',
        'movie_theater', 'museum', 'library', 'hospital', 'bank'
      ],
      mixed_types: [
        'hotel', 'university', 'school', 'airport', 'train_station',
        'gas_station', 'car_dealer'
      ]
    },
    
    location_type_mapping: {
      'shopping_mall': 'mall',
      'department_store': 'mall',
      'market': 'market',
      'night_market': 'market',
      'floating_market': 'market',
      'restaurant': 'street',
      'cafe': 'street',
      'food_court': 'building',
      'rooftop_bar': 'rooftop',
      'sky_bar': 'rooftop',
      'river_cruise': 'riverside',
      'pier': 'riverside',
      'temple': 'temple',
      'wat': 'temple',
      'shrine': 'temple'
    },
    
    price_tier_mapping: {
      1: 'street',
      2: 'casual', 
      3: 'mid',
      4: 'upscale',
      5: 'luxury'
    },
    
    noise_level_rules: {
      'mall': 'moderate',
      'market': 'busy',
      'street': 'moderate',
      'rooftop': 'quiet',
      'riverside': 'quiet',
      'temple': 'quiet',
      'park': 'quiet',
      'building': 'moderate'
    }
  },
  
  characteristic_defaults: {
    air_conditioning_indoor: true,
    air_conditioning_outdoor: false,
    wifi_malls: true,
    wifi_street: false,
    parking_malls: true,
    parking_street: false
  }
};