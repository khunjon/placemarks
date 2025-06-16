import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, User, Zap, AlertCircle } from 'lucide-react-native';
import { DarkTheme } from '../constants/theme';
import ListCard, { ListCardProps } from '../components/lists/ListCard';
import type { DecideStackScreenProps } from '../navigation/types';

type DecideScreenProps = DecideStackScreenProps<'Decide'>;

// Mock data for user lists - will be updated with navigation handlers in the component
const mockUserListsData = [
  {
    id: '1',
    name: 'Favorites',
    type: 'user' as const,
    listType: 'favorites' as const,
    placeCount: 12,
    previewPlaces: ['Chatuchak Weekend Market', 'Wat Pho Temple', 'Siam Paragon'],
  },
  {
    id: '2',
    name: 'Coffee Spots',
    type: 'user' as const,
    listType: 'coffee' as const,
    placeCount: 8,
    previewPlaces: ['Café Tartine', 'Blue Bottle Coffee', 'Roast Coffee & Eatery'],
  },
  {
    id: '3',
    name: 'Date Night',
    type: 'user' as const,
    listType: 'date' as const,
    placeCount: 6,
    previewPlaces: ['Rooftop Bar at Lebua', 'Gaggan Anand', 'Jim Thompson House'],
  },
  {
    id: '4',
    name: 'Work Spots',
    type: 'user' as const,
    listType: 'work' as const,
    placeCount: 5,
    previewPlaces: ['Central Embassy', 'Terminal 21', 'EmQuartier'],
  },
];

// Mock data for smart lists - will be updated with navigation handlers in the component
const mockSmartListsData = [
  {
    id: '5',
    name: 'Most Visited',
    type: 'smart' as const,
    listType: 'visited' as const,
    placeCount: 15,
    previewPlaces: ['Siam Paragon', 'Chatuchak Market', 'MBK Center'],
  },
  {
    id: '6',
    name: 'Highly Rated',
    type: 'smart' as const,
    listType: 'rated' as const,
    placeCount: 20,
    previewPlaces: ['Wat Pho Temple', 'Grand Palace', 'Gaggan Anand'],
  },
  {
    id: '7',
    name: 'Recent Check-ins',
    type: 'smart' as const,
    listType: 'recent' as const,
    placeCount: 10,
    previewPlaces: ['Blue Elephant Restaurant', 'Lumpini Park', 'Café Tartine'],
  },
];

export default function DecideScreen({ navigation }: DecideScreenProps) {
  const handleNavigateToList = (listId: string, listName: string, listType: 'user' | 'smart') => {
    navigation.navigate('ListDetail', {
      listId,
      listName,
      listType,
    });
  };

  // Convert data to ListCardProps with navigation handlers
  const mockUserLists: ListCardProps[] = mockUserListsData.map(list => ({
    ...list,
    onPress: () => handleNavigateToList(list.id, list.name, list.type),
  }));

  const mockSmartLists: ListCardProps[] = mockSmartListsData.map(list => ({
    ...list,
    onPress: () => handleNavigateToList(list.id, list.name, list.type),
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
        {/* AI Suggestions Coming Soon Card */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
          paddingTop: DarkTheme.spacing.lg,
          paddingBottom: DarkTheme.spacing.md,
        }}>
          <View style={{
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderColor: DarkTheme.colors.semantic.separator,
            borderWidth: 1,
            borderRadius: DarkTheme.borderRadius.lg,
            padding: DarkTheme.spacing.lg,
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Subtle gradient overlay effect */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 60,
              backgroundColor: `${DarkTheme.colors.bangkok.gold}08`,
              borderTopLeftRadius: DarkTheme.borderRadius.lg,
              borderTopRightRadius: DarkTheme.borderRadius.lg,
            }} />
            
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: `${DarkTheme.colors.bangkok.gold}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: DarkTheme.spacing.md,
            }}>
              <Sparkles 
                size={28} 
                color={DarkTheme.colors.bangkok.gold}
                strokeWidth={2}
              />
            </View>
            
            <Text style={[
              DarkTheme.typography.title2,
              { 
                color: DarkTheme.colors.semantic.label,
                fontWeight: '600',
                marginBottom: DarkTheme.spacing.sm,
                textAlign: 'center',
              }
            ]}>
              AI Suggestions Coming Soon
            </Text>
            
            <Text style={[
              DarkTheme.typography.subhead,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: DarkTheme.spacing.sm,
              }
            ]}>
              Get personalized place recommendations based on your preferences, check-in history, and current mood.
            </Text>
            
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: `${DarkTheme.colors.bangkok.gold}15`,
              paddingHorizontal: DarkTheme.spacing.sm,
              paddingVertical: DarkTheme.spacing.xs,
              borderRadius: DarkTheme.borderRadius.sm,
            }}>
              <AlertCircle 
                size={14} 
                color={DarkTheme.colors.bangkok.gold}
                strokeWidth={2}
              />
              <Text style={[
                DarkTheme.typography.caption1,
                { 
                  color: DarkTheme.colors.bangkok.gold,
                  marginLeft: DarkTheme.spacing.xs,
                  fontWeight: '600',
                }
              ]}>
                Feature Preview
              </Text>
            </View>
          </View>
        </View>

        {/* Your Lists Section */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
          marginBottom: DarkTheme.spacing.lg,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: DarkTheme.spacing.md,
          }}>
            <User 
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
              Your Lists
            </Text>
            <Text style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.tertiaryLabel,
                marginLeft: DarkTheme.spacing.sm,
              }
            ]}>
              ({mockUserLists.length})
            </Text>
          </View>

          {mockUserLists.map((list) => (
            <ListCard
              key={list.id}
              {...list}
            />
          ))}
        </View>

        {/* Smart Lists Section */}
        <View style={{
          paddingHorizontal: DarkTheme.spacing.lg,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: DarkTheme.spacing.md,
          }}>
            <Zap 
              size={20} 
              color={DarkTheme.colors.accent.blue}
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
              Smart Lists
            </Text>
            <Text style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.tertiaryLabel,
                marginLeft: DarkTheme.spacing.sm,
              }
            ]}>
              ({mockSmartLists.length})
            </Text>
          </View>

          <Text style={[
            DarkTheme.typography.caption1,
            { 
              color: DarkTheme.colors.semantic.tertiaryLabel,
              marginBottom: DarkTheme.spacing.md,
              fontStyle: 'italic',
            }
          ]}>
            Automatically generated based on your activity
          </Text>

          {mockSmartLists.map((list) => (
            <ListCard
              key={list.id}
              {...list}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 