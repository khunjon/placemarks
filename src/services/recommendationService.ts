// Database-backed Recommendation Service for Placemarks
// ✅ Fully migrated to Google Place ID architecture
// Uses google_places_cache and PostGIS spatial queries for efficient recommendations
// Returns Google Place IDs directly - no UUID conversion needed

import { supabase } from './supabase';
import { PlaceAvailabilityService } from './placeAvailability';
import { listsService } from './listsService';
import { 
  DatabaseRecommendationRequest, 
  RecommendationResponse, 
  ScoredPlace,
  TimeContext,
  TimeOfDay,
  UserPreference 
} from '../types/recommendations';
import { isPlaceCurrentlyOpen, getFormattedHoursForDay, isPlaceOpeningSoon, OpeningHours } from '../utils/operatingHours';

/**
 * Determines the time context based on current date/time
 * @param date - Optional date, defaults to now
 * @returns TimeContext object with time of day and metadata
 */
export function getTimeContext(date: Date = new Date()): TimeContext {
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let timeOfDay: TimeOfDay;
  
  if (hour >= 6 && hour < 11) {
    timeOfDay = 'morning';
  } else if (hour >= 11 && hour < 15) {
    timeOfDay = 'lunch';
  } else if (hour >= 15 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'dinner';
  } else {
    timeOfDay = 'evening';
  }

  return {
    timeOfDay,
    hour,
    isWeekend,
    date,
  };
}

export class RecommendationService {
  private placeAvailabilityService: PlaceAvailabilityService;
  private readonly DEFAULT_RADIUS_KM = 15;
  private readonly DEFAULT_LIMIT = 10;
  private readonly MINIMUM_PLACES_FOR_RECOMMENDATIONS = 5;

  constructor() {
    this.placeAvailabilityService = new PlaceAvailabilityService();
  }

  /**
   * Get recommendations for a user based on location and preferences
   * @param request - Recommendation request parameters
   * @returns Promise<RecommendationResponse> - Scored places with metadata
   */
  async getRecommendations(request: DatabaseRecommendationRequest): Promise<RecommendationResponse> {
    const {
      userId,
      latitude,
      longitude,
      limit = this.DEFAULT_LIMIT,
      timeContext,
      userPreference = 'any',
      includeClosedPlaces = false
    } = request;

    try {
      // Validate coordinates
      this.validateCoordinates(latitude, longitude);

      // Check if there are enough places in the area for recommendations
      const availabilityResult = await this.placeAvailabilityService.checkPlaceAvailability(
        latitude,
        longitude,
        {
          radiusMeters: this.DEFAULT_RADIUS_KM * 1000,
          minimumPlaces: this.MINIMUM_PLACES_FOR_RECOMMENDATIONS
        }
      );

      // If not enough places, return empty result with message
      if (!availabilityResult.hasEnoughPlaces) {
        return {
          places: [],
          hasMorePlaces: false,
          totalAvailable: availabilityResult.placeCount,
          generatedAt: new Date(),
          radiusKm: this.DEFAULT_RADIUS_KM,
          excludedCheckedInCount: 0
        };
      }

      // Get user's checked-in places to exclude from recommendations
      const userCheckedInPlaces = await this.getUserCheckedInPlaces(userId);

      // Get user's saved places from lists for boosting
      const userSavedPlaces = await listsService.getAllPlacesFromUserLists(userId);

      // Get places from google_places_cache within radius, excluding checked-in places
      // This works directly with Google Place IDs - no conversion needed
      const candidatePlaces = await this.getCachedPlacesWithinRadius(
        latitude,
        longitude,
        this.DEFAULT_RADIUS_KM,
        userCheckedInPlaces,
        limit * 3 // Get more candidates for better filtering with preferences
      );

      // Score and rank the places
      const scoredPlaces = this.scoreAndRankPlaces(
        candidatePlaces,
        latitude,
        longitude,
        timeContext,
        userPreference,
        includeClosedPlaces,
        userSavedPlaces
      );

      // Take top results up to limit
      const topPlaces = scoredPlaces.slice(0, limit);

      return {
        places: topPlaces,
        hasMorePlaces: scoredPlaces.length > limit,
        totalAvailable: availabilityResult.placeCount,
        generatedAt: new Date(),
        radiusKm: this.DEFAULT_RADIUS_KM,
        excludedCheckedInCount: userCheckedInPlaces.length
      };

    } catch (error) {
      console.error('Error getting recommendations:', error);
      
      // Return empty result on error
      return {
        places: [],
        hasMorePlaces: false,
        generatedAt: new Date(),
        radiusKm: this.DEFAULT_RADIUS_KM,
        excludedCheckedInCount: 0
      };
    }
  }

  /**
   * Get places from Google Places cache within radius, excluding user's checked-in places
   * @param latitude - Center latitude
   * @param longitude - Center longitude  
   * @param radiusKm - Radius in kilometers
   * @param excludePlaceIds - Google Place IDs to exclude
   * @param limit - Maximum number of places to return
   * @returns Promise<any[]> - Array of cached place data
   */
  private async getCachedPlacesWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number,
    excludePlaceIds: string[],
    limit: number
  ): Promise<any[]> {
    try {
      // Build the spatial query
      let query = supabase
        .from('google_places_cache')
        .select(`
          google_place_id,
          name,
          formatted_address,
          rating,
          user_ratings_total,
          price_level,
          types,
          business_status,
          geometry,
          photo_urls,
          website,
          formatted_phone_number,
          opening_hours,
          current_opening_hours
        `)
        .eq('business_status', 'OPERATIONAL')
        .not('name', 'is', null)
        .not('geometry', 'is', null);

      // Exclude user's checked-in places
      if (excludePlaceIds.length > 0) {
        query = query.not('google_place_id', 'in', `(${excludePlaceIds.map(id => `"${id}"`).join(',')})`);
      }

      // Use PostGIS spatial query for radius filtering
      const { data, error } = await supabase.rpc('get_google_places_within_radius', {
        center_lat: latitude,
        center_lng: longitude,
        radius_km: radiusKm,
        limit_count: limit,
        exclude_place_ids: excludePlaceIds
      });

      if (error) {
        console.error('Error fetching cached places:', error);
        
        // Fallback: get places without spatial filtering
        const { data: fallbackData, error: fallbackError } = await query.limit(limit);
        
        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }
        
        return fallbackData || [];
      }


      return data || [];

    } catch (error) {
      console.error('Error in getCachedPlacesWithinRadius:', error);
      return [];
    }
  }

  /**
   * Get user's checked-in Google Place IDs to exclude from recommendations
   * @param userId - User ID
   * @returns Promise<string[]> - Array of Google Place IDs
   */
  private async getUserCheckedInPlaces(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('place_id')
        .eq('user_id', userId)
        .not('place_id', 'is', null);

      if (error) {
        console.error('Error fetching user check-ins:', error);
        return [];
      }

      // Extract Google Place IDs (place_id column now stores Google Place IDs directly)
      const placeIds = data
        ?.map((checkIn: any) => checkIn.place_id)
        .filter((id: string) => id) || [];

      return [...new Set(placeIds)]; // Remove duplicates

    } catch (error) {
      console.error('Error in getUserCheckedInPlaces:', error);
      return [];
    }
  }

  /**
   * Score and rank places based on multiple factors
   * @param places - Array of cached place data
   * @param userLat - User latitude
   * @param userLng - User longitude
   * @param timeContext - Optional time context for time-based scoring
   * @param userPreference - User preference for food/drink
   * @param includeClosedPlaces - Whether to include closed places
   * @param userSavedPlaces - Array of Google Place IDs saved in user's lists
   * @returns ScoredPlace[] - Array of scored places sorted by score descending
   */
  private scoreAndRankPlaces(
    places: any[],
    userLat: number,
    userLng: number,
    timeContext?: TimeContext,
    userPreference: UserPreference = 'any',
    includeClosedPlaces: boolean = false,
    userSavedPlaces: string[] = []
  ): ScoredPlace[] {
    // Define allowed place types for recommendations (food & drink only)
    const allowedTypes = [
      'restaurant', 'cafe', 'bar', 'bakery', 'coffee_shop',
      'meal_takeaway', 'meal_delivery', 'food', 'brewery',
      'wine_bar', 'night_club', 'bistro', 'pub', 'fast_food'
    ];

    const scoredPlaces: ScoredPlace[] = places
    // First filter to only food & drink places
    .filter(place => {
      const types = place.types || [];
      // Check if place has at least one allowed type
      return types.some((type: string) => allowedTypes.includes(type));
    })
    .map(place => {
      // Extract coordinates from geometry
      const location = place.geometry?.location || {};
      const placeLat = location.lat;
      const placeLng = location.lng;

      // Calculate distance
      const distanceKm = this.calculateDistance(userLat, userLng, placeLat, placeLng);

      // Check if place is currently open
      const openingHours = place.opening_hours as OpeningHours;
      const isOpen = isPlaceCurrentlyOpen(openingHours, { lat: placeLat, lng: placeLng });
      
      
      // Get opening/closing times and check if opening soon
      let closingTime: string | undefined;
      let openingTime: string | undefined;
      let isOpeningSoon = false;
      let minutesUntilOpen: number | undefined;
      
      if (isOpen && openingHours?.weekday_text) {
        // Extract closing time from today's hours
        const todayHours = getFormattedHoursForDay(openingHours);
        // Parse closing time from format like "Monday: 9:00 AM – 5:00 PM"
        const match = todayHours.match(/–\s*(\d{1,2}:\d{2}\s*[AP]M)/);
        if (match) {
          closingTime = match[1];
        }
      } else if (!isOpen) {
        // Check if opening soon
        const openingSoonResult = isPlaceOpeningSoon(openingHours, { lat: placeLat, lng: placeLng });
        if (openingSoonResult) {
          isOpeningSoon = openingSoonResult.isOpeningSoon;
          minutesUntilOpen = openingSoonResult.minutesUntilOpen;
          
          if (isOpeningSoon && minutesUntilOpen) {
            openingTime = `Opens in ${minutesUntilOpen} min`;
          } else if (openingHours?.weekday_text) {
            // Find next opening time for display
            const todayHours = getFormattedHoursForDay(openingHours);
            const match = todayHours.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*–/);
            if (match) {
              openingTime = match[1];
            }
          }
        }
      }

      // Calculate base score
      let score = this.calculateBaseScore(place, distanceKm);

      // Apply time-based scoring if time context provided
      if (timeContext) {
        score = this.applyTimeBasedScoring(score, place, timeContext);
      }

      // Apply user preference scoring
      score = this.applyUserPreferenceScoring(score, place, userPreference);

      // Apply opening hours penalty if closed, with exception for opening soon
      if (!includeClosedPlaces && isOpen === false) {
        if (isOpeningSoon) {
          // Small penalty for closed but opening soon
          score -= 10;
        } else {
          // Large penalty for closed places not opening soon
          score -= 50;
        }
      }

      // Apply boost for places in user's saved lists
      const isInUserLists = userSavedPlaces.includes(place.google_place_id);
      if (isInUserLists) {
        score += 25; // Significant boost for saved places
      }

      return {
        google_place_id: place.google_place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        rating: place.rating ? parseFloat(place.rating) : undefined,
        user_ratings_total: place.user_ratings_total,
        price_level: place.price_level,
        types: place.types,
        business_status: place.business_status,
        geometry: {
          location: {
            lat: placeLat,
            lng: placeLng
          }
        },
        opening_hours: place.opening_hours,
        current_opening_hours: place.current_opening_hours,
        isOpen,
        closingTime,
        openingTime,
        distance_km: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
        recommendation_score: Math.round(score * 100) / 100,
        photo_urls: place.photo_urls,
        website: place.website,
        formatted_phone_number: place.formatted_phone_number
      };
    })
    // Filter out closed places if not including them (but keep places opening soon)
    .filter(place => {
      if (includeClosedPlaces) return true;
      if (place.isOpen === true) return true;
      if (place.isOpen === false && place.openingTime?.includes('Opens in')) return true; // Keep places opening soon
      return place.isOpen !== false;
    })
    // Apply aggressive preference filtering
    .filter(place => {
      if (userPreference === 'any') return true;
      
      const types = place.types || [];
      
      if (userPreference === 'eat') {
        // Only include places that primarily serve food
        const foodTypes = ['restaurant', 'meal_takeaway', 'meal_delivery', 'food', 'bakery', 'bistro', 'fast_food'];
        const hasFoodType = types.some((type: string) => foodTypes.includes(type));
        // Exclude pure drink places
        const isPureDrinkPlace = types.includes('bar') || types.includes('wine_bar') || types.includes('brewery');
        return hasFoodType && !isPureDrinkPlace;
      }
      
      if (userPreference === 'drink') {
        // Only include places focused on drinks (cafes, bars, etc)
        const drinkTypes = ['cafe', 'coffee_shop', 'bar', 'night_club', 'brewery', 'wine_bar', 'pub'];
        return types.some((type: string) => drinkTypes.includes(type));
      }
      
      return true;
    });

    // Sort by recommendation score descending
    return scoredPlaces.sort((a, b) => b.recommendation_score - a.recommendation_score);
  }

  /**
   * Calculate base recommendation score based on rating, review count, and distance
   * @param place - Place data from cache
   * @param distanceKm - Distance from user in kilometers
   * @returns number - Base score (0-100)
   */
  private calculateBaseScore(place: any, distanceKm: number): number {
    let score = 50; // Base score

    // Rating factor (0-40 points)
    const rating = place.rating ? parseFloat(place.rating) : 0;
    if (rating > 0) {
      score += (rating / 5) * 40;
    }

    // Review count factor (0-20 points)
    const reviewCount = place.user_ratings_total || 0;
    if (reviewCount > 0) {
      // Logarithmic scale for review count (more reviews = higher score, but diminishing returns)
      const reviewScore = Math.min(20, Math.log10(reviewCount + 1) * 5);
      score += reviewScore;
    }

    // Distance factor (0-15 points penalty for distance)
    // Closer places get higher scores
    const maxDistanceKm = 15;
    const distancePenalty = (distanceKm / maxDistanceKm) * 15;
    score -= distancePenalty;

    // Price level bonus (slight preference for places with price info)
    if (place.price_level) {
      score += 2;
    }

    // Business status check
    if (place.business_status !== 'OPERATIONAL') {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Apply time-based scoring adjustments
   * @param baseScore - Base recommendation score
   * @param place - Place data
   * @param timeContext - Current time context
   * @returns number - Adjusted score
   */
  private applyTimeBasedScoring(baseScore: number, place: any, timeContext: TimeContext): number {
    const types = place.types || [];
    const timeOfDay = timeContext.timeOfDay;

    // Time-based category preferences
    const timePreferences: Record<TimeOfDay, { preferred: string[], bonus: number, avoided: string[], penalty: number }> = {
      morning: {
        preferred: ['cafe', 'bakery', 'breakfast_restaurant'],
        bonus: 10,
        avoided: ['bar', 'night_club'],
        penalty: 15
      },
      lunch: {
        preferred: ['restaurant', 'meal_takeaway', 'food'],
        bonus: 8,
        avoided: ['bar', 'night_club'],
        penalty: 10
      },
      afternoon: {
        preferred: ['cafe', 'shopping_mall', 'tourist_attraction'],
        bonus: 5,
        avoided: ['night_club'],
        penalty: 10
      },
      dinner: {
        preferred: ['restaurant', 'meal_delivery', 'meal_takeaway'],
        bonus: 10,
        avoided: [],
        penalty: 0
      },
      evening: {
        preferred: ['bar', 'night_club', 'restaurant'],
        bonus: 8,
        avoided: [],
        penalty: 0
      }
    };

    const preferences = timePreferences[timeOfDay];
    let adjustedScore = baseScore;

    // Apply bonus for preferred categories
    const hasPreferred = types.some((type: string) => preferences.preferred.includes(type));
    if (hasPreferred) {
      adjustedScore += preferences.bonus;
    }

    // Apply penalty for avoided categories
    const hasAvoided = types.some((type: string) => preferences.avoided.includes(type));
    if (hasAvoided) {
      adjustedScore -= preferences.penalty;
    }

    return Math.max(0, Math.min(100, adjustedScore));
  }

  /**
   * Apply user preference scoring adjustments
   * @param baseScore - Base recommendation score
   * @param place - Place data
   * @param userPreference - User's food/drink preference
   * @returns number - Adjusted score
   */
  private applyUserPreferenceScoring(baseScore: number, place: any, userPreference: UserPreference): number {
    if (userPreference === 'any') {
      return baseScore;
    }

    const types = place.types || [];
    let adjustedScore = baseScore;

    if (userPreference === 'eat') {
      // Boost restaurants and food places
      const primaryFoodTypes = ['restaurant', 'meal_takeaway', 'meal_delivery', 'bistro', 'fast_food'];
      const secondaryFoodTypes = ['food', 'bakery'];
      
      if (types.some((type: string) => primaryFoodTypes.includes(type))) {
        adjustedScore += 15; // Significant boost for primary food places
      } else if (types.some((type: string) => secondaryFoodTypes.includes(type))) {
        adjustedScore += 10; // Medium boost for secondary food places
      } else if (types.includes('cafe') || types.includes('coffee_shop')) {
        adjustedScore += 3; // Small boost for cafes (some serve food)
      }
    } else if (userPreference === 'drink') {
      // Boost cafes, bars, and drink places
      const primaryDrinkTypes = ['cafe', 'coffee_shop', 'bar', 'wine_bar', 'brewery', 'pub'];
      const secondaryDrinkTypes = ['night_club'];
      
      if (types.some((type: string) => primaryDrinkTypes.includes(type))) {
        adjustedScore += 15; // Significant boost for primary drink places
      } else if (types.some((type: string) => secondaryDrinkTypes.includes(type))) {
        adjustedScore += 10; // Medium boost for nightclubs
      } else if (types.includes('restaurant')) {
        adjustedScore += 3; // Small boost for restaurants (they serve drinks too)
      }
    }

    return Math.max(0, Math.min(100, adjustedScore));
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param lat1 - Latitude 1
   * @param lng1 - Longitude 1
   * @param lat2 - Latitude 2
   * @param lng2 - Longitude 2
   * @returns number - Distance in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param degrees - Degrees to convert
   * @returns number - Radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Validate coordinates
   * @param latitude - Latitude to validate
   * @param longitude - Longitude to validate
   */
  private validateCoordinates(latitude: number, longitude: number): void {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }

    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
  }
}

// Export singleton instance
export const recommendationService = new RecommendationService(); 