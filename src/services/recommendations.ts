// Recommendation Engine Service for Placemarks
// Provides context-aware place recommendations based on location and time

import { 
  TimeOfDay, 
  TimeContext, 
  RecommendationContext, 
  Recommendation, 
  RecommendationSet, 
  RecommendationRequest,
  TimeBasedConfig,
  RecommendationType
} from '../types/recommendations';
import { Location, getDistanceBetweenCoordinates } from './cityContext';
import { googlePlacesCache } from './googlePlacesCache';

// Time-based configuration for different periods of the day
const TIME_CONFIG: TimeBasedConfig = {
  morning: {
    categories: ['cafe', 'breakfast', 'bakery', 'coffee'],
    keywords: ['coffee', 'breakfast', 'brunch', 'pastry'],
    startHour: 6,
    endHour: 11,
  },
  lunch: {
    categories: ['restaurant', 'food_court', 'casual_dining'],
    keywords: ['lunch', 'quick', 'business', 'noodles'],
    startHour: 11,
    endHour: 15,
  },
  afternoon: {
    categories: ['cafe', 'shopping', 'attraction', 'park'],
    keywords: ['coffee', 'dessert', 'shopping', 'sightseeing'],
    startHour: 15,
    endHour: 17,
  },
  dinner: {
    categories: ['restaurant', 'fine_dining', 'bar'],
    keywords: ['dinner', 'romantic', 'fine_dining', 'cocktails'],
    startHour: 17,
    endHour: 21,
  },
  evening: {
    categories: ['bar', 'nightlife', 'rooftop', 'entertainment'],
    keywords: ['drinks', 'nightlife', 'rooftop', 'live_music'],
    startHour: 21,
    endHour: 2,
  },
};

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
  
  if (hour >= TIME_CONFIG.morning.startHour && hour < TIME_CONFIG.morning.endHour) {
    timeOfDay = 'morning';
  } else if (hour >= TIME_CONFIG.lunch.startHour && hour < TIME_CONFIG.lunch.endHour) {
    timeOfDay = 'lunch';
  } else if (hour >= TIME_CONFIG.afternoon.startHour && hour < TIME_CONFIG.afternoon.endHour) {
    timeOfDay = 'afternoon';
  } else if (hour >= TIME_CONFIG.dinner.startHour && hour < TIME_CONFIG.dinner.endHour) {
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

/**
 * Calculates time relevance score for a recommendation
 * @param recommendation - The recommendation to score
 * @param timeContext - Current time context
 * @returns Relevance score between 0 and 1
 */
function calculateTimeRelevance(recommendation: Recommendation, timeContext: TimeContext): number {
  const { bestTimes } = recommendation.timeRelevance;
  const { timeOfDay } = timeContext;
  
  if (bestTimes.includes(timeOfDay)) {
    return 1.0; // Perfect match
  }
  
  // Adjacent time periods get partial relevance
  const timeOrder: TimeOfDay[] = ['morning', 'lunch', 'afternoon', 'dinner', 'evening'];
  const currentIndex = timeOrder.indexOf(timeOfDay);
  const bestIndices = bestTimes.map(time => timeOrder.indexOf(time));
  
  const minDistance = Math.min(...bestIndices.map(index => 
    Math.abs(currentIndex - index)
  ));
  
  // Closer time periods get higher scores
  return Math.max(0, 1 - (minDistance * 0.3));
}

/**
 * Mock Bangkok curated recommendations
 */
function getBangkokMockRecommendations(context: RecommendationContext): Recommendation[] {
  const { userLocation, timeContext } = context;
  
  const mockBangkokPlaces: Omit<Recommendation, 'distanceKm' | 'timeRelevance'>[] = [
    {
      id: 'bangkok-1',
      name: 'Chatuchak Weekend Market',
      description: 'Massive weekend market with everything from food to antiques',
      location: { latitude: 13.7998, longitude: 100.5501 },
      address: '587/10 Kamphaeng Phet 2 Rd, Chatuchak',
      category: 'market',
      subcategory: 'weekend_market',
      type: 'curated',
      score: 95,
      imageUrl: 'https://example.com/chatuchak.jpg',
      tags: ['shopping', 'food', 'weekend', 'local'],
      priceRange: 2,
      rating: 4.5,
      reviewCount: 15420,
      bangkokData: {
        district: 'Chatuchak',
        localTips: ['Go early to avoid crowds', 'Bring cash', 'Wear comfortable shoes'],
        bestTransport: 'BTS to Mo Chit',
        crowdLevel: 'high',
      },
    },
    {
      id: 'bangkok-2',
      name: 'Rooftop Bar at Lebua',
      description: 'Iconic rooftop bar with stunning city views',
      location: { latitude: 13.7200, longitude: 100.5116 },
      address: '1055 Silom Rd, Bang Rak',
      category: 'bar',
      subcategory: 'rooftop',
      type: 'curated',
      score: 92,
      imageUrl: 'https://example.com/lebua.jpg',
      tags: ['rooftop', 'cocktails', 'views', 'luxury'],
      priceRange: 4,
      rating: 4.7,
      reviewCount: 8934,
      bangkokData: {
        district: 'Silom',
        localTips: ['Dress code enforced', 'Book ahead', 'Best at sunset'],
        bestTransport: 'BTS to Saphan Taksin',
        crowdLevel: 'medium',
      },
    },
    {
      id: 'bangkok-3',
      name: 'Café Tartine',
      description: 'French-style café perfect for morning coffee and pastries',
      location: { latitude: 13.7307, longitude: 100.5418 },
      address: '496/14 Ploenchit Rd, Lumpini',
      category: 'cafe',
      subcategory: 'french_cafe',
      type: 'curated',
      score: 88,
      imageUrl: 'https://example.com/tartine.jpg',
      tags: ['coffee', 'pastries', 'french', 'breakfast'],
      priceRange: 3,
      rating: 4.3,
      reviewCount: 2156,
      bangkokData: {
        district: 'Ploenchit',
        localTips: ['Try the croissants', 'Good WiFi for work', 'Gets busy after 9am'],
        bestTransport: 'BTS to Ploenchit',
        crowdLevel: 'medium',
      },
    },
    {
      id: 'bangkok-4',
      name: 'Gaggan Anand',
      description: 'Progressive Indian cuisine by renowned chef',
      location: { latitude: 13.7398, longitude: 100.5441 },
      address: '68/1 Soi Langsuan, Ploenchit Rd',
      category: 'restaurant',
      subcategory: 'fine_dining',
      type: 'curated',
      score: 98,
      imageUrl: 'https://example.com/gaggan.jpg',
      tags: ['fine_dining', 'indian', 'tasting_menu', 'celebrity_chef'],
      priceRange: 4,
      rating: 4.8,
      reviewCount: 3421,
      bangkokData: {
        district: 'Ploenchit',
        localTips: ['Book months ahead', 'Tasting menu only', 'Dress smart casual'],
        bestTransport: 'BTS to Chit Lom',
        crowdLevel: 'low',
      },
    },
  ];

  return mockBangkokPlaces.map(place => ({
    ...place,
    distanceKm: getDistanceBetweenCoordinates(userLocation, place.location),
    timeRelevance: {
      bestTimes: getBestTimesForCategory(place.category),
      currentRelevance: 0, // Will be calculated later
    },
  }));
}

/**
 * Mock standard (non-Bangkok) recommendations
 */
function getStandardMockRecommendations(context: RecommendationContext): Recommendation[] {
  const { userLocation } = context;
  
  const mockStandardPlaces: Omit<Recommendation, 'distanceKm' | 'timeRelevance'>[] = [
    {
      id: 'standard-1',
      name: 'Local Coffee Shop',
      description: 'Cozy neighborhood coffee shop with great atmosphere',
      location: { latitude: userLocation.latitude + 0.01, longitude: userLocation.longitude + 0.01 },
      address: '123 Main Street',
      category: 'cafe',
      subcategory: 'coffee_shop',
      type: 'nearby',
      score: 78,
      tags: ['coffee', 'local', 'cozy', 'wifi'],
      priceRange: 2,
      rating: 4.2,
      reviewCount: 234,
      googleData: {
        placeId: 'ChIJexample123',
        businessStatus: 'OPERATIONAL',
        openingHours: ['Mon-Fri: 7AM-6PM', 'Sat-Sun: 8AM-5PM'],
      },
    },
    {
      id: 'standard-2',
      name: 'Downtown Restaurant',
      description: 'Popular restaurant serving international cuisine',
      location: { latitude: userLocation.latitude - 0.005, longitude: userLocation.longitude + 0.008 },
      address: '456 Central Ave',
      category: 'restaurant',
      subcategory: 'international',
      type: 'popular',
      score: 82,
      tags: ['restaurant', 'international', 'popular', 'dinner'],
      priceRange: 3,
      rating: 4.4,
      reviewCount: 567,
      googleData: {
        placeId: 'ChIJexample456',
        businessStatus: 'OPERATIONAL',
        phoneNumber: '+1-555-0123',
        website: 'https://example-restaurant.com',
      },
    },
  ];

  return mockStandardPlaces.map(place => ({
    ...place,
    distanceKm: getDistanceBetweenCoordinates(userLocation, place.location),
    timeRelevance: {
      bestTimes: getBestTimesForCategory(place.category),
      currentRelevance: 0, // Will be calculated later
    },
  }));
}

/**
 * Gets best times for a category based on configuration
 */
function getBestTimesForCategory(category: string): TimeOfDay[] {
  const categoryMap: Record<string, TimeOfDay[]> = {
    cafe: ['morning', 'afternoon'],
    restaurant: ['lunch', 'dinner'],
    bar: ['evening'],
    market: ['morning', 'afternoon'],
    fine_dining: ['dinner'],
    breakfast: ['morning'],
    rooftop: ['evening'],
    shopping: ['afternoon'],
  };

  return categoryMap[category] || ['afternoon'];
}

/**
 * Main function to get recommendations based on context
 * @param request - Recommendation request with context and filters
 * @returns Promise<RecommendationSet> - Set of recommendations grouped by type
 */
export async function getRecommendations(request: RecommendationRequest): Promise<RecommendationSet> {
  const { context, filters, limit = 20 } = request;
  const { cityTier } = context;

  // Get mock data based on city tier
  let allRecommendations: Recommendation[];
  
  if (cityTier === 'bangkok') {
    allRecommendations = getBangkokMockRecommendations(context);
  } else {
    allRecommendations = getStandardMockRecommendations(context);
  }

  // Calculate time relevance for all recommendations
  allRecommendations = allRecommendations.map(rec => ({
    ...rec,
    timeRelevance: {
      ...rec.timeRelevance,
      currentRelevance: calculateTimeRelevance(rec, context.timeContext),
    },
  }));

  // Apply filters if provided
  if (filters) {
    allRecommendations = applyFilters(allRecommendations, filters);
  }

  // Sort by relevance score and time relevance
  allRecommendations.sort((a, b) => {
    const scoreA = a.score + (a.timeRelevance.currentRelevance * 20);
    const scoreB = b.score + (b.timeRelevance.currentRelevance * 20);
    return scoreB - scoreA;
  });

  // Limit results
  const limitedRecommendations = allRecommendations.slice(0, limit);

  // Group by type for easy display
  const sections = {
    curated: limitedRecommendations.filter(r => r.type === 'curated'),
    popular: limitedRecommendations.filter(r => r.type === 'popular'),
    nearby: limitedRecommendations.filter(r => r.type === 'nearby'),
    trending: limitedRecommendations.filter(r => r.type === 'trending'),
    personal: limitedRecommendations.filter(r => r.type === 'personal'),
  };

  return {
    context,
    recommendations: limitedRecommendations,
    generatedAt: new Date(),
    totalCount: limitedRecommendations.length,
    sections,
  };
}

/**
 * Applies filters to recommendations
 */
function applyFilters(recommendations: Recommendation[], filters: any): Recommendation[] {
  let filtered = [...recommendations];

  if (filters.categories?.length) {
    filtered = filtered.filter(r => filters.categories.includes(r.category));
  }

  if (filters.maxDistance) {
    filtered = filtered.filter(r => r.distanceKm <= filters.maxDistance);
  }

  if (filters.timeRelevant) {
    filtered = filtered.filter(r => r.timeRelevance.currentRelevance > 0.5);
  }

  if (filters.minRating) {
    filtered = filtered.filter(r => (r.rating || 0) >= filters.minRating);
  }

  if (filters.priceRange) {
    filtered = filtered.filter(r => {
      if (!r.priceRange) return true;
      return r.priceRange >= filters.priceRange.min && r.priceRange <= filters.priceRange.max;
    });
  }

  return filtered;
}

/**
 * Convenience function to get recommendations for current time and location
 * @param userLocation - User's current location
 * @param cityTier - Bangkok or standard tier
 * @param userId - Optional user ID for personalization
 * @returns Promise<RecommendationSet>
 */
export async function getCurrentRecommendations(
  userLocation: Location,
  cityTier: 'bangkok' | 'standard',
  userId?: string
): Promise<RecommendationSet> {
  const timeContext = getTimeContext();
  const context: RecommendationContext = {
    userLocation,
    timeContext,
    cityTier,
    userId,
  };

  return getRecommendations({ context });
} 