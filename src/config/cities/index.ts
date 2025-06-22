import { CityConfig } from './types';
import { bangkokConfig } from './bangkok';

// Registry of all supported cities
export const cityConfigs: Record<string, CityConfig> = {
  BKK: bangkokConfig,
  // Future cities can be added here:
  // TYO: tokyoConfig,
  // NYC: newYorkConfig,
  // LON: londonConfig,
};

// Get city configuration by code
export function getCityConfig(cityCode: string): CityConfig | null {
  return cityConfigs[cityCode] || null;
}

// Get all supported city codes
export function getSupportedCities(): string[] {
  return Object.keys(cityConfigs);
}

// Check if a city is supported
export function isCitySupported(cityCode: string): boolean {
  return cityCode in cityConfigs;
}

// Get default city (Bangkok for now)
export function getDefaultCity(): CityConfig {
  return bangkokConfig;
}

export { bangkokConfig };
export type { CityConfig, CityCategorizer } from './types';