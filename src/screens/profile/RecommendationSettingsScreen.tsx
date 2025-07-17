import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DarkTheme } from '../../constants/theme';
import type { ProfileStackScreenProps } from '../../navigation/types';

type RecommendationSettingsScreenProps = ProfileStackScreenProps<'RecommendationSettings'>;

interface FoodPriceRange {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function RecommendationSettingsScreen({ navigation }: RecommendationSettingsScreenProps) {
  // General settings
  const radiusOptions = [1, 2, 5, 10]; // km
  const [searchRadius, setSearchRadius] = useState(2); // km

  // Food price ranges
  const [foodPriceRanges, setFoodPriceRanges] = useState<FoodPriceRange[]>([
    { id: '1', label: '$', description: 'Budget-friendly', enabled: true },
    { id: '2', label: '$$', description: 'Moderate', enabled: true },
    { id: '3', label: '$$$', description: 'Expensive', enabled: false },
    { id: '4', label: '$$$$', description: 'Very Expensive', enabled: false },
  ]);

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