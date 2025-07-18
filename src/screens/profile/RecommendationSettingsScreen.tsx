import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DarkTheme } from '../../constants/theme';
import type { ProfileStackScreenProps } from '../../navigation/types';
import { useAuth } from '../../services/auth-context';
import { supabase } from '../../services/supabase';
import { UserRecommendationPreferences } from '../../types';

type RecommendationSettingsScreenProps = ProfileStackScreenProps<'RecommendationSettings'>;

interface FoodPriceRange {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function RecommendationSettingsScreen({ navigation }: RecommendationSettingsScreenProps) {
  const { user } = useAuth();
  
  // General settings
  const radiusOptions = [2, 5, 10, 20]; // km
  const [searchRadius, setSearchRadius] = useState(20); // km (default to 20km)
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Food price ranges
  const [foodPriceRanges, setFoodPriceRanges] = useState<FoodPriceRange[]>([
    { id: '1', label: '$', description: 'Budget-friendly', enabled: true },
    { id: '2', label: '$$', description: 'Moderate', enabled: true },
    { id: '3', label: '$$$', description: 'Expensive', enabled: true },
    { id: '4', label: '$$$$', description: 'Very Expensive', enabled: true },
  ]);

  // Load user preferences on mount
  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_user_recommendation_preferences', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error('Error loading user preferences:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const preferences = data[0];
        setSearchRadius(preferences.search_radius_km || 20);
        
        // Update price ranges based on saved preferences
        const enabledPrices = preferences.price_ranges || [1, 2, 3, 4];
        setFoodPriceRanges(prev => 
          prev.map(range => ({
            ...range,
            enabled: enabledPrices.includes(parseInt(range.id))
          }))
        );
      }
    } catch (error) {
      console.error('Error in loadUserPreferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserPreferences = async () => {
    if (!user?.id) return;
    
    try {
      setIsSaving(true);
      
      // Get enabled price ranges
      const enabledPrices = foodPriceRanges
        .filter(range => range.enabled)
        .map(range => parseInt(range.id));
      
      const { error } = await supabase.rpc('upsert_user_recommendation_preferences', {
        p_user_id: user.id,
        p_search_radius_km: searchRadius,
        p_price_ranges: enabledPrices
      });
      
      if (error) {
        console.error('Error saving preferences:', error);
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
        return;
      }
      
      Alert.alert('Success', 'Preferences saved successfully!');
    } catch (error) {
      console.error('Error in saveUserPreferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when settings change
  useEffect(() => {
    if (!isLoading && user?.id) {
      // Debounce auto-save
      const timeoutId = setTimeout(() => {
        saveUserPreferences();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchRadius, foodPriceRanges, isLoading, user?.id]);

  const togglePriceRange = (id: string) => {
    setFoodPriceRanges(prev => 
      prev.map(range => 
        range.id === id ? { ...range, enabled: !range.enabled } : range
      )
    );
  };

  const formatRadius = (value: number): string => {
    if (value < 1) {
      return `${Math.round(value * 1000)}m`;
    }
    return `${value}km`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DarkTheme.colors.semantic.systemBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: DarkTheme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* General Section */}
        <View style={{ paddingTop: DarkTheme.spacing.lg }}>
          <View style={{ paddingHorizontal: DarkTheme.spacing.lg, marginBottom: DarkTheme.spacing.md }}>
            <Text style={[
              DarkTheme.typography.title3,
              { color: DarkTheme.colors.semantic.label, fontWeight: 'bold' }
            ]}>
              General
            </Text>
          </View>

          <View style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: DarkTheme.colors.semantic.separator,
            paddingVertical: DarkTheme.spacing.md,
          }}>
            {/* Search Radius Setting */}
            <View style={{ paddingHorizontal: DarkTheme.spacing.lg }}>
              <Text style={[
                DarkTheme.typography.body,
                { color: DarkTheme.colors.semantic.label, marginBottom: DarkTheme.spacing.sm }
              ]}>
                Search Radius
              </Text>
              
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap',
                gap: DarkTheme.spacing.sm,
                marginBottom: DarkTheme.spacing.sm
              }}>
                {radiusOptions.map((radius) => (
                  <TouchableOpacity
                    key={radius}
                    style={{
                      paddingHorizontal: DarkTheme.spacing.md,
                      paddingVertical: DarkTheme.spacing.sm,
                      borderRadius: 8,
                      backgroundColor: searchRadius === radius 
                        ? DarkTheme.colors.accent.blue 
                        : DarkTheme.colors.semantic.tertiarySystemBackground,
                      borderWidth: 1,
                      borderColor: searchRadius === radius 
                        ? DarkTheme.colors.accent.blue 
                        : DarkTheme.colors.semantic.separator,
                    }}
                    onPress={() => setSearchRadius(radius)}
                    disabled={isSaving}
                  >
                    <Text style={[
                      DarkTheme.typography.body,
                      { 
                        color: searchRadius === radius 
                          ? DarkTheme.colors.semantic.systemBackground
                          : DarkTheme.colors.semantic.label,
                        fontWeight: searchRadius === radius ? '600' : 'normal'
                      }
                    ]}>
                      {formatRadius(radius)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  marginTop: DarkTheme.spacing.xs
                }
              ]}>
                How far to search for recommendations around your location
              </Text>
            </View>
          </View>
        </View>

        {/* Food Section */}
        <View style={{ paddingTop: DarkTheme.spacing.lg }}>
          <View style={{ paddingHorizontal: DarkTheme.spacing.lg, marginBottom: DarkTheme.spacing.md }}>
            <Text style={[
              DarkTheme.typography.title3,
              { color: DarkTheme.colors.semantic.label, fontWeight: 'bold' }
            ]}>
              Food
            </Text>
          </View>

          <View style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: DarkTheme.colors.semantic.separator,
          }}>
            <View style={{ paddingHorizontal: DarkTheme.spacing.lg, paddingVertical: DarkTheme.spacing.sm }}>
              <Text style={[
                DarkTheme.typography.footnote,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  marginBottom: DarkTheme.spacing.md
                }
              ]}>
                Select which price ranges to include in food recommendations
              </Text>
            </View>

            {foodPriceRanges.map((range, index) => (
              <View key={range.id}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: DarkTheme.spacing.lg,
                  paddingVertical: DarkTheme.spacing.md,
                }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={[
                        DarkTheme.typography.body,
                        { 
                          color: DarkTheme.colors.semantic.label,
                          fontWeight: '600',
                          marginRight: DarkTheme.spacing.sm
                        }
                      ]}>
                        {range.label}
                      </Text>
                      <Text style={[
                        DarkTheme.typography.body,
                        { color: DarkTheme.colors.semantic.label }
                      ]}>
                        {range.description}
                      </Text>
                    </View>
                  </View>
                  
                  <Switch
                    value={range.enabled}
                    onValueChange={() => togglePriceRange(range.id)}
                    disabled={isSaving}
                    trackColor={{
                      false: DarkTheme.colors.semantic.tertiarySystemFill,
                      true: DarkTheme.colors.accent.blue + '80'
                    }}
                    thumbColor={range.enabled ? DarkTheme.colors.accent.blue : DarkTheme.colors.system.gray}
                    ios_backgroundColor={DarkTheme.colors.semantic.tertiarySystemFill}
                  />
                </View>
                
                {index < foodPriceRanges.length - 1 && (
                  <View style={{
                    height: 1,
                    backgroundColor: DarkTheme.colors.semantic.separator,
                    marginLeft: DarkTheme.spacing.lg,
                  }} />
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 