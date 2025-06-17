import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, User, Zap, MapPin, Clock, Coffee, Utensils, Wine, ShoppingBag, ChevronRight } from 'lucide-react-native';
import { DarkTheme } from '../constants/theme';
import ListCard, { ListCardProps } from '../components/lists/ListCard';
import type { DecideStackScreenProps } from '../navigation/types';
import { createCityContext, createValidatedCityContext, Location as CityLocation, CityContext } from '../services/cityContext';
import { getCurrentRecommendations, getTimeContext } from '../services/recommendations';
import { Recommendation, TimeContext } from '../types/recommendations';
import { useLocation } from '../hooks/useLocation';
import { locationUtils } from '../utils/location';

type DecideScreenProps = DecideStackScreenProps<'Decide'>;

// Mock data for curated editorial lists
const mockCuratedListsData = [
  {
    id: 'curated-1',
    name: 'Best of Tatler',
    type: 'curated' as const,
    listType: 'editorial' as const,
    placeCount: 25,
    previewPlaces: ['Gaggan Anand', 'Le Du', 'Sühring'],
    curator: 'Tatler Thailand',
    description: 'The finest dining experiences in Bangkok',
  },
  {
    id: 'curated-2',
    name: 'Michelin Bib Gourmand',
    type: 'curated' as const,
    listType: 'michelin' as const,
    placeCount: 18,
    previewPlaces: ['Jay Fai', 'Raan Jay Fai', 'Krua Apsorn'],
    curator: 'Michelin Guide',
    description: 'Exceptional food at moderate prices',
  },
  {
    id: 'curated-3',
    name: 'Recommended by Timeout',
    type: 'curated' as const,
    listType: 'timeout' as const,
    placeCount: 32,
    previewPlaces: ['Chatuchak Market', 'Wat Arun', 'Khao San Road'],
    curator: 'Time Out Bangkok',
    description: 'Must-visit spots according to local experts',
  },
  {
    id: 'curated-4',
    name: 'Hidden Gems',
    type: 'curated' as const,
    listType: 'hidden' as const,
    placeCount: 15,
    previewPlaces: ['Baan Silapin', 'Wang Thonglang Market', 'Saphan Phut Night Market'],
    curator: 'Placemarks Editors',
    description: 'Secret spots locals love',
  },
];

export default function DecideScreen({ navigation }: DecideScreenProps) {
  // Use the location hook
  const {
    location,
    loading: locationLoading,
    error: locationError,
    source,
    refreshLocation,
  } = useLocation({
    enableHighAccuracy: false, // Use balanced accuracy for better performance
    fallbackToBangkok: true,
    autoRequest: true,
    enableCaching: true,
    enableOfflineFallback: true,
    enableBackgroundUpdates: true,
    // disabled: true, // Uncomment for faster testing without location
  });

  // Computed values for backward compatibility
  const isLocationAvailable = !!location;
  const isUsingFallback = source === 'fallback';
  const retryLocation = refreshLocation;

  // State for recommendations and time context
  const [cityContext, setCityContext] = useState<CityContext | null>(null);
  const [timeContext, setTimeContext] = useState<TimeContext>(getTimeContext());
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
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

  // Load recommendations when location or time changes
  useEffect(() => {
    if (location && cityContext) {
      loadRecommendations();
    }
  }, [location, cityContext, timeContext]);

  const loadRecommendations = async () => {
    if (!location || !cityContext) return;

    try {
      setRecommendationsLoading(true);
      const userLoc: CityLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      
      const recommendationSet = await getCurrentRecommendations(
        userLoc,
        cityContext.tier
      );
      
      // Take top 4 recommendations for the main display
      setRecommendations(recommendationSet.recommendations.slice(0, 4));
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const handleNavigateToList = (listId: string, listName: string, listType: 'user' | 'smart') => {
    navigation.navigate('ListDetail', {
      listId,
      listName,
      listType,
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
      return 'Using Bangkok (default)';
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

  const getRecommendationReason = (rec: Recommendation, timeCtx: TimeContext) => {
    if (rec.timeRelevance.currentRelevance > 0.8) {
      return `Perfect for ${timeCtx.timeOfDay}`;
    } else if (rec.distanceKm < 0.5) {
      return 'Very close to you';
    } else if (rec.rating && rec.rating > 4.5) {
      return 'Highly rated';
    } else if (rec.type === 'curated') {
      return 'Local favorite';
    } else {
      return 'Popular choice';
    }
  };

  // Convert curated data with navigation handlers
  const mockCuratedLists = mockCuratedListsData.map(list => ({
    ...list,
    onPress: () => handleNavigateToList(list.id, list.name, 'user'), // Use 'user' for navigation compatibility
  }));
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
          Decide
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: DarkTheme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Smart Recommendations Section */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
          paddingTop: DarkTheme.spacing.md,
          paddingBottom: DarkTheme.spacing.lg,
        }}>
          {/* Context Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: DarkTheme.spacing.md,
          }}>
            <View style={{ flex: 1 }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: DarkTheme.spacing.xs,
              }}>
                <MapPin 
                  size={16} 
                  color={DarkTheme.colors.semantic.secondaryLabel}
                  strokeWidth={2}
                />
                <Text style={[
                  DarkTheme.typography.caption1,
                  { 
                    color: DarkTheme.colors.semantic.secondaryLabel,
                    marginLeft: DarkTheme.spacing.xs,
                  }
                ]}>
                  {getLocationContextMessage()}
                </Text>
              </View>
              
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

            {!locationLoading && !locationError && (
              <TouchableOpacity 
                onPress={retryLocation}
                style={{
                  padding: DarkTheme.spacing.xs,
                }}
              >
                <Sparkles 
                  size={20} 
                  color={DarkTheme.colors.bangkok.gold}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Recommendations Content */}
          {locationLoading || recommendationsLoading ? (
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
          ) : recommendations.length > 0 ? (
            <View>
              {recommendations.map((rec, index) => {
                const IconComponent = getCategoryIcon(rec.category);
                return (
                  <TouchableOpacity
                    key={rec.id}
                    style={{
                      backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                      borderRadius: DarkTheme.borderRadius.lg,
                      padding: DarkTheme.spacing.md,
                      marginBottom: DarkTheme.spacing.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      // Navigate to place details - you can implement this later
                      console.log('Navigate to place:', rec.name);
                    }}
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
                        {getCategoryEmoji(rec.category)}
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
                        {rec.name}
                      </Text>
                      
                      <Text style={[
                        DarkTheme.typography.caption1,
                        { 
                          color: DarkTheme.colors.bangkok.gold,
                          fontWeight: '500',
                          marginBottom: DarkTheme.spacing.xs,
                        }
                      ]}>
                        {getRecommendationReason(rec, timeContext)}
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
                          {formatDistance(rec.distanceKm)}
                        </Text>
                        
                        {rec.rating && (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}>
                            <Text style={[
                              DarkTheme.typography.caption2,
                              { 
                                color: DarkTheme.colors.semantic.secondaryLabel,
                              }
                            ]}>
                              ⭐ {rec.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
                }
              ]}>
                No recommendations available right now
              </Text>
            </View>
          )}
        </View>

        {/* Curated Lists Section */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: DarkTheme.spacing.md,
          }}>
            <Sparkles 
              size={20} 
              color={DarkTheme.colors.bangkok.gold}
              strokeWidth={2}
            />
            <Text style={[
              DarkTheme.typography.title2,
              { 
                color: DarkTheme.colors.semantic.label,
                fontWeight: '600',
                marginLeft: DarkTheme.spacing.sm,
              }
            ]}>
              Curated Lists
            </Text>
            <Text style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.tertiaryLabel,
                marginLeft: DarkTheme.spacing.sm,
              }
            ]}>
              ({mockCuratedLists.length})
            </Text>
          </View>



          {mockCuratedLists.map((list) => (
            <TouchableOpacity
              key={list.id}
              onPress={list.onPress}
              activeOpacity={0.7}
              style={{
                backgroundColor: `${DarkTheme.colors.bangkok.gold}08`,
                borderColor: `${DarkTheme.colors.bangkok.gold}40`,
                borderWidth: 1,
                borderRadius: DarkTheme.borderRadius.md,
                padding: DarkTheme.spacing.md,
                marginBottom: DarkTheme.spacing.sm,
                ...DarkTheme.shadows.small,
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                }}>
                  <View 
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: DarkTheme.spacing.sm,
                      backgroundColor: `${DarkTheme.colors.bangkok.gold}20`,
                    }}
                  >
                    <Sparkles 
                      size={20} 
                      color={DarkTheme.colors.bangkok.gold}
                      strokeWidth={2}
                    />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text 
                        style={[
                          DarkTheme.typography.headline,
                          { 
                            color: DarkTheme.colors.semantic.label,
                            marginRight: DarkTheme.spacing.xs,
                          }
                        ]}
                        numberOfLines={1}
                      >
                        {list.name}
                      </Text>
                      
                      <View style={{
                        backgroundColor: `${DarkTheme.colors.bangkok.gold}20`,
                        paddingHorizontal: DarkTheme.spacing.xs,
                        paddingVertical: 2,
                        borderRadius: DarkTheme.borderRadius.xs,
                      }}>
                        <Text style={[
                          DarkTheme.typography.caption2,
                          { 
                            color: DarkTheme.colors.bangkok.gold,
                            fontWeight: '600',
                            fontSize: 10,
                          }
                        ]}>
                          CURATED
                        </Text>
                      </View>
                    </View>
                    
                    <Text 
                      style={[
                        DarkTheme.typography.caption1,
                        { 
                          color: DarkTheme.colors.semantic.secondaryLabel,
                          fontWeight: '600' 
                        }
                      ]}
                    >
                      {list.placeCount} {list.placeCount === 1 ? 'place' : 'places'} • {list.curator}
                    </Text>
                  </View>
                </View>
                
                <ChevronRight 
                  size={20} 
                  color={DarkTheme.colors.semantic.tertiaryLabel}
                  strokeWidth={2}
                />
              </View>


            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 