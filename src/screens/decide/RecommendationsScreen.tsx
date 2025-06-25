import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, Coffee, Utensils, Wine, ShoppingBag, Sparkles } from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';
import type { DecideStackScreenProps } from '../../navigation/types';
import { createValidatedCityContext, Location as CityLocation, CityContext } from '../../services/cityContext';
import { recommendationService, getTimeContext } from '../../services/recommendationService';
import { TimeContext, ScoredPlace, RecommendationResponse } from '../../types/recommendations';
import { useLocation } from '../../hooks/useLocation';
import { useAuth } from '../../services/auth-context';
import { locationUtils } from '../../utils/location';

type RecommendationsScreenProps = DecideStackScreenProps<'Recommendations'>;

export default function RecommendationsScreen({ navigation }: RecommendationsScreenProps) {
  // Get user from auth context
  const { user } = useAuth();
  
  // Use the location hook with optimized settings for recommendations
  const {
    location,
    loading: locationLoading,
    error: locationError,
    source,
    refreshLocation,
    forceLocationRetry,
    getCurrentLocation,
  } = useLocation({
    enableHighAccuracy: false, // Use balanced accuracy for better performance and battery life
    fallbackToBangkok: true,
    autoRequest: true, // Auto-request for this screen since user explicitly wants recommendations
    enableCaching: true,
    enableOfflineFallback: true,
    sessionMode: false, // Disable session mode for on-demand usage
    enableBackgroundUpdates: false, // Disable background updates
  });

  // Computed values for backward compatibility
  const isLocationAvailable = !!location;
  const isUsingFallback = source === 'fallback';
  
  // Use force retry when using fallback, otherwise regular refresh
  const retryLocation = isUsingFallback ? forceLocationRetry : refreshLocation;

  // State for recommendations and time context
  const [cityContext, setCityContext] = useState<CityContext | null>(null);
  const [timeContext, setTimeContext] = useState<TimeContext>(getTimeContext());
  const [databaseRecommendations, setDatabaseRecommendations] = useState<RecommendationResponse | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  // Update time context every minute
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setTimeContext(getTimeContext());
    }, 60000);

    return () => clearInterval(timeInterval);
  }, []);

  // Create city context when location changes
  useEffect(() => {
    if (location) {
      const userLoc: CityLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      
      const cityCtx = createValidatedCityContext(userLoc);
      setCityContext(cityCtx);
    }
  }, [location]);

  // Load recommendations when location, city context, or time changes
  useEffect(() => {
    if (location && cityContext && user) {
      loadRecommendations();
    }
  }, [location, cityContext, timeContext, user]);

  const loadRecommendations = async () => {
    if (!location || !cityContext || !user) return;

    try {
      setRecommendationsLoading(true);
      
      // Load database-backed recommendations
      const databaseRecs = await recommendationService.getRecommendations({
        userId: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
        limit: 6,
        timeContext
      });
      
      // Set database recommendations
      setDatabaseRecommendations(databaseRecs);
      
    } catch (error) {
      console.error('Error loading recommendations:', error);
      
      // Set empty recommendations on error to show "coming soon" message
      setDatabaseRecommendations({
        places: [],
        totalAvailable: 0,
        hasMorePlaces: false,
        generatedAt: new Date(),
        radiusKm: 15,
        excludedCheckedInCount: 0
      });
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const handleNavigateToPlace = (placeId: string) => {
    navigation.navigate('PlaceInListDetail', {
      placeId,
      listId: 'recommendations', // Virtual list ID for recommendations
      listName: 'Recommended For You',
      source: 'suggestion'
    });
  };

  // Helper functions for UI
  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      cafe: Coffee,
      restaurant: Utensils,
      bar: Wine,
      market: ShoppingBag,
      fine_dining: Utensils,
      breakfast: Coffee,
      rooftop: Wine,
      shopping: ShoppingBag,
    };
    return iconMap[category] || MapPin;
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      cafe: '☕',
      restaurant: '🍽️',
      bar: '🍷',
      market: '🛍️',
      fine_dining: '🍱',
      breakfast: '🥐',
      rooftop: '🌆',
      shopping: '🛒',
    };
    return emojiMap[category] || '📍';
  };

  const getTimeContextMessage = (timeCtx: TimeContext, cityCtx: CityContext | null) => {
    const timeMessages = {
      morning: 'Perfect for breakfast!',
      lunch: 'Great lunch spots nearby',
      afternoon: 'Ideal for coffee & exploring',
      dinner: 'Dinner recommendations',
      evening: 'Evening entertainment',
    };
    
    const baseMessage = timeMessages[timeCtx.timeOfDay];
    const locationSuffix = cityCtx?.isInBangkok ? ' in Bangkok' : ' nearby';
    
    return baseMessage + locationSuffix;
  };

  const getLocationContextMessage = () => {
    if (!location) return 'Getting your location...';
    
    if (isUsingFallback) {
      return 'Using Bangkok (trying to get real location...)';
    }
    
    return locationUtils.getLocationContextString(location);
  };

  const formatDistance = (distanceKm: number) => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away`;
    } else {
      return `${distanceKm.toFixed(1)}km away`;
    }
  };

  // Helper functions for database recommendations
  const getDatabaseRecommendationReason = (place: ScoredPlace, timeCtx: TimeContext) => {
    if (place.recommendation_score > 80) {
      return `Perfect for ${timeCtx.timeOfDay}`;
    } else if (place.distance_km < 0.5) {
      return 'Very close to you';
    } else if (place.rating && place.rating > 4.5) {
      return 'Highly rated';
    } else if (place.user_ratings_total && place.user_ratings_total > 1000) {
      return 'Popular choice';
    } else {
      return 'Recommended for you';
    }
  };

  const getDatabasePlaceCategory = (types: string[] = []) => {
    // Map Google Places types to our category system
    if (types.includes('restaurant') || types.includes('meal_takeaway') || types.includes('meal_delivery')) {
      return 'restaurant';
    } else if (types.includes('cafe') || types.includes('bakery')) {
      return 'cafe';
    } else if (types.includes('bar') || types.includes('night_club')) {
      return 'bar';
    } else if (types.includes('shopping_mall') || types.includes('store')) {
      return 'shopping';
    } else if (types.includes('tourist_attraction') || types.includes('point_of_interest')) {
      return 'attraction';
    } else {
      return 'place';
    }
  };

  const getPriceRangeText = (priceLevel?: number) => {
    if (!priceLevel) return '';
    return '$ '.repeat(priceLevel).trim();
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: DarkTheme.colors.semantic.systemBackground 
    }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: DarkTheme.spacing.lg,
        paddingVertical: DarkTheme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: DarkTheme.colors.semantic.separator,
      }}>
        <Text style={[
          DarkTheme.typography.largeTitle,
          { 
            color: DarkTheme.colors.semantic.label,
            fontWeight: 'bold' 
          }
        ]}>
          Recommendations
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: DarkTheme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Recommendations Section */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
          paddingTop: DarkTheme.spacing.md,
          paddingBottom: DarkTheme.spacing.lg,
        }}>
          {/* Context Header */}
          <View style={{
            marginBottom: DarkTheme.spacing.md,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Clock 
                size={16} 
                color={DarkTheme.colors.bangkok.gold}
                strokeWidth={2}
              />
              <Text style={[
                DarkTheme.typography.subhead,
                { 
                  color: DarkTheme.colors.semantic.label,
                  fontWeight: '600',
                  marginLeft: DarkTheme.spacing.xs,
                }
              ]}>
                {getTimeContextMessage(timeContext, cityContext)}
              </Text>
            </View>
          </View>

          {/* Recommendations Content */}
          {recommendationsLoading ? (
            <View style={{
              backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
              borderRadius: DarkTheme.borderRadius.lg,
              padding: DarkTheme.spacing.xl,
              alignItems: 'center',
            }}>
              <ActivityIndicator 
                size="large" 
                color={DarkTheme.colors.bangkok.gold} 
              />
              <Text style={[
                DarkTheme.typography.subhead,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  marginTop: DarkTheme.spacing.sm,
                }
              ]}>
                Finding perfect places for you...
              </Text>
            </View>
          ) : locationError ? (
            <View style={{
              backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
              borderRadius: DarkTheme.borderRadius.lg,
              padding: DarkTheme.spacing.lg,
              alignItems: 'center',
            }}>
              <MapPin 
                size={32} 
                color={DarkTheme.colors.semantic.tertiaryLabel}
                strokeWidth={2}
              />
              <Text style={[
                DarkTheme.typography.subhead,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  textAlign: 'center',
                  marginTop: DarkTheme.spacing.sm,
                  marginBottom: DarkTheme.spacing.sm,
                }
              ]}>
                {locationError}
              </Text>
              <TouchableOpacity 
                onPress={retryLocation}
                style={{
                  backgroundColor: DarkTheme.colors.bangkok.gold,
                  paddingHorizontal: DarkTheme.spacing.md,
                  paddingVertical: DarkTheme.spacing.sm,
                  borderRadius: DarkTheme.borderRadius.sm,
                }}
              >
                <Text style={[
                  DarkTheme.typography.subhead,
                  { 
                    color: DarkTheme.colors.system.black,
                    fontWeight: '600',
                  }
                ]}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          ) : databaseRecommendations && databaseRecommendations.places.length > 0 ? (
            <View>
              {databaseRecommendations.places.map((place, index) => {
                const category = getDatabasePlaceCategory(place.types);
                return (
                  <TouchableOpacity
                    key={place.google_place_id}
                    style={{
                      backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                      borderRadius: DarkTheme.borderRadius.lg,
                      padding: DarkTheme.spacing.md,
                      marginBottom: DarkTheme.spacing.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => handleNavigateToPlace(place.google_place_id)}
                  >
                    {/* Category Icon */}
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${DarkTheme.colors.bangkok.gold}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: DarkTheme.spacing.md,
                    }}>
                      <Text style={{ fontSize: 20 }}>
                        {getCategoryEmoji(category)}
                      </Text>
                    </View>

                    {/* Place Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        DarkTheme.typography.headline,
                        { 
                          color: DarkTheme.colors.semantic.label,
                          fontWeight: '600',
                          marginBottom: DarkTheme.spacing.xs,
                        }
                      ]}>
                        {place.name}
                      </Text>
                      
                      <Text style={[
                        DarkTheme.typography.caption1,
                        { 
                          color: DarkTheme.colors.bangkok.gold,
                          fontWeight: '500',
                          marginBottom: DarkTheme.spacing.xs,
                        }
                      ]}>
                        {getDatabaseRecommendationReason(place, timeContext)}
                      </Text>
                      
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <Text style={[
                          DarkTheme.typography.caption2,
                          { 
                            color: DarkTheme.colors.semantic.secondaryLabel,
                          }
                        ]}>
                          {formatDistance(place.distance_km)}
                        </Text>
                        
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: DarkTheme.spacing.xs,
                        }}>
                          {place.price_level && (
                            <Text style={[
                              DarkTheme.typography.caption2,
                              { 
                                color: DarkTheme.colors.semantic.secondaryLabel,
                              }
                            ]}>
                              {getPriceRangeText(place.price_level)}
                            </Text>
                          )}
                          
                          {place.rating && (
                            <Text style={[
                              DarkTheme.typography.caption2,
                              { 
                                color: DarkTheme.colors.semantic.secondaryLabel,
                              }
                            ]}>
                              ⭐ {place.rating.toFixed(1)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              
              {/* Show fallback message if not enough places */}
              {databaseRecommendations.places.length < 3 && (
                <View style={{
                  backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                  borderRadius: DarkTheme.borderRadius.lg,
                  padding: DarkTheme.spacing.md,
                  marginTop: DarkTheme.spacing.sm,
                  alignItems: 'center',
                }}>
                  <Text style={[
                    DarkTheme.typography.caption1,
                    { 
                      color: DarkTheme.colors.semantic.secondaryLabel,
                      textAlign: 'center',
                    }
                  ]}>
                    More recommendations coming soon as we expand our database!
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={{
              backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
              borderRadius: DarkTheme.borderRadius.lg,
              padding: DarkTheme.spacing.lg,
              alignItems: 'center',
            }}>
              <Sparkles 
                size={32} 
                color={DarkTheme.colors.semantic.tertiaryLabel}
                strokeWidth={2}
              />
              <Text style={[
                DarkTheme.typography.subhead,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  textAlign: 'center',
                  marginTop: DarkTheme.spacing.sm,
                  marginBottom: DarkTheme.spacing.xs,
                }
              ]}>
                Recommendations coming soon!
              </Text>
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: DarkTheme.colors.semantic.tertiaryLabel,
                  textAlign: 'center',
                }
              ]}>
                {databaseRecommendations?.totalAvailable 
                  ? `Found ${databaseRecommendations.totalAvailable} places nearby, but you've visited them all!`
                  : `We're building our database for this area`
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}