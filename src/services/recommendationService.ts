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
  private readonly DEFAULT_RADIUS_KM = 20;
  private readonly DEFAULT_LIMIT = 10;
  private readonly MINIMUM_PLACES_FOR_RECOMMENDATIONS = 5;

  constructor() {
    this.placeAvailabilityService = new PlaceAvailabilityService();
  }

  /**
   * Get user's recommendation preferences from database
   * @param userId - User ID
   * @returns Promise<{search_radius_km: number, price_ranges: number[]}> - User preferences
   */
  private async getUserPreferences(userId: string): Promise<{search_radius_km: number, price_ranges: number[]}> {
    try {
      const { data, error } = await supabase.rpc('get_user_recommendation_preferences', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user preferences:', error);
        return { search_radius_km: this.DEFAULT_RADIUS_KM, price_ranges: [1, 2, 3, 4] };
      }

      if (!data || data.length === 0) {
        return { search_radius_km: this.DEFAULT_RADIUS_KM, price_ranges: [1, 2, 3, 4] };
      }

      return data[0];
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return { search_radius_km: this.DEFAULT_RADIUS_KM, price_ranges: [1, 2, 3, 4] };
    }
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
      userPreference = 'eat',
      includeClosedPlaces = false,
      savedPlacesOnly = true // Default to showing only saved places
    } = request;

    try {
      // Validate coordinates
      this.validateCoordinates(latitude, longitude);

      // Get user's radius preference from database
      const userPreferences = await this.getUserPreferences(userId);
      const radiusKm = userPreferences.search_radius_km;
      
      console.log(`[Recommendations] Using radius: ${radiusKm}km for user ${userId}`);

      // Check if there are enough places in the area for recommendations
      const availabilityResult = await this.placeAvailabilityService.checkPlaceAvailability(
        latitude,
        longitude,
        {
          radiusMeters: radiusKm * 1000,
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
          radiusKm: radiusKm,
          excludedDislikedCount: 0
        };
      }

      // Get user's disliked places to exclude from recommendations
      const userDislikedPlaces = await this.getUserDislikedPlaces(userId);
      
      // Only exclude disliked places (not checked-in places)
      const excludedPlaces = [...userDislikedPlaces];
      
      console.log(`[Recommendations] Excluding ${excludedPlaces.length} disliked places`);

      // Get user's saved places from lists for boosting
      const userSavedPlaces = await listsService.getAllPlacesFromUserLists(userId);
      
      // If no saved places and we're in saved-only mode, return early
      if (savedPlacesOnly && userSavedPlaces.length === 0) {
        return {
          places: [],
          hasMorePlaces: false,
          totalAvailable: 0,
          generatedAt: new Date(),
          radiusKm: radiusKm,
          excludedDislikedCount: 0
        };
      }

      // Get places from google_places_cache within radius
      let candidatePlaces;
      
      if (savedPlacesOnly) {
        // Only get places that are in user's saved lists
        candidatePlaces = await this.getSavedPlacesWithinRadius(
          latitude,
          longitude,
          radiusKm,
          userSavedPlaces,
          excludedPlaces
        );
      } else {
        // Get all places as before
        candidatePlaces = await this.getCachedPlacesWithinRadius(
          latitude,
          longitude,
          radiusKm,
          excludedPlaces,
          limit * 3 // Get more candidates for better filtering with preferences
        );
      }

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

      // Create recommendation request entry in database
      const requestId = await this.createRecommendationRequest(userId, {
        latitude,
        longitude,
        userPreference,
        timeContext
      });

      // Log each recommendation instance
      if (requestId && topPlaces.length > 0) {
        await this.logRecommendationInstances(requestId, topPlaces);
      }

      return {
        places: topPlaces,
        hasMorePlaces: scoredPlaces.length > limit,
        totalAvailable: availabilityResult.placeCount,
        generatedAt: new Date(),
        radiusKm: this.DEFAULT_RADIUS_KM,
        excludedDislikedCount: excludedPlaces.length,
        requestId: requestId || undefined // Include request ID for feedback tracking
      };

    } catch (error) {
      console.error('Error getting recommendations:', error);
      
      // Return empty result on error
      return {
        places: [],
        hasMorePlaces: false,
        generatedAt: new Date(),
        radiusKm: this.DEFAULT_RADIUS_KM,
        excludedDislikedCount: 0
      };
    }
  }

  /**
   * Get only saved places from Google Places cache within radius
   * @param latitude - Center latitude
   * @param longitude - Center longitude
   * @param radiusKm - Radius in kilometers
   * @param savedPlaceIds - Google Place IDs from user's lists
   * @param excludePlaceIds - Google Place IDs to exclude (disliked places)
   * @returns Promise<any[]> - Array of cached place data
   */
  private async getSavedPlacesWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number,
    savedPlaceIds: string[],
    excludePlaceIds: string[]
  ): Promise<any[]> {
    try {
      // If no saved places, return empty
      if (savedPlaceIds.length === 0) {
        return [];
      }
      
      // Filter to only include saved places that aren't disliked
      const placeIdsToQuery = savedPlaceIds.filter(id => !excludePlaceIds.includes(id));
      
      if (placeIdsToQuery.length === 0) {
        return [];
      }
      
      
      // Query to get saved places and calculate distance
      const { data: savedPlaces, error } = await supabase
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
        .in('google_place_id', placeIdsToQuery);
      
      if (error) {
        console.error('[Recommendations] Error fetching saved places:', error);
        return [];
      }
      
      if (!savedPlaces || savedPlaces.length === 0) {
        return [];
      }
      
      
      // Log which places were found
      const foundIds = savedPlaces.map(p => p.google_place_id);
      const missingIds = placeIdsToQuery.filter(id => !foundIds.includes(id));
      
      
      // Filter out places with missing essential data
      const validPlaces = savedPlaces.filter(place => {
        if (!place.name || place.name.includes('Placeholder')) {
          return false;
        }
        if (!place.google_place_id) {
          return false;
        }
        return true;
      });
      
      
      // Add distance calculation to each place
      const placesWithDistance = validPlaces.map(place => {
        const location = place.geometry?.location || {};
        const placeLat = location.lat;
        const placeLng = location.lng;
        
        let distanceKm = 999; // Default far distance if coordinates missing
        
        if (placeLat && placeLng) {
          distanceKm = this.calculateDistance(latitude, longitude, placeLat, placeLng);
        } else {
          console.warn(`[Recommendations] Place ${place.name} has no coordinates, assigning max distance`);
        }
        
        return {
          ...place,
          distance_km: distanceKm
        };
      });
      
      // Filter by radius - only include places within the specified radius
      const placesWithinRadius = placesWithDistance.filter(place => 
        place.distance_km <= radiusKm
      );
      
      // Sort by distance
      placesWithinRadius.sort((a, b) => a.distance_km - b.distance_km);
      
      // Log distance distribution
      const within5km = placesWithinRadius.filter(p => p.distance_km <= 5).length;
      const within10km = placesWithinRadius.filter(p => p.distance_km <= 10).length;
      const within15km = placesWithinRadius.filter(p => p.distance_km <= 15).length;
      const within20km = placesWithinRadius.filter(p => p.distance_km <= 20).length;
      
      console.log(`[Recommendations] Distance distribution: ${within5km} within 5km, ${within10km} within 10km, ${within15km} within 15km, ${within20km} within 20km`);
      console.log(`[Recommendations] Filtered ${placesWithDistance.length} saved places to ${placesWithinRadius.length} within ${radiusKm}km`);
      
      // Return only saved places within radius
      return placesWithinRadius;
      
    } catch (error) {
      console.error('Error in getSavedPlacesWithinRadius:', error);
      return [];
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

      // Exclude user's disliked places
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
        console.error('[Recommendations] Spatial query error:', error);
        
        // Fallback: get places without spatial filtering
        const { data: fallbackData, error: fallbackError } = await query.limit(limit);
        
        if (fallbackError) {
          console.error('[Recommendations] Fallback query also failed:', fallbackError);
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
   * Get user's disliked Google Place IDs to exclude from recommendations
   * @param userId - User ID
   * @returns Promise<string[]> - Array of Google Place IDs
   */
  private async getUserDislikedPlaces(userId: string): Promise<string[]> {
    try {
      // Use the optimized database function
      const { data, error } = await supabase.rpc('get_user_disliked_places', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user disliked places:', error);
        return [];
      }

      // Extract Google Place IDs
      const placeIds = data?.map((item: any) => item.google_place_id).filter(Boolean) || [];
      
      if (placeIds.length > 0) {
        console.log(`[Recommendations] Found ${placeIds.length} disliked places to exclude`);
      }

      return placeIds;

    } catch (error) {
      console.error('Error in getUserDislikedPlaces:', error);
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
    userPreference: UserPreference = 'eat',
    includeClosedPlaces: boolean = false,
    userSavedPlaces: string[] = []
  ): ScoredPlace[] {
    // For saved-places-only mode, we don't filter by type since users saved these places explicitly
    const isSavedPlacesOnly = places.every(place => userSavedPlaces.includes(place.google_place_id));
    

    const scoredPlaces: ScoredPlace[] = places
    // Skip type filtering entirely for saved places
    .filter(place => {
      // If this is saved-places-only mode, don't filter anything
      if (isSavedPlacesOnly) {
        return true;
      }
      
      // Otherwise apply normal filtering for mixed mode
      const types = place.types || [];
      const placeName = place.name?.toLowerCase() || '';
      const isInUserLists = userSavedPlaces.includes(place.google_place_id);
      
      // Skip ALL filtering for saved places
      if (isInUserLists) {
        return true;
      }
      
      // Define allowed place types for non-saved places (food & drink only)
      const allowedTypes = [
        'restaurant', 'cafe', 'bar', 'bakery', 'coffee_shop',
        'meal_takeaway', 'meal_delivery', 'food', 'brewery',
        'wine_bar', 'night_club', 'bistro', 'pub', 'fast_food'
      ];
      
      // List of shopping mall types to exclude
      const mallTypes = [
        'shopping_mall', 'shopping_center', 'department_store', 
        'shopping_plaza', 'mall', 'outlet_mall', 'outlet_store'
      ];
      
      // Known shopping mall names to exclude (case insensitive)
      const knownMallNames = [
        'mbk center', 'mbk', 'centralworld', 'central world', 'siam paragon',
        'siam center', 'siam discovery', 'emporium', 'emquartier', 'terminal 21',
        'iconsiam', 'icon siam', 'the mall', 'fashion island', 'mega bangna',
        'seacon square', 'future park', 'central plaza', 'the emdistrict',
        'samyan mitrtown', 'the commons', 'gateway', 'union mall'
      ];
      
      // Exclude if it has any mall-related type
      if (types.some((type: string) => mallTypes.includes(type.toLowerCase()))) {
        return false;
      }
      
      // Exclude if the name matches known malls
      if (knownMallNames.some(mallName => placeName.includes(mallName))) {
        return false;
      }
      
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
        score += 50; // Major boost for saved places
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
        formatted_phone_number: place.formatted_phone_number,
        isInUserLists
      };
    })
    // Filter out closed places if not including them (but keep places opening soon and saved places)
    .filter(place => {
      if (includeClosedPlaces) return true;
      if (place.isOpen === true) return true;
      if (place.isOpen === false && place.openingTime?.includes('Opens in')) return true; // Keep places opening soon
      
      // Always keep saved places regardless of open status
      if (place.isInUserLists) {
        if (place.isOpen === false) {
        }
        return true;
      }
      
      if (place.isOpen === false) {
      }
      
      return place.isOpen !== false;
    })
    // Apply preference filtering (but be lenient for saved places)
    .filter(place => {
      // Always include saved places regardless of preference
      if (place.isInUserLists) {
        return true;
      }
      
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
        // Be more inclusive for coffee places
        const coffeeTypes = ['cafe', 'coffee_shop', 'bakery', 'breakfast_restaurant'];
        const hasCoffeeType = types.some((type: string) => coffeeTypes.includes(type));
        
        // Also include places that might serve coffee based on name
        const placeName = place.name?.toLowerCase() || '';
        const coffeeKeywords = ['coffee', 'cafe', 'café', 'espresso', 'latte', 'cappuccino', 'barista'];
        const hasCoffeeInName = coffeeKeywords.some(keyword => placeName.includes(keyword));
        
        if (hasCoffeeType || hasCoffeeInName) {
          return true;
        }
        
        return false;
      }
      
      if (userPreference === 'work') {
        // For work preference, show coffee shops which are typically work-friendly
        const workFriendlyTypes = ['cafe', 'coffee_shop', 'bakery'];
        const hasWorkFriendlyType = types.some((type: string) => workFriendlyTypes.includes(type));
        
        // Also include places that might be work-friendly based on name
        const placeName = place.name?.toLowerCase() || '';
        const workKeywords = ['coffee', 'cafe', 'café', 'espresso', 'latte', 'cappuccino', 'barista', 'co-working', 'coworking'];
        const hasWorkKeywordInName = workKeywords.some(keyword => placeName.includes(keyword));
        
        if (hasWorkFriendlyType || hasWorkKeywordInName) {
          return true;
        }
        
        return false;
      }
      
      return true;
    });

    // Sort places with saved places always first, then by recommendation score
    const sortedPlaces = scoredPlaces.sort((a, b) => {
      // Use the isInUserLists property we already set
      const aIsSaved = a.isInUserLists || false;
      const bIsSaved = b.isInUserLists || false;
      
      // If one is saved and the other isn't, saved place comes first
      if (aIsSaved && !bIsSaved) return -1;
      if (!aIsSaved && bIsSaved) return 1;
      
      // Otherwise sort by recommendation score
      return b.recommendation_score - a.recommendation_score;
    });
    
    // Log the top few places to verify sorting
    console.log('[Recommendations] Top 3 places after sorting:');
    sortedPlaces.slice(0, 3).forEach((place, index) => {
      console.log(`  ${index + 1}. ${place.name} (saved: ${place.isInUserLists}, score: ${place.recommendation_score})`);
    });
    
    // Skip deduplication for saved-places-only mode
    if (isSavedPlacesOnly) {
      const savedPlacesInResults = sortedPlaces.filter(p => p.isInUserLists).length;
      console.log(`[Recommendations] ${savedPlacesInResults} saved places in final results`);
      return sortedPlaces;
    }
    
    // For mixed mode, apply deduplication
    const deduplicatedPlaces: ScoredPlace[] = [];
    const seenPlaces = new Map<string, ScoredPlace>(); // Map of normalized name to best place
    
    for (const place of sortedPlaces) {
      // More aggressive normalization for deduplication
      const normalizedName = this.normalizePlaceName(place.name);
      
      // Check if this place is in user's saved lists
      const isInUserLists = userSavedPlaces.includes(place.google_place_id);
      
      // If we've seen a similar name
      const existingPlace = seenPlaces.get(normalizedName);
      
      if (existingPlace) {
        // If this place is saved and the existing one isn't, replace it
        if (isInUserLists && !existingPlace.isInUserLists) {
          seenPlaces.set(normalizedName, place);
        }
        // If both are saved or both aren't, keep the one with better score
        else if (isInUserLists === existingPlace.isInUserLists && place.recommendation_score > existingPlace.recommendation_score) {
          seenPlaces.set(normalizedName, place);
        }
        // Otherwise keep the existing one
      } else {
        // First time seeing this normalized name
        seenPlaces.set(normalizedName, place);
      }
    }
    
    // Convert map values back to array
    deduplicatedPlaces.push(...seenPlaces.values());
    
    
    // Log how many saved places made it through
    const savedPlacesInResults = deduplicatedPlaces.filter(p => p.isInUserLists).length;
    console.log(`[Recommendations] ${savedPlacesInResults} saved places in final results`);
    
    return deduplicatedPlaces;
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
      // Boost coffee places specifically
      const primaryCoffeeTypes = ['cafe', 'coffee_shop'];
      
      if (types.some((type: string) => primaryCoffeeTypes.includes(type))) {
        adjustedScore += 20; // Major boost for coffee places
      } else if (types.includes('bakery')) {
        adjustedScore += 5; // Small boost for bakeries (often serve coffee)
      }
    } else if (userPreference === 'work') {
      // Boost work-friendly places (coffee shops)
      const workFriendlyTypes = ['cafe', 'coffee_shop'];
      
      if (types.some((type: string) => workFriendlyTypes.includes(type))) {
        adjustedScore += 20; // Major boost for work-friendly coffee places
      } else if (types.includes('bakery')) {
        adjustedScore += 10; // Medium boost for bakeries (often have seating and wifi)
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
   * Normalize a place name for deduplication
   * Handles various patterns in restaurant names
   * @param name - The place name to normalize
   * @returns string - Normalized name
   */
  private normalizePlaceName(name: string): string {
    let normalized = name
      // Remove location indicators and everything after them
      .replace(/\s*[@]\s*.+$/gi, '') // @ location
      .replace(/\s*(at|near|in)\s+.+$/gi, '') // at/near/in location
      .replace(/\s*[-–—]\s*.+$/g, '') // Dash and everything after
      .replace(/\s*\(.+\)$/g, '') // Parenthetical content
      
      // Remove branch indicators
      .replace(/\s*(สาขา|Branch|บรานช์|outlet|store).+$/gi, '')
      
      // Remove common suffixes
      .replace(/\s+(Restaurant|Cafe|Coffee|Shop|Bar|Bistro|Kitchen|Eatery|Place|House|เรสเตอรองท์|ร้านอาหาร|คาเฟ่|ร้าน)$/gi, '')
      
      // Remove location names that might be appended directly (without separators)
      .replace(/\s*(centralworld|central world|paragon|emporium|emquartier|terminal 21|siam|silom|sukhumvit|thonglor|ekkamai|asoke|bangkok|bkk)$/gi, '')
      
      // Remove numbers at the end
      .replace(/\s*\d+$/g, '')
      
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    
    // Special handling for Thai names - remove tones and normalize
    // This is a simple approach; a more sophisticated one would use proper transliteration
    normalized = normalized
      .replace(/[่้๊๋์]/g, '') // Remove Thai tone marks
      .replace(/\s+/g, ' ')
      .trim();
    
    return normalized;
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

  /**
   * Create a recommendation request entry in the database
   * @param userId - User ID
   * @param context - Request context
   * @returns Promise<string | null> - Request ID or null if failed
   */
  private async createRecommendationRequest(
    userId: string,
    context: {
      latitude: number;
      longitude: number;
      userPreference: UserPreference;
      timeContext?: TimeContext;
    }
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('recommendation_requests')
        .insert({
          user_id: userId,
          context: {
            location: {
              latitude: context.latitude,
              longitude: context.longitude
            },
            timestamp: new Date().toISOString()
          },
          preferences: {
            userPreference: context.userPreference,
            timeOfDay: context.timeContext?.timeOfDay,
            isWeekend: context.timeContext?.isWeekend
          }
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating recommendation request:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error in createRecommendationRequest:', error);
      return null;
    }
  }

  /**
   * Log recommendation instances to the database
   * @param requestId - Recommendation request ID
   * @param places - Array of scored places
   */
  private async logRecommendationInstances(
    requestId: string,
    places: ScoredPlace[]
  ): Promise<void> {
    try {
      const instances = places.map((place, index) => ({
        request_id: requestId,
        google_place_id: place.google_place_id,
        position: index + 1,
        score: place.recommendation_score
      }));

      const { error } = await supabase
        .from('recommendation_instances')
        .insert(instances);

      if (error) {
        console.error('Error logging recommendation instances:', error);
      }
    } catch (error) {
      console.error('Error in logRecommendationInstances:', error);
    }
  }

  /**
   * Record user feedback on a recommendation
   * @param instanceId - Recommendation instance ID
   * @param userId - User ID
   * @param action - Feedback action (liked, disliked, viewed)
   * @returns Promise<boolean> - Success status
   */
  async recordRecommendationFeedback(
    instanceId: string,
    userId: string,
    action: 'liked' | 'disliked' | 'viewed'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recommendation_feedback')
        .insert({
          instance_id: instanceId,
          user_id: userId,
          action
        });

      if (error) {
        // Check if it's a unique constraint violation (duplicate feedback)
        if (error.code === '23505') {
          console.log('Feedback already recorded for this instance');
          return true; // Consider it successful since feedback exists
        }
        console.error('Error recording recommendation feedback:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in recordRecommendationFeedback:', error);
      return false;
    }
  }

  /**
   * Get recommendation instance by place ID and request ID
   * @param requestId - Recommendation request ID
   * @param googlePlaceId - Google Place ID
   * @returns Promise<string | null> - Instance ID or null if not found
   */
  async getRecommendationInstance(
    requestId: string,
    googlePlaceId: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('recommendation_instances')
        .select('id')
        .eq('request_id', requestId)
        .eq('google_place_id', googlePlaceId)
        .single();

      if (error) {
        console.error('Error getting recommendation instance:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error in getRecommendationInstance:', error);
      return null;
    }
  }

  /**
   * Clear user's recommendation feedback
   * @param userId - User ID
   * @param feedbackType - Type of feedback to clear: 'all', 'liked', or 'disliked'
   * @returns Promise<number> - Number of feedback entries cleared
   */
  async clearUserFeedback(
    userId: string,
    feedbackType: 'all' | 'liked' | 'disliked' = 'all'
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('clear_user_recommendation_feedback', {
        user_uuid: userId,
        feedback_type: feedbackType
      });

      if (error) {
        console.error('Error clearing user feedback:', error);
        return 0;
      }

      console.log(`[Recommendations] Cleared ${data || 0} ${feedbackType} feedback entries for user`);
      return data || 0;

    } catch (error) {
      console.error('Error in clearUserFeedback:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const recommendationService = new RecommendationService(); 