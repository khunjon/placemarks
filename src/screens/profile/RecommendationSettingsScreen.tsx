import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DarkTheme } from '../../constants/theme';
import type { ProfileStackScreenProps } from '../../navigation/types';
import { useAuth } from '../../services/auth-context';
import { supabase } from '../../services/supabase';
import { UserRecommendationPreferences } from '../../types';
import Toast from '../../components/ui/Toast';

type RecommendationSettingsScreenProps = ProfileStackScreenProps<'RecommendationSettings'>;

export default function RecommendationSettingsScreen({ navigation }: RecommendationSettingsScreenProps) {
  const { user } = useAuth();
  
  // General settings
  const radiusOptions = [2, 5, 10, 20]; // km
  const [searchRadius, setSearchRadius] = useState(20); // km (default to 20km)
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Store original values to detect changes
  const [originalSearchRadius, setOriginalSearchRadius] = useState(20);
  const [originalPriceRange, setOriginalPriceRange] = useState<[number, number]>([1, 4]);
  
  // Price range state (min and max values from 1-4)
  const [priceRange, setPriceRange] = useState<[number, number]>([1, 4]);
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });
  
  // Toast helper functions
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };
  
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Price labels for display
  const priceLabels = ['$', '$$', '$$$', '$$$$'];

  // Load user preferences on mount
  useEffect(() => {
    loadUserPreferences();
  }, []);
  
  // Detect changes
  useEffect(() => {
    if (isInitialLoad) return;
    
    const pricesChanged = priceRange[0] !== originalPriceRange[0] || priceRange[1] !== originalPriceRange[1];
    const radiusChanged = searchRadius !== originalSearchRadius;
    
    setHasChanges(pricesChanged || radiusChanged);
  }, [searchRadius, priceRange, originalSearchRadius, originalPriceRange, isInitialLoad]);

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
        const savedRadius = preferences.search_radius_km || 20;
        const savedPrices = preferences.price_ranges || [1, 2, 3, 4];
        
        setSearchRadius(savedRadius);
        setOriginalSearchRadius(savedRadius);
        
        // Convert saved prices array to range (min and max)
        if (savedPrices.length > 0) {
          const minPrice = Math.min(...savedPrices);
          const maxPrice = Math.max(...savedPrices);
          setPriceRange([minPrice, maxPrice]);
          setOriginalPriceRange([minPrice, maxPrice]);
        }
      }
    } catch (error) {
      console.error('Error in loadUserPreferences:', error);
    } finally {
      setIsLoading(false);
      // Mark that initial load is complete
      setIsInitialLoad(false);
    }
  };

  const saveUserPreferences = async (showSuccessAlert = false) => {
    if (!user?.id) return;
    
    try {
      setIsSaving(true);
      
      // Convert price range to array of all values in range
      const enabledPrices = [];
      for (let i = priceRange[0]; i <= priceRange[1]; i++) {
        enabledPrices.push(i);
      }
      
      const { error } = await supabase.rpc('upsert_user_recommendation_preferences', {
        p_user_id: user.id,
        p_search_radius_km: searchRadius,
        p_price_ranges: enabledPrices
      });
      
      if (error) {
        console.error('Error saving preferences:', error);
        showToast('Failed to save preferences. Please try again.', 'error');
        return;
      }
      
      // Only show success toast if explicitly requested (e.g., from a manual save button)
      if (showSuccessAlert) {
        showToast('Preferences saved successfully!', 'success');
        // Update original values after successful save
        setOriginalSearchRadius(searchRadius);
        setOriginalPriceRange(priceRange);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error in saveUserPreferences:', error);
      showToast('Failed to save preferences. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when settings change
  useEffect(() => {
    // Skip auto-save during initial load
    if (!isLoading && !isInitialLoad && user?.id) {
      // Debounce auto-save
      const timeoutId = setTimeout(() => {
        saveUserPreferences(); // Don't show success alert for auto-save
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchRadius, priceRange, isLoading, isInitialLoad, user?.id]);

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
        contentContainerStyle={{ paddingBottom: DarkTheme.spacing.xxl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Radius Section */}
        <View style={{ paddingTop: DarkTheme.spacing.lg }}>
          <View style={{ paddingHorizontal: DarkTheme.spacing.lg, marginBottom: DarkTheme.spacing.md }}>
            <Text style={[
              DarkTheme.typography.title3,
              { color: DarkTheme.colors.semantic.label, fontWeight: 'bold' }
            ]}>
              Search Radius
            </Text>
            <Text style={[
              DarkTheme.typography.footnote,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                marginTop: DarkTheme.spacing.xs
              }
            ]}>
              How far to search for recommendations around your location
            </Text>
          </View>

          <View style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: DarkTheme.colors.semantic.separator,
            paddingVertical: DarkTheme.spacing.md,
          }}>
            <View style={{ paddingHorizontal: DarkTheme.spacing.lg }}>
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap',
                gap: DarkTheme.spacing.sm
              }}>
                {radiusOptions.map((radius) => (
                  <TouchableOpacity
                    key={radius}
                    style={{
                      paddingHorizontal: DarkTheme.spacing.md,
                      paddingVertical: DarkTheme.spacing.sm,
                      borderRadius: 8,
                      backgroundColor: searchRadius === radius 
                        ? DarkTheme.colors.accent.yellow 
                        : DarkTheme.colors.semantic.tertiarySystemBackground,
                      borderWidth: 1,
                      borderColor: searchRadius === radius 
                        ? DarkTheme.colors.accent.yellow 
                        : DarkTheme.colors.semantic.separator,
                    }}
                    onPress={() => setSearchRadius(radius)}
                    disabled={isSaving}
                  >
                    <Text style={[
                      DarkTheme.typography.body,
                      { 
                        color: searchRadius === radius 
                          ? DarkTheme.colors.system.black
                          : DarkTheme.colors.semantic.label,
                        fontWeight: searchRadius === radius ? '600' : 'normal'
                      }
                    ]}>
                      {formatRadius(radius)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Food Price Range Section */}
        <View style={{ paddingTop: DarkTheme.spacing.lg }}>
          <View style={{ paddingHorizontal: DarkTheme.spacing.lg, marginBottom: DarkTheme.spacing.md }}>
            <Text style={[
              DarkTheme.typography.title3,
              { color: DarkTheme.colors.semantic.label, fontWeight: 'bold' }
            ]}>
              Food Price Range
            </Text>
            <Text style={[
              DarkTheme.typography.footnote,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                marginTop: DarkTheme.spacing.xs
              }
            ]}>
              Select which price ranges to include in food recommendations
            </Text>
          </View>

          <View style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: DarkTheme.colors.semantic.separator,
            paddingVertical: DarkTheme.spacing.lg,
          }}>
            <View style={{ paddingHorizontal: DarkTheme.spacing.lg }}>
              {/* Price range selector */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: DarkTheme.spacing.md,
              }}>
                {priceLabels.map((label, index) => {
                  const priceLevel = index + 1;
                  const isInRange = priceLevel >= priceRange[0] && priceLevel <= priceRange[1];
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: DarkTheme.spacing.md,
                        marginHorizontal: DarkTheme.spacing.xs,
                        borderRadius: 8,
                        backgroundColor: isInRange 
                          ? DarkTheme.colors.accent.yellow 
                          : DarkTheme.colors.semantic.tertiarySystemBackground,
                        borderWidth: 1,
                        borderColor: isInRange 
                          ? DarkTheme.colors.accent.yellow 
                          : DarkTheme.colors.semantic.separator,
                      }}
                      onPress={() => {
                        // Toggle selection: if it's the only one selected, keep it
                        // Otherwise, update the range
                        if (priceRange[0] === priceLevel && priceRange[1] === priceLevel) {
                          // Already only this one selected, do nothing
                          return;
                        }
                        
                        if (isInRange) {
                          // Deselecting - shrink the range
                          if (priceLevel === priceRange[0]) {
                            setPriceRange([priceLevel + 1, priceRange[1]]);
                          } else if (priceLevel === priceRange[1]) {
                            setPriceRange([priceRange[0], priceLevel - 1]);
                          }
                        } else {
                          // Selecting - expand the range
                          if (priceLevel < priceRange[0]) {
                            setPriceRange([priceLevel, priceRange[1]]);
                          } else if (priceLevel > priceRange[1]) {
                            setPriceRange([priceRange[0], priceLevel]);
                          }
                        }
                      }}
                      disabled={isSaving}
                    >
                      <Text style={[
                        DarkTheme.typography.body,
                        { 
                          color: isInRange 
                            ? DarkTheme.colors.system.black 
                            : DarkTheme.colors.semantic.label,
                          fontWeight: '600',
                        }
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              {/* Selected range text */}
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  textAlign: 'center',
                }
              ]}>
                {priceRange[0] === priceRange[1] 
                  ? `Only ${priceLabels[priceRange[0] - 1]} restaurants` 
                  : `${priceLabels[priceRange[0] - 1]} to ${priceLabels[priceRange[1] - 1]} restaurants`}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Save Button */}
        <View style={{ 
          paddingHorizontal: DarkTheme.spacing.lg, 
          paddingTop: DarkTheme.spacing.xl,
          paddingBottom: DarkTheme.spacing.lg
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: hasChanges ? DarkTheme.colors.accent.yellow : DarkTheme.colors.system.gray4,
              borderRadius: 12,
              paddingVertical: DarkTheme.spacing.md,
              alignItems: 'center',
              opacity: isSaving || !hasChanges ? 0.7 : 1,
            }}
            onPress={() => saveUserPreferences(true)}
            disabled={isSaving || isLoading || !hasChanges}
          >
            <Text style={[
              DarkTheme.typography.body,
              { 
                color: hasChanges ? DarkTheme.colors.system.black : DarkTheme.colors.opacity.disabled,
                fontWeight: '600'
              }
            ]}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
} 