// City configuration types for multi-city support

export interface CityBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface CityDistrict {
  key: string;
  label: string;
  description: string;
}

export interface CuisineType {
  key: string;
  label: string;
}

export interface CityConfig {
  code: string;
  name: string;
  country: string;
  timezone: string;
  coordinates: [number, number]; // [longitude, latitude] - city center
  
  // City boundaries for location detection
  bounds: CityBounds;
  
  // Districts within the city
  districts: CityDistrict[];
  
  // Popular cuisine types in this city
  cuisine_types: CuisineType[];
  
  // Transport systems in this city
  transport_systems: {
    [key: string]: {
      name: string;
      type: 'rail' | 'subway' | 'bus' | 'tram';
      stations?: string[];
    };
  };
  
  // City-specific location types
  location_types: string[];
  
  // City-specific price tiers (ordered from lowest to highest)
  price_scale: string[];
  
  // Categorization rules for place analysis
  categorization_rules: {
    environment: {
      outdoor_types: string[];
      indoor_types: string[];
      mixed_types: string[];
    };
    location_type_mapping: {
      [googleType: string]: string;
    };
    price_tier_mapping: {
      [googlePriceLevel: number]: string;
    };
    noise_level_rules: {
      [locationType: string]: 'quiet' | 'moderate' | 'busy';
    };
  };
  
  // City-specific characteristics that can be dynamically set
  characteristic_defaults: Record<string, any>;
}

export interface CityCategorizer {
  categorizePlace(place: any, cityConfig: CityConfig): Promise<any>;
  calculateTransportProximity(coordinates: [number, number], cityConfig: CityConfig): any;
}