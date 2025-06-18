import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Modal, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, List, Zap, Heart, TrendingUp, Clock, MapPin, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { DarkTheme } from '../../constants/theme';
import { 
  Typography, 
  Title3, 
  Body, 
  SecondaryText,
  PrimaryButton,
  SecondaryButton,
  Card,
  ElevatedCard,
  LoadingState,
  EmptyState
} from '../../components/common';
import ListItem, { ListItemProps } from '../../components/lists/ListItem';
import CreateListScreen from './CreateListScreen';
import { useAuth } from '../../services/auth-context';
import { 
  enhancedListsService, 
  ListWithPlaces, 
  EnhancedList,
  ListError,
  PlaceError 
} from '../../services/listsService';
import { ListsCache } from '../../services/listsCache';
import type { ListsStackScreenProps } from '../../navigation/types';

type ListsScreenProps = ListsStackScreenProps<'Lists'>;

export default function ListsScreen({ navigation }: ListsScreenProps) {
  const { user } = useAuth();
  
  // Track initial mount to prevent duplicate loading
  const isInitialMount = useRef(true);
  
  const [userLists, setUserLists] = useState<ListWithPlaces[]>([]);
  const [smartLists, setSmartLists] = useState<EnhancedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);


  // Initial load of user's lists
  useEffect(() => {
    if (user) {
      loadAllLists();
    }
  }, [user]);

  // Refresh data when screen comes into focus (but not on initial mount)
  useFocusEffect(
    React.useCallback(() => {
      // Skip the first focus effect call (initial mount)
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      if (user) {
        console.log('ListsScreen focused, checking cache...');
        // Only reload if cache is invalid or missing
        ListsCache.hasCache(user.id).then(hasValidCache => {
          if (!hasValidCache) {
            console.log('No valid cache, reloading lists...');
            loadAllLists();
          } else {
            console.log('Valid cache exists, skipping reload');
          }
        });
      }
    }, [user])
  );

  const loadAllLists = async (forceRefresh = false) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Try to load from cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = await ListsCache.getCachedLists(user.id);
        if (cachedData) {
      
          setUserLists(cachedData.userLists);
          setSmartLists(cachedData.smartLists);
          setLoading(false);
          return;
        }
      }
      
      // Load fresh data from API
  
      await Promise.all([
        loadUserLists(),
        loadSmartLists()
      ]);
    } catch (error) {
      console.error('Error loading lists:', error);
      Alert.alert('Error', 'Failed to load your lists');
    } finally {
      setLoading(false);
    }
  };

  const loadUserLists = async () => {
    if (!user?.id) return;
    
    try {
      // Ensure default favorites list exists
      await enhancedListsService.createDefaultFavoritesList(user.id);
      
      // Load all user lists
      const lists = await enhancedListsService.getUserLists(user.id);
      setUserLists(lists);
      
      // Save to cache
      await ListsCache.saveLists(lists, smartLists, user.id);
    } catch (error) {
      console.error('Error loading user lists:', error);
      if (error instanceof ListError) {
        Alert.alert('Error', error.message);
      }
    }
  };

  const loadSmartLists = async () => {
    if (!user?.id) return;
    
    try {
      // For now, we'll just track if Most Visited exists
      // In the future, this could query for actual smart lists
      setSmartLists([]); // Will be populated when smart lists are generated
    } catch (error) {
      console.error('Error loading smart lists:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllLists(true); // Force refresh from API
    setRefreshing(false);
  };

  const handleNavigateToList = (listId: string, listName: string) => {
    navigation.navigate('ListDetail', {
      listId,
      listName,
      listType: 'user',
      isEditable: true,
    });
  };

  const handleCreateList = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleSaveNewList = async (listData: { 
    name: string; 
    description: string; 
    icon: string; 
    color: string;
  }) => {
    if (!user?.id) return;
    
    try {
      const newList = await enhancedListsService.createList({
        user_id: user.id,
        name: listData.name,
        description: listData.description,
        privacy_level: 'private', // Default to private
        icon: listData.icon,
        color: listData.color,
      });

      // Reload lists to get the complete data with places
      await loadUserLists();
      
      setShowCreateModal(false);
      Alert.alert('Success', `"${listData.name}" list created!`);
    } catch (error) {
      console.error('Error creating list:', error);
      if (error instanceof ListError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to create list');
      }
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
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
              
              // Update cache optimistically
              if (user?.id) {
                await ListsCache.removeListFromCache(listId, user.id);
              }
              
              await loadUserLists();
              Alert.alert('Success', 'List deleted');
            } catch (error) {
              console.error('Error deleting list:', error);
              if (error instanceof ListError) {
                Alert.alert('Error', error.message);
              } else {
                Alert.alert('Error', 'Failed to delete list');
              }
            }
          }
        }
      ]
    );
  };

  const handleEditList = (listId: string) => {
    const listToEdit = userLists.find(list => list.id === listId);
    if (listToEdit) {
      navigation.navigate('EditList', {
        listId: listToEdit.id,
        listName: listToEdit.name,
        listDescription: listToEdit.description || '',
        listIcon: listToEdit.icon || 'list',
        listType: listToEdit.list_type || 'general',
      });
    }
  };



  // Separate favorites from other user lists
  const favoritesList = userLists.find(list => list.is_default);
  const customLists = userLists.filter(list => !list.is_default);

  // Convert to ListItemProps format
  const userListsWithHandlers: ListItemProps[] = customLists.map(list => ({
    id: list.id,
    name: list.name,
    type: 'user' as const,
    listType: 'general' as const,
    placeCount: list.place_count,
    icon: list.icon,
    color: list.color,
    previewPlaces: list.places.slice(0, 3).map(p => p.place.name),
    isEditable: true,
    onPress: () => handleNavigateToList(list.id, list.name),
    onDelete: () => handleDeleteList(list.id, list.name),
    onEdit: () => handleEditList(list.id),
  }));

  if (loading) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary 
      }}>
        <LoadingState message="Loading your lists..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
      }}>
        <Typography variant="largeTitle" style={{ fontWeight: 'bold' }}>
          My Lists
        </Typography>

        <PrimaryButton
          title="Create List"
          onPress={handleCreateList}
          icon={Plus}
          size="sm"
        />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* My Lists Section */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingTop: Spacing.lg,
          marginBottom: Spacing.layout.sectionSpacing,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: Spacing.md,
          }}>
            <List 
              size={Spacing.iconSize.md} 
              color={Colors.primary[500]}
              strokeWidth={2}
            />
            <Title3 style={{ marginLeft: Spacing.sm }}>
              My Lists
            </Title3>
          </View>

          {/* Favorites List - Always shown first */}
          {favoritesList && (
            <View style={{ marginBottom: Spacing.md }}>
              <TouchableOpacity
                onPress={() => handleNavigateToList(favoritesList.id, favoritesList.name)}
                activeOpacity={0.7}
              >
                <Card 
                  padding="md"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: '#EF4444',
                  }}
                >
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <View style={{ flex: 1 }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: Spacing.xs,
                      }}>
                        <Heart 
                          size={Spacing.iconSize.sm} 
                          color="#EF4444"
                          fill="#EF4444"
                          strokeWidth={2}
                        />
                        <Typography variant="headline" style={{ 
                          marginLeft: Spacing.xs,
                          fontWeight: '600',
                          color: '#EF4444'
                        }}>
                          Favorites
                        </Typography>
                      </View>
                      <Body color="secondary">
                        {favoritesList.place_count} places • Your favorite spots
                      </Body>
                    </View>
                    <ChevronRight 
                      size={20} 
                      color={Colors.neutral[400]}
                      strokeWidth={2}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            </View>
          )}

          {/* Custom Lists */}
          {userListsWithHandlers.length > 0 ? (
            <View>
              {userListsWithHandlers.map((list) => (
                <ListItem
                  key={list.id}
                  {...list}
                />
              ))}
            </View>
          ) : (
            <ElevatedCard padding="lg">
              <View style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
                <Body color="secondary" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>
                  {favoritesList?.place_count === 0 
                    ? "Start by adding places to your Favorites, then create custom lists to organize them!"
                    : "No custom lists yet"
                  }
                </Body>
                <PrimaryButton
                  title="Create Your First List"
                  onPress={handleCreateList}
                  icon={Plus}
                  size="sm"
                />
              </View>
            </ElevatedCard>
          )}
        </View>

        {/* Smart Lists Section */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: Spacing.sm,
          }}>
            <Zap 
              size={Spacing.iconSize.md} 
              color={Colors.accent.yellow}
              strokeWidth={2}
            />
            <Title3 style={{ marginLeft: Spacing.sm }}>
              Smart Lists
            </Title3>
          </View>



                    {/* Most Visited Smart List */}
          <TouchableOpacity
            onPress={() => {
              // TODO: Navigate to Most Visited list when implemented
              Alert.alert('Coming Soon', 'Smart lists will be available soon!');
            }}
            activeOpacity={0.7}
          >
            <Card padding="md" style={{ marginBottom: Spacing.md }}>
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
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: Spacing.sm,
                    backgroundColor: '#10B98120',
                  }}>
                    <TrendingUp 
                      size={20} 
                      color="#10B981"
                      strokeWidth={2}
                    />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Typography variant="headline" style={{ 
                      fontWeight: '600',
                      marginBottom: 2,
                    }}>
                      Most Visited
                    </Typography>
                    <Body color="secondary">
                      Places you visit most
                    </Body>
                  </View>
                </View>
                
                <ChevronRight 
                  size={20} 
                  color={DarkTheme.colors.semantic.tertiaryLabel}
                  strokeWidth={2}
                />
              </View>
            </Card>
          </TouchableOpacity>

                    {/* Placeholder Smart Lists */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Coming Soon', 'This smart list will be available soon!');
            }}
            activeOpacity={0.7}
          >
            <Card padding="md" style={{ marginBottom: Spacing.md, opacity: 0.6 }}>
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
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: Spacing.sm,
                    backgroundColor: `${Colors.neutral[500]}20`,
                  }}>
                    <Clock 
                      size={20} 
                      color={Colors.neutral[500]}
                      strokeWidth={2}
                    />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Typography variant="headline" style={{ 
                      fontWeight: '600',
                      color: Colors.neutral[500],
                      marginBottom: 2,
                    }}>
                      Try Next
                    </Typography>
                    <Body color="secondary">
                      Places saved but never visited
                    </Body>
                  </View>
                </View>
                
                <ChevronRight 
                  size={20} 
                  color={DarkTheme.colors.semantic.tertiaryLabel}
                  strokeWidth={2}
                />
              </View>
            </Card>
          </TouchableOpacity>

                    <TouchableOpacity
            onPress={() => {
              Alert.alert('Coming Soon', 'This smart list will be available soon!');
            }}
            activeOpacity={0.7}
          >
            <Card padding="md" style={{ opacity: 0.6 }}>
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
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: Spacing.sm,
                    backgroundColor: `${Colors.neutral[500]}20`,
                  }}>
                    <MapPin 
                      size={20} 
                      color={Colors.neutral[500]}
                      strokeWidth={2}
                    />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Typography variant="headline" style={{ 
                      fontWeight: '600',
                      color: Colors.neutral[500],
                      marginBottom: 2,
                    }}>
                      Weekend Spots
                    </Typography>
                    <Body color="secondary">
                      Your favorite weekend destinations
                    </Body>
                  </View>
                </View>
                
                <ChevronRight 
                  size={20} 
                  color={DarkTheme.colors.semantic.tertiaryLabel}
                  strokeWidth={2}
                />
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create List Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseCreateModal}
      >
        <CreateListScreen
          onClose={handleCloseCreateModal}
          onSave={handleSaveNewList}
        />
      </Modal>
    </SafeAreaView>
  );
} 