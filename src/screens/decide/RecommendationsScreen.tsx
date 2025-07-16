// ✅ Updated for Google Place ID architecture
// Uses recommendationService and navigates directly to PlaceDetails with Google Place IDs
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, Coffee, Utensils, Wine, ShoppingBag, Sparkles, ThumbsUp, ThumbsDown } from '../../components/icons';
import { DarkTheme } from '../../constants/theme';
import type { DecideStackScreenProps } from '../../navigation/types';
import { createValidatedCityContext, CityContext } from '../../services/cityContext';
import { Location as CityLocation } from '../../types/navigation';
import { recommendationService, getTimeContext } from '../../services/recommendationService';
import { TimeContext, ScoredPlace, RecommendationResponse, UserPreference } from '../../types/recommendations';
import { useLocation } from '../../hooks/useLocation';
import { useAuth } from '../../services/auth-context';
import { locationUtils } from '../../utils/location';
import { PlaceNavigationHelper } from '../../components/places';
import analyticsService from '../../services/analytics';
import { AnalyticsEventName } from '../../types/analytics';

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
  const [userPreference, setUserPreference] = useState<UserPreference>('any');
  const [feedbackGiven, setFeedbackGiven] = useState<{ [key: string]: 'liked' | 'disliked' }>({});
  const [refreshing, setRefreshing] = useState(false);

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

  // Load recommendations when location, city context, time, or preferences change
  useEffect(() => {
    if (location && cityContext && user) {
      loadRecommendations();
    }
  }, [location, cityContext, timeContext, user, userPreference]);
  
  // Don't clear feedback when preference changes - maintain visual state
  // This ensures downvoted places stay visually marked across preference switches

  const loadRecommendations = async () => {
    if (!location || !cityContext || !user) return;

    try {
      setRecommendationsLoading(true);
      
      // Load recommendations directly with Google Place IDs - no conversion needed
      const databaseRecs = await recommendationService.getRecommendations({
        userId: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
        limit: 6,
        timeContext,
        userPreference,
        includeClosedPlaces: false // Always exclude closed places
      });
      
      setDatabaseRecommendations(databaseRecs);
      
    } catch (error) {
      console.error('Error loading recommendations:', error);
      
      // Set empty recommendations on error
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

  const handleRefresh = async () => {
    if (!location || !cityContext || !user) return;
    
    setRefreshing(true);
    
    try {
      // Clear current recommendations to show loading state
      setDatabaseRecommendations(null);
      
      // Refresh location if using fallback
      if (isUsingFallback) {
        await forceLocationRetry();
      }
      
      // Load fresh recommendations
      await loadRecommendations();
      
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNavigateToPlace = async (googlePlaceId: string, placeName: string, position: number) => {
    // Track 'viewed' action when user taps to see place details
    if (databaseRecommendations?.requestId && user) {
      const instanceId = await recommendationService.getRecommendationInstance(
        databaseRecommendations.requestId,
        googlePlaceId
      );
      
      if (instanceId) {
        await recommendationService.recordRecommendationFeedback(
          instanceId,
          user.id,
          'viewed'
        );
      }
    }
    
    // Track analytics event
    await analyticsService.track(AnalyticsEventName.RECOMMENDATION_VIEWED, {
      recommendation_request_id: databaseRecommendations?.requestId,
      place_id: googlePlaceId,
      place_name: placeName,
      position,
      user_preference: userPreference,
      time_of_day: timeContext.timeOfDay,
    });
    
    // Navigate to PlaceInListDetail since DecideStack doesn't have PlaceDetails
    navigation.navigate('PlaceInListDetail', {
      placeId: googlePlaceId,
      listId: 'recommendations',
      listName: 'Recommendations',
      source: 'suggestion',
    });
  };

  const handleFeedback = async (googlePlaceId: string, action: 'liked' | 'disliked', position: number, placeName: string) => {
    if (!databaseRecommendations?.requestId || !user) return;
    
    // Get the instance ID for this place
    const instanceId = await recommendationService.getRecommendationInstance(
      databaseRecommendations.requestId,
      googlePlaceId
    );
    
    if (!instanceId) return;
    
    // Record the feedback
    const success = await recommendationService.recordRecommendationFeedback(
      instanceId,
      user.id,
      action
    );
    
    if (success) {
      // Update local state to show feedback was given
      // Use composite key to make feedback context-specific
      const feedbackKey = `${googlePlaceId}-${userPreference}`;
      setFeedbackGiven(prev => ({ ...prev, [feedbackKey]: action }));
      
      // Track analytics event
      await analyticsService.track(AnalyticsEventName.RECOMMENDATION_FEEDBACK, {
        recommendation_request_id: databaseRecommendations.requestId,
        place_id: googlePlaceId,
        place_name: placeName,
        position,
        action,
        user_preference: userPreference,
        time_of_day: timeContext.timeOfDay,
      });
    }
  };

  // UI helper functions - simplified for direct Google Place ID usage

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
  const getDatabaseRecommendationReason = (place: ScoredPlace) => {
    // Show closed status if applicable
    if (place.isOpen === false) {
      return 'Currently closed';
    }
    
    // Show if it's from user's saved lists
    if (place.isInUserLists) {
      return 'From your lists';
    }
    
    // Show other meaningful reasons
    if (place.distance_km < 0.5) {
      return 'Very close to you';
    } else if (place.rating && place.rating > 4.5) {
      return 'Highly rated';
    } else if (place.user_ratings_total && place.user_ratings_total > 1000) {
      return 'Popular choice';
    } else {
      return 'Recommended';
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
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={DarkTheme.colors.bangkok.gold}
            colors={[DarkTheme.colors.bangkok.gold]} // Android
          />
        }
      >
        {/* User Preference Selection */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
          paddingTop: DarkTheme.spacing.md,
          paddingBottom: DarkTheme.spacing.sm,
        }}>
          <Text style={[
            DarkTheme.typography.caption1,
            { 
              color: DarkTheme.colors.semantic.secondaryLabel,
              marginBottom: DarkTheme.spacing.sm,
              fontWeight: '600',
            }
          ]}>
            What are you looking for?
          </Text>
          
          <View style={{
            flexDirection: 'row',
            gap: DarkTheme.spacing.sm,
            marginBottom: DarkTheme.spacing.sm,
          }}>
            <TouchableOpacity 
              onPress={() => setUserPreference('any')}
              style={{
                flex: 1,
                backgroundColor: userPreference === 'any' 
                  ? DarkTheme.colors.bangkok.gold 
                  : DarkTheme.colors.semantic.tertiarySystemBackground,
                paddingVertical: DarkTheme.spacing.sm,
                paddingHorizontal: DarkTheme.spacing.md,
                borderRadius: DarkTheme.borderRadius.sm,
                alignItems: 'center',
              }}
            >
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: userPreference === 'any' 
                    ? DarkTheme.colors.system.black 
                    : DarkTheme.colors.semantic.label,
                  fontWeight: '600',
                }
              ]}>
                Anything
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setUserPreference('eat')}
              style={{
                flex: 1,
                backgroundColor: userPreference === 'eat' 
                  ? DarkTheme.colors.bangkok.gold 
                  : DarkTheme.colors.semantic.tertiarySystemBackground,
                paddingVertical: DarkTheme.spacing.sm,
                paddingHorizontal: DarkTheme.spacing.md,
                borderRadius: DarkTheme.borderRadius.sm,
                alignItems: 'center',
              }}
            >
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: userPreference === 'eat' 
                    ? DarkTheme.colors.system.black 
                    : DarkTheme.colors.semantic.label,
                  fontWeight: '600',
                }
              ]}>
                🍽️ Food
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setUserPreference('drink')}
              style={{
                flex: 1,
                backgroundColor: userPreference === 'drink' 
                  ? DarkTheme.colors.bangkok.gold 
                  : DarkTheme.colors.semantic.tertiarySystemBackground,
                paddingVertical: DarkTheme.spacing.sm,
                paddingHorizontal: DarkTheme.spacing.md,
                borderRadius: DarkTheme.borderRadius.sm,
                alignItems: 'center',
              }}
            >
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: userPreference === 'drink' 
                    ? DarkTheme.colors.system.black 
                    : DarkTheme.colors.semantic.label,
                  fontWeight: '600',
                }
              ]}>
                ☕ Coffee
              </Text>
            </TouchableOpacity>
          </View>
          
        </View>

        {/* Recommendations Section */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
          paddingTop: DarkTheme.spacing.sm,
          paddingBottom: DarkTheme.spacing.lg,
        }}>
          
          {/* Feedback Context Text */}
          {databaseRecommendations && databaseRecommendations.places.length > 0 && (
            <View style={{ marginBottom: DarkTheme.spacing.sm }}>
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }
              ]}>
                {userPreference === 'drink' 
                  ? 'Rate these as coffee recommendations'
                  : userPreference === 'eat'
                  ? 'Rate these as food recommendations'
                  : 'Rate these recommendations'}
              </Text>
              {databaseRecommendations.excludedCheckedInCount && databaseRecommendations.excludedCheckedInCount > 0 && (
                <Text style={[
                  DarkTheme.typography.caption2,
                  { 
                    color: DarkTheme.colors.semantic.tertiaryLabel,
                    textAlign: 'center',
                    marginTop: DarkTheme.spacing.xs,
                  }
                ]}>
                  Hiding {databaseRecommendations.excludedCheckedInCount} places you've visited or disliked
                </Text>
              )}
            </View>
          )}

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
                const position = index + 1; // Position in recommendation list
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
                    onPress={() => handleNavigateToPlace(place.google_place_id, place.name, position)}
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
                        {getDatabaseRecommendationReason(place)}
                      </Text>
                      
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: DarkTheme.spacing.xs,
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
                      
                      {/* Opening Hours Status */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        {place.isOpen !== null && (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: place.isOpen 
                              ? `${DarkTheme.colors.status.success}20`
                              : `${DarkTheme.colors.status.error}20`,
                            paddingHorizontal: DarkTheme.spacing.sm,
                            paddingVertical: DarkTheme.spacing.xs / 2,
                            borderRadius: DarkTheme.borderRadius.xs,
                          }}>
                            <View style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: place.isOpen 
                                ? DarkTheme.colors.status.success
                                : DarkTheme.colors.status.error,
                              marginRight: DarkTheme.spacing.xs / 2,
                            }} />
                            <Text style={[
                              DarkTheme.typography.caption2,
                              { 
                                color: place.isOpen 
                                  ? DarkTheme.colors.status.success
                                  : DarkTheme.colors.status.error,
                                fontWeight: '500',
                              }
                            ]}>
                              {place.isOpen ? 'Open' : 'Closed'}
                              {place.isOpen && place.closingTime && ` • Closes ${place.closingTime}`}
                              {!place.isOpen && place.openingTime && ` • Opens ${place.openingTime}`}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Feedback Buttons */}
                    <View style={{
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: DarkTheme.spacing.sm,
                    }}>
                      <TouchableOpacity
                        onPress={() => handleFeedback(place.google_place_id, 'liked', position, place.name)}
                        disabled={!!feedbackGiven[`${place.google_place_id}-${userPreference}`]}
                        style={{
                          opacity: feedbackGiven[`${place.google_place_id}-${userPreference}`] ? 0.5 : 1,
                          marginBottom: DarkTheme.spacing.xs,
                        }}
                      >
                        <ThumbsUp 
                          size={24} 
                          color={
                            feedbackGiven[`${place.google_place_id}-${userPreference}`] === 'liked' 
                              ? DarkTheme.colors.status.success 
                              : DarkTheme.colors.semantic.tertiaryLabel
                          }
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => handleFeedback(place.google_place_id, 'disliked', position, place.name)}
                        disabled={!!feedbackGiven[`${place.google_place_id}-${userPreference}`]}
                        style={{
                          opacity: feedbackGiven[`${place.google_place_id}-${userPreference}`] ? 0.5 : 1,
                        }}
                      >
                        <ThumbsDown 
                          size={24} 
                          color={
                            feedbackGiven[`${place.google_place_id}-${userPreference}`] === 'disliked' 
                              ? DarkTheme.colors.status.error 
                              : DarkTheme.colors.semantic.tertiaryLabel
                          }
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
              
              {/* Show message if no saved places found */}
              {databaseRecommendations.places.length === 0 && (
                <View style={{
                  backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
                  borderRadius: DarkTheme.borderRadius.lg,
                  padding: DarkTheme.spacing.lg,
                  marginTop: DarkTheme.spacing.sm,
                  alignItems: 'center',
                }}>
                  <Text style={[
                    DarkTheme.typography.subhead,
                    { 
                      color: DarkTheme.colors.semantic.label,
                      textAlign: 'center',
                      marginBottom: DarkTheme.spacing.sm,
                      fontWeight: '600',
                    }
                  ]}>
                    No saved places nearby
                  </Text>
                  <Text style={[
                    DarkTheme.typography.caption1,
                    { 
                      color: DarkTheme.colors.semantic.secondaryLabel,
                      textAlign: 'center',
                    }
                  ]}>
                    Save places to your lists to get personalized recommendations based on your favorites!
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