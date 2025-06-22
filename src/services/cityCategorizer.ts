import { CityConfig, getCityConfig, getDefaultCity } from '../config/cities';
import { CityContext } from '../types';

export class CityCategorizer {
  // Calculate distance between two coordinates in kilometers
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Determine environment based on place types and city rules
  private determineEnvironment(types: string[], cityConfig: CityConfig): 'indoor' | 'outdoor' | 'mixed' {
    const rules = cityConfig.categorization_rules.environment;
    
    if (types.some(type => rules.outdoor_types.includes(type))) {
      return 'outdoor';
    } else if (types.some(type => rules.indoor_types.includes(type))) {
      return 'indoor';
    } else if (types.some(type => rules.mixed_types.includes(type))) {
      return 'mixed';
    }
    
    return 'indoor'; // Default
  }

  // Determine location type based on Google types and city mapping
  private determineLocationType(types: string[], cityConfig: CityConfig): string {
    const mapping = cityConfig.categorization_rules.location_type_mapping;
    
    // Find first matching type in priority order
    for (const type of types) {
      if (mapping[type]) {
        return mapping[type];
      }
    }
    
    return 'building'; // Default
  }

  // Calculate transport proximity for the city
  private calculateTransportProximity(coordinates: [number, number], cityConfig: CityConfig) {
    const [lng, lat] = coordinates;
    
    // For now, simplified distance-based calculation
    // In future, could use actual station coordinates
    const cityCenter = cityConfig.coordinates;
    const distance = this.calculateDistance(lat, lng, cityCenter[1], cityCenter[0]);
    
    // Get primary transport system (first one defined)
    const primaryTransport = Object.keys(cityConfig.transport_systems)[0];
    const transportInfo = cityConfig.transport_systems[primaryTransport];
    
    let proximityDistance: 'walking' | 'near' | 'far' | 'none';
    if (distance < 1) {
      proximityDistance = 'walking';
    } else if (distance < 3) {
      proximityDistance = 'near';
    } else if (distance < 10) {
      proximityDistance = 'far';
    } else {
      proximityDistance = 'none';
    }
    
    return {
      system: transportInfo.name,
      distance: proximityDistance,
      stations: [] // Could be enhanced to find nearest stations
    };
  }

  // Determine price context based on Google price level and city scale
  private determinePriceContext(priceLevel: number | undefined, cityConfig: CityConfig) {
    const mapping = cityConfig.categorization_rules.price_tier_mapping;
    const tier = priceLevel && mapping[priceLevel] ? mapping[priceLevel] : cityConfig.price_scale[1]; // Default to second tier
    
    return {
      tier,
      local_scale: cityConfig.price_scale
    };
  }

  // Determine noise level based on location type and city rules
  private determineNoiseLevel(locationType: string, environment: string, cityConfig: CityConfig): 'quiet' | 'moderate' | 'loud' {
    const rules = cityConfig.categorization_rules.noise_level_rules;
    
    if (rules[locationType]) {
      return rules[locationType];
    }
    
    // Fallback based on environment
    if (environment === 'outdoor') {
      return 'quiet';
    }
    
    return 'moderate'; // Default
  }

  // Main categorization function
  async categorizePlace(place: any, cityCode?: string): Promise<CityContext> {
    const cityConfig = cityCode ? getCityConfig(cityCode) : getDefaultCity();
    if (!cityConfig) {
      throw new Error(`Unsupported city code: ${cityCode}`);
    }

    // Parse place types
    const types = place.place_type?.split(',') || place.google_types || [];
    
    // Determine basic characteristics
    const environment = this.determineEnvironment(types, cityConfig);
    const locationType = this.determineLocationType(types, cityConfig);
    const transportProximity = this.calculateTransportProximity(place.coordinates, cityConfig);
    const priceContext = this.determinePriceContext(place.price_level, cityConfig);
    const noiseLevel = this.determineNoiseLevel(locationType, environment, cityConfig);
    
    // Determine other characteristics based on city defaults and logic
    const airConditioning = environment === 'indoor' || locationType === 'mall' 
      ? cityConfig.characteristic_defaults.air_conditioning_indoor 
      : cityConfig.characteristic_defaults.air_conditioning_outdoor;
    
    const context: CityContext = {
      city_code: cityConfig.code,
      environment,
      location_type: locationType,
      noise_level: noiseLevel,
      air_conditioning: airConditioning,
      transport_proximity: transportProximity,
      price_context: priceContext,
      local_characteristics: {
        // City-specific characteristics can be added here
        city_name: cityConfig.name,
        country: cityConfig.country,
        timezone: cityConfig.timezone
      }
    };

    return context;
  }

  // Legacy method for backward compatibility
  async categorizeBangkokPlace(place: any): Promise<any> {
    const cityContext = await this.categorizePlace(place, 'BKK');
    
    // Convert CityContext back to BangkokContext format for backward compatibility
    return {
      environment: cityContext.environment,
      location_type: cityContext.location_type,
      bts_proximity: cityContext.transport_proximity?.distance || 'none',
      air_conditioning: cityContext.air_conditioning || false,
      noise_level: cityContext.noise_level,
      price_tier: cityContext.price_context.tier,
      crowd_level: cityContext.crowd_level,
      wifi_available: cityContext.wifi_available,
      parking_available: cityContext.parking_available
    };
  }
}

// Export singleton instance
export const cityCategorizer = new CityCategorizer();