/**
 * EXAMPLE INTEGRATION CODE
 * 
 * This file shows how to integrate the Enhanced Lists Service into your React Native components.
 * Copy and adapt these patterns for your actual implementation.
 * 
 * Required imports for your actual implementation:
 * import { enhancedListsService, ListWithPlaces, PlaceSearchResult } from '../services/listsService';
 * import { useAuth } from '../services/auth-context';
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';

// These would be your actual imports:
// import { enhancedListsService, ListWithPlaces, PlaceSearchResult } from '../services/listsService';
// import { useAuth } from '../services/auth-context';

// Mock types for this example file
interface ListWithPlaces {
  id: string;
  name: string;
  is_default?: boolean;
  privacy_level: string;
  color?: string;
  description?: string;
  place_count: number;
  places: any[];
}

interface PlaceSearchResult {
  google_place_id: string;
  name: string;
  address: string;
  rating?: number;
  price_level?: number;
  photos?: string[];
}

// Mock service for this example
const enhancedListsService = {
  getUserLists: async (userId: string) => [] as ListWithPlaces[],
  createDefaultFavoritesList: async (userId: string) => ({} as any),
  createList: async (data: any) => ({} as any),
  deleteList: async (listId: string) => {},
  searchPlacesForList: async (query: string, location?: any, limit?: number) => [] as PlaceSearchResult[],
  addPlaceToList: async (listId: string, placeData: any, options?: any) => {},
  removePlaceFromList: async (listId: string, placeId: string) => {},
  updatePlaceInList: async (listId: string, placeId: string, updates: any) => {},
  generateMostVisitedList: async (userId: string) => [] as string[],
  createOrUpdateSmartList: async (userId: string, config: any) => ({} as any),
};

// Mock auth hook
const useAuth = () => ({ user: { id: 'mock-user-id' } });

interface ListsScreenProps {
  navigation: any;
}

export const ListsScreen: React.FC<ListsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [lists, setLists] = useState<ListWithPlaces[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserLists();
      // Create default favorites list if this is a new user
      createDefaultFavoritesIfNeeded();
    }
  }, [user]);

  const loadUserLists = async () => {
    try {
      setLoading(true);
      const userLists = await enhancedListsService.getUserLists(user!.id);
      setLists(userLists);
    } catch (error) {
      console.error('Error loading lists:', error);
      Alert.alert('Error', 'Failed to load your lists');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultFavoritesIfNeeded = async () => {
    try {
      // Check if user already has a favorites list
      const hasFavorites = lists.some(list => list.is_default);
      if (!hasFavorites) {
        await enhancedListsService.createDefaultFavoritesList(user!.id);
        loadUserLists(); // Refresh lists
      }
    } catch (error) {
      console.error('Error creating default favorites:', error);
    }
  };

  const createNewList = async () => {
    Alert.prompt(
      'New List',
      'Enter a name for your new list:',
      async (listName) => {
        if (listName && listName.trim()) {
          try {
            await enhancedListsService.createList({
              user_id: user!.id,
              name: listName.trim(),
              description: '',
              privacy_level: 'private',
              icon: 'list',
              color: '#6B7280'
            });
            loadUserLists();
          } catch (error) {
            console.error('Error creating list:', error);
            Alert.alert('Error', 'Failed to create list');
          }
        }
      }
    );
  };

  const deleteList = async (listId: string, listName: string) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${listName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await enhancedListsService.deleteList(listId);
              loadUserLists();
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Error', 'Failed to delete list');
            }
          }
        }
      ]
    );
  };

  const searchPlaces = async (query: string) => {
    try {
      if (query.trim().length > 2) {
        const results = await enhancedListsService.searchPlacesForList(
          query,
          { latitude: 13.7563, longitude: 100.5018 }, // Bangkok center
          10
        );
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
    }
  };

  const addPlaceToList = async (listId: string, place: PlaceSearchResult) => {
    try {
      await enhancedListsService.addPlaceToList(
        listId,
        {
          google_place_id: place.google_place_id,
          name: place.name,
          address: place.address,
          google_rating: place.rating,
          price_level: place.price_level,
          photos_urls: place.photos
        },
        {
          notes: '',
          personal_rating: undefined,
          sort_order: 0
        }
      );
      
      Alert.alert('Success', `Added "${place.name}" to your list!`);
      loadUserLists();
      setSearchQuery('');
      setSearchResults([]);
      setSelectedListId(null);
    } catch (error) {
      console.error('Error adding place to list:', error);
      Alert.alert('Error', 'Failed to add place to list');
    }
  };

  const generateMostVisitedList = async () => {
    try {
      const smartListConfig = {
        name: "Most Visited",
        description: "Places you visit most often",
        icon: "trending-up",
        color: "#10B981",
        generator: (userId: string) => enhancedListsService.generateMostVisitedList(userId)
      };

      await enhancedListsService.createOrUpdateSmartList(user!.id, smartListConfig);
      loadUserLists();
      Alert.alert('Success', 'Most Visited list updated!');
    } catch (error) {
      console.error('Error generating smart list:', error);
      Alert.alert('Error', 'Failed to generate Most Visited list');
    }
  };

  const renderListItem = ({ item }: { item: ListWithPlaces }) => (
    <View style={{ 
      padding: 16, 
      marginVertical: 8, 
      backgroundColor: 'white', 
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: item.color || '#333' }}>
            {item.is_default ? '⭐ ' : ''}{item.name}
          </Text>
          <Text style={{ color: '#666', marginTop: 4 }}>
            {item.place_count} places • {item.privacy_level}
          </Text>
          {item.description && (
            <Text style={{ color: '#888', marginTop: 4, fontSize: 14 }}>
              {item.description}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ListDetail', { listId: item.id })}
            style={{ padding: 8, marginLeft: 8 }}
          >
            <Text style={{ color: '#007AFF' }}>View</Text>
          </TouchableOpacity>
          {!item.is_default && (
            <TouchableOpacity
              onPress={() => deleteList(item.id, item.name)}
              style={{ padding: 8, marginLeft: 8 }}
            >
              <Text style={{ color: '#FF3B30' }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: PlaceSearchResult }) => (
    <TouchableOpacity
      onPress={() => selectedListId && addPlaceToList(selectedListId, item)}
      style={{
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: selectedListId ? 'white' : '#f5f5f5'
      }}
      disabled={!selectedListId}
    >
      <Text style={{ fontSize: 16, fontWeight: '500' }}>{item.name}</Text>
      <Text style={{ color: '#666', fontSize: 14 }}>{item.address}</Text>
      {item.rating && (
        <Text style={{ color: '#888', fontSize: 12 }}>
          ⭐ {item.rating} {item.price_level && `• ${'$'.repeat(item.price_level)}`}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading your lists...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: 'white' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
          My Lists
        </Text>
        
        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={createNewList}
            style={{
              backgroundColor: '#007AFF',
              padding: 12,
              borderRadius: 8,
              flex: 1,
              marginRight: 8
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '500' }}>
              New List
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={generateMostVisitedList}
            style={{
              backgroundColor: '#10B981',
              padding: 12,
              borderRadius: 8,
              flex: 1,
              marginLeft: 8
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '500' }}>
              Most Visited
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Section */}
        <View style={{ marginTop: 16 }}>
          <TextInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchPlaces(text);
            }}
            placeholder="Search places to add to lists..."
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              padding: 12,
              backgroundColor: 'white'
            }}
          />
          
          {/* List Selector for Adding Places */}
          {searchQuery.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                Select a list to add places to:
              </Text>
              <FlatList
                horizontal
                data={lists}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedListId(item.id)}
                    style={{
                      padding: 8,
                      marginRight: 8,
                      backgroundColor: selectedListId === item.id ? '#007AFF' : '#e0e0e0',
                      borderRadius: 16
                    }}
                  >
                    <Text style={{
                      color: selectedListId === item.id ? 'white' : '#333',
                      fontSize: 12
                    }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={{ backgroundColor: 'white', maxHeight: 200 }}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.google_place_id}
            renderItem={renderSearchResult}
          />
        </View>
      )}

      {/* Lists */}
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={renderListItem}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Example List Detail Screen
export const ListDetailScreen: React.FC<{ route: any }> = ({ route }) => {
  const { listId } = route.params;
  const [list, setList] = useState<ListWithPlaces | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadListDetails();
  }, [listId]);

  const loadListDetails = async () => {
    try {
      setLoading(true);
      // You would implement this method in the service
      // const listDetails = await enhancedListsService.getListWithPlaces(listId);
      // setList(listDetails);
    } catch (error) {
      console.error('Error loading list details:', error);
    } finally {
      setLoading(false);
    }
  };

  const removePlaceFromList = async (placeId: string, placeName: string) => {
    Alert.alert(
      'Remove Place',
      `Remove "${placeName}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await enhancedListsService.removePlaceFromList(listId, placeId);
              loadListDetails();
            } catch (error) {
              console.error('Error removing place:', error);
              Alert.alert('Error', 'Failed to remove place');
            }
          }
        }
      ]
    );
  };

  const updatePlaceRating = async (placeId: string, rating: number) => {
    try {
      await enhancedListsService.updatePlaceInList(listId, placeId, {
        personal_rating: rating
      });
      loadListDetails();
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  if (loading || !list) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading list...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 16, backgroundColor: 'white' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{list.name}</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>
          {list.places.length} places
        </Text>
        {list.description && (
          <Text style={{ color: '#888', marginTop: 8 }}>{list.description}</Text>
        )}
      </View>

      <FlatList
        data={list.places}
        keyExtractor={(item) => item.place_id}
        renderItem={({ item }) => (
          <View style={{
            padding: 16,
            marginVertical: 4,
            marginHorizontal: 16,
            backgroundColor: 'white',
            borderRadius: 8
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500' }}>
                  {item.place.name}
                </Text>
                <Text style={{ color: '#666', fontSize: 14 }}>
                  {item.place.address}
                </Text>
                {item.place.google_rating && (
                  <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                    Google: ⭐ {item.place.google_rating}
                  </Text>
                )}
                {item.personal_rating && (
                  <Text style={{ color: '#007AFF', fontSize: 12 }}>
                    Your rating: ⭐ {item.personal_rating}
                  </Text>
                )}
                {item.visit_count && item.visit_count > 0 && (
                  <Text style={{ color: '#10B981', fontSize: 12 }}>
                    Visited {item.visit_count} times
                  </Text>
                )}
                {item.notes && (
                  <Text style={{ color: '#555', fontSize: 14, marginTop: 4, fontStyle: 'italic' }}>
                    "{item.notes}"
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => removePlaceFromList(item.place_id, item.place.name)}
                style={{ padding: 8 }}
              >
                <Text style={{ color: '#FF3B30' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}; 