import Constants from 'expo-constants';

/**
 * Environment configuration service that handles both development and production
 * environment variables with proper fallbacks
 */
class EnvironmentConfig {
  /**
   * Gets configuration value with fallback chain:
   * 1. expo-constants extra (production builds)
   * 2. process.env (development/Expo Go)
   * 3. default value or undefined
   */
  private getConfigValue(key: string, defaultValue?: string): string | undefined {
    // Try expo-constants extra first (works in production)
    const extra = Constants.expoConfig?.extra;
    if (extra && key in extra) {
      return extra[key] || defaultValue;
    }
    
    // Fallback to process.env (works in development)
    const envKey = `EXPO_PUBLIC_${key.toUpperCase().replace(/([A-Z])/g, '_$1').slice(1)}`;
    return process.env[envKey] || defaultValue;
  }

  get googlePlacesApiKey(): string {
    const key = this.getConfigValue('googlePlacesApiKey');
    if (!key && __DEV__) {
      console.warn('[Config] Google Places API key not found');
    }
    return key || '';
  }

  get supabaseUrl(): string {
    const url = this.getConfigValue('supabaseUrl');
    if (!url) {
      throw new Error('[Config] Supabase URL not found - app cannot function');
    }
    return url;
  }

  get supabaseAnonKey(): string {
    const key = this.getConfigValue('supabaseAnonKey');
    if (!key) {
      throw new Error('[Config] Supabase anon key not found - app cannot function');
    }
    return key;
  }

  get amplitudeApiKey(): string | undefined {
    return this.getConfigValue('amplitudeApiKey');
  }

  get googlePlacesCacheDays(): number {
    const days = this.getConfigValue('googlePlacesCacheDays', '90');
    return parseInt(days || '90', 10);
  }

  /**
   * Debug helper - logs current configuration state
   */
  debugConfig(): void {
    if (__DEV__) {
      console.log('[Config] Environment Debug:', {
        source: Constants.expoConfig?.extra ? 'expo-constants' : 'process.env',
        googleApiKeyLength: this.googlePlacesApiKey.length,
        supabaseUrlPresent: !!this.supabaseUrl,
        amplitudePresent: !!this.amplitudeApiKey,
      });
    }
  }
}

export const config = new EnvironmentConfig();