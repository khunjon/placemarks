import * as Location from 'expo-location';
import { Place } from '../types/database';
import { TransitStation, findNearestStation } from '../data/btsStations';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface DirectionsResult {
  distance: string;
  duration: string;
  steps: DirectionStep[];
  polyline: string;
}

export interface DirectionStep {
  instruction: string;
  distance: string;
  duration: string;
  startLocation: [number, number];
  endLocation: [number, number];
}

export interface MapMarkerData {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description?: string;
  type: 'place' | 'checkin' | 'transit' | 'user';
  data?: any;
}

export class MapsService {
  private static readonly BANGKOK_CENTER = {
    latitude: 13.7563,
    longitude: 100.5018,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  private static readonly GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  /**
   * Get user's current location
   */
  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Get user's current location quickly with fallback accuracy levels
   */
  static async getCurrentLocationFast(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Try to get a quick location first with lower accuracy
      try {
        const quickLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        return quickLocation;
      } catch (quickError) {
        console.log('Quick location failed, trying lowest accuracy:', quickError);
        
        // Fallback to lowest accuracy for fastest result
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Lowest,
        });
        return location;
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Get default Bangkok region for map initialization
   */
  static getBangkokRegion(): MapRegion {
    return this.BANGKOK_CENTER;
  }

  /**
   * Create region from coordinates with appropriate zoom level
   */
  static createRegion(
    latitude: number,
    longitude: number,
    zoomLevel: 'close' | 'medium' | 'far' = 'medium'
  ): MapRegion {
    const deltas = {
      close: { latitudeDelta: 0.01, longitudeDelta: 0.01 },
      medium: { latitudeDelta: 0.05, longitudeDelta: 0.05 },
      far: { latitudeDelta: 0.1, longitudeDelta: 0.1 },
    };

    return {
      latitude,
      longitude,
      ...deltas[zoomLevel],
    };
  }

  /**
   * Convert places to map markers
   */
  static placesToMarkers(places: Place[]): MapMarkerData[] {
    return places.map(place => ({
      id: place.id,
      coordinate: {
        latitude: place.coordinates[1], // coordinates are [longitude, latitude]
        longitude: place.coordinates[0],
      },
      title: place.name,
      description: place.address,
      type: 'place' as const,
      data: place,
    }));
  }

  /**
   * Convert transit stations to map markers
   */
  static transitStationsToMarkers(stations: TransitStation[]): MapMarkerData[] {
    return stations.map(station => ({
      id: station.id,
      coordinate: {
        latitude: station.coordinates[1],
        longitude: station.coordinates[0],
      },
      title: station.nameEn,
      description: `${station.type} ${station.line} Line`,
      type: 'transit' as const,
      data: station,
    }));
  }

  /**
   * Get directions between two points using Google Directions API
   */
  static async getDirections(
    origin: [number, number],
    destination: [number, number],
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<DirectionsResult | null> {
    if (!this.GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key not configured');
      return null;
    }

    try {
      const originStr = `${origin[1]},${origin[0]}`;
      const destinationStr = `${destination[1]},${destination[0]}`;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${originStr}&` +
        `destination=${destinationStr}&` +
        `mode=${mode}&` +
        `key=${this.GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.routes.length) {
        throw new Error(`Directions API error: ${data.status}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text,
          startLocation: [step.start_location.lng, step.start_location.lat],
          endLocation: [step.end_location.lng, step.end_location.lat],
        })),
        polyline: route.overview_polyline.points,
      };
    } catch (error) {
      console.error('Error getting directions:', error);
      return null;
    }
  }

  /**
   * Get transit directions with BTS/MRT integration
   */
  static async getTransitDirections(
    origin: [number, number],
    destination: [number, number]
  ): Promise<DirectionsResult | null> {
    // First try Google Transit API
    const googleDirections = await this.getDirections(origin, destination, 'transit');
    
    if (googleDirections) {
      return googleDirections;
    }

    // Fallback: Find nearest BTS/MRT stations and provide basic routing
    const originStation = findNearestStation(origin[1], origin[0]);
    const destStation = findNearestStation(destination[1], destination[0]);

    if (originStation && destStation) {
      // This is a simplified version - in a real app you'd implement
      // proper BTS/MRT route calculation
      return {
        distance: 'Calculating...',
        duration: 'Calculating...',
        steps: [
          {
            instruction: `Walk to ${originStation.nameEn} ${originStation.type} Station`,
            distance: '5 min walk',
            duration: '5 min',
            startLocation: origin,
            endLocation: originStation.coordinates,
          },
          {
            instruction: `Take ${originStation.type} ${originStation.line} Line`,
            distance: 'Multiple stops',
            duration: '15-30 min',
            startLocation: originStation.coordinates,
            endLocation: destStation.coordinates,
          },
          {
            instruction: `Walk from ${destStation.nameEn} Station to destination`,
            distance: '5 min walk',
            duration: '5 min',
            startLocation: destStation.coordinates,
            endLocation: destination,
          },
        ],
        polyline: '',
      };
    }

    return null;
  }

  /**
   * Calculate distance between two coordinates
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Get places within a certain radius of a point
   */
  static getPlacesInRadius(
    places: Place[],
    centerLat: number,
    centerLon: number,
    radiusMeters: number
  ): Place[] {
    return places.filter(place => {
      const distance = this.calculateDistance(
        centerLat,
        centerLon,
        place.coordinates[1], // coordinates are [longitude, latitude]
        place.coordinates[0]
      );
      return distance <= radiusMeters;
    });
  }

  /**
   * Open external maps app with directions
   */
  static async openExternalMaps(
    destination: [number, number],
    destinationName?: string,
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<void> {
    const lat = destination[1];
    const lng = destination[0];
    const label = destinationName ? encodeURIComponent(destinationName) : 'Destination';

    // iOS Maps
    const iosUrl = `maps:0,0?q=${lat},${lng}(${label})&dirflg=${mode === 'driving' ? 'd' : mode === 'walking' ? 'w' : 'r'}`;
    
    // Google Maps
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${mode}`;

    try {
      const Linking = await import('expo-linking');
      const canOpenIOS = await Linking.canOpenURL(iosUrl);
      
      if (canOpenIOS) {
        await Linking.openURL(iosUrl);
      } else {
        await Linking.openURL(googleUrl);
      }
    } catch (error) {
      console.error('Error opening external maps:', error);
    }
  }

  /**
   * Get map style for Bangkok (optimized for local context)
   */
  static getBangkokMapStyle() {
    return [
      {
        featureType: 'poi.business',
        stylers: [{ visibility: 'simplified' }],
      },
      {
        featureType: 'transit.station',
        stylers: [{ visibility: 'on' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'labels',
        stylers: [{ visibility: 'simplified' }],
      },
    ];
  }
} 