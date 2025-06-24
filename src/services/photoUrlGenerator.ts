/**
 * Photo URL Generator Service
 * 
 * Generates Google Places photo URLs from photo references using the client's API key.
 * This approach eliminates API key conflicts between admin and mobile environments.
 */

interface PhotoReference {
  photo_reference: string;
  width: number;
  height: number;
  html_attributions?: string[];
}

interface PhotoUrlOptions {
  maxWidth?: number;
  maxHeight?: number;
}

export class PhotoUrlGenerator {
  private static apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

  /**
   * Generate a single photo URL from a photo reference
   */
  static generateUrl(
    photoReference: string, 
    options: PhotoUrlOptions = {}
  ): string {
    if (!this.apiKey) {
      console.warn('Google Places API key not configured');
      return '';
    }

    const { maxWidth = 800, maxHeight } = options;
    
    let url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
    
    if (maxHeight) {
      url = url.replace(`maxwidth=${maxWidth}`, `maxwidth=${maxWidth}&maxheight=${maxHeight}`);
    }
    
    return url;
  }

  /**
   * Generate multiple photo URLs from photo reference objects
   */
  static generateUrls(
    photoReferences: PhotoReference[], 
    options: PhotoUrlOptions = {}
  ): string[] {
    if (!photoReferences || photoReferences.length === 0) {
      return [];
    }

    return photoReferences.map(ref => this.generateUrl(ref.photo_reference, options));
  }

  /**
   * Generate responsive photo URLs for different screen sizes
   */
  static generateResponsiveUrls(
    photoReference: string
  ): { small: string; medium: string; large: string } {
    return {
      small: this.generateUrl(photoReference, { maxWidth: 400 }),
      medium: this.generateUrl(photoReference, { maxWidth: 800 }),
      large: this.generateUrl(photoReference, { maxWidth: 1600 })
    };
  }

  /**
   * Generate photo URL optimized for specific use cases
   */
  static generateOptimizedUrl(
    photoReference: string,
    useCase: 'thumbnail' | 'card' | 'detail' | 'fullscreen'
  ): string {
    const sizeMap = {
      thumbnail: { maxWidth: 200 },
      card: { maxWidth: 400 },
      detail: { maxWidth: 800 },
      fullscreen: { maxWidth: 1600 }
    };

    return this.generateUrl(photoReference, sizeMap[useCase]);
  }

  /**
   * Check if API key is configured
   */
  static isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get the current API key (for debugging)
   */
  static getApiKey(): string {
    return this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'Not configured';
  }
}

export default PhotoUrlGenerator;