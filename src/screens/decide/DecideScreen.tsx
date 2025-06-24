import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';
import type { DecideStackScreenProps } from '../../navigation/types';
import { enhancedListsService, ListWithPlaces } from '../../services/listsService';
import { useAuth } from '../../services/auth-context';

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
  const { user } = useAuth();
  const [curatedLists, setCuratedLists] = useState<ListWithPlaces[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCuratedLists();
  }, []);

  const loadCuratedLists = async () => {
    try {
      setLoading(true);
      setError(null);
      const lists = await enhancedListsService.getCuratedLists();
      setCuratedLists(lists);
    } catch (err) {
      console.error('Error loading curated lists:', err);
      setError('Failed to load curated lists');
      // Fallback to mock data if there's an error
      setCuratedLists(mockCuratedListsData.map(list => ({
        ...list,
        user_id: undefined,
        is_default: false,
        visibility: 'curated' as const,
        auto_generated: false,
        created_at: new Date().toISOString(),
        is_curated: true,
        places: [],
        place_count: list.placeCount,
        publisher_name: list.curator,
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleHelpMeDecide = () => {
    navigation.navigate('Recommendations');
  };

  const handleNavigateToList = (listId: string, listName: string, listType: 'user' | 'smart' | 'curated') => {
    navigation.navigate('ListDetail', {
      listId,
      listName,
      listType,
    });
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
          Decide
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: DarkTheme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Help Me Decide Section */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
          paddingTop: DarkTheme.spacing.md,
          paddingBottom: DarkTheme.spacing.lg,
        }}>
          <TouchableOpacity
            onPress={handleHelpMeDecide}
            style={{
              backgroundColor: `${DarkTheme.colors.bangkok.gold}25`,
              borderColor: `${DarkTheme.colors.bangkok.gold}50`,
              borderWidth: 1,
              borderRadius: DarkTheme.borderRadius.md,
              padding: DarkTheme.spacing.lg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: DarkTheme.spacing.md,
              ...DarkTheme.shadows.small,
            }}
          >
            <Text style={[
              DarkTheme.typography.headline,
              { 
                color: DarkTheme.colors.semantic.label,
                fontWeight: '600',
                marginBottom: DarkTheme.spacing.xs,
              }
            ]}>
              Help me decide
            </Text>
            <Text style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                textAlign: 'center',
              }
            ]}>
              Get personalized recommendations
            </Text>
          </TouchableOpacity>
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
              ({curatedLists.length})
            </Text>
          </View>

          {loading ? (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: DarkTheme.spacing.xl,
            }}>
              <ActivityIndicator 
                size="large" 
                color={DarkTheme.colors.bangkok.gold} 
              />
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  marginTop: DarkTheme.spacing.sm,
                }
              ]}>
                Loading curated lists...
              </Text>
            </View>
          ) : error ? (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: DarkTheme.spacing.xl,
            }}>
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: DarkTheme.colors.semantic.secondaryLabel,
                  textAlign: 'center',
                }
              ]}>
                {error}
              </Text>
            </View>
          ) : (
            curatedLists.map((list) => (
            <TouchableOpacity
              key={list.id}
              onPress={() => handleNavigateToList(list.id, list.name, 'curated')}
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
                          }
                        ]}
                        numberOfLines={1}
                      >
                        {list.name}
                      </Text>
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
                      {list.place_count} {list.place_count === 1 ? 'place' : 'places'} • {list.publisher_name || 'Curated'}
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
          )))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 