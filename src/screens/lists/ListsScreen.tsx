import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Modal, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, List, Zap, Heart, TrendingUp, Clock, MapPin, ChevronRight, Bookmark } from 'lucide-react-native';
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
  listsService, 
  ListWithPlaces
} from '../../services/listsService';
import type { ListsStackScreenProps } from '../../navigation/types';

type ListsScreenProps = ListsStackScreenProps<'Lists'>;

export default function ListsScreen({ navigation }: ListsScreenProps) {
  const { user } = useAuth();
  
  // Track initial mount to prevent duplicate loading
  const isInitialMount = useRef(true);
  
  const [defaultLists, setDefaultLists] = useState<ListWithPlaces[]>([]);
  const [customLists, setCustomLists] = useState<ListWithPlaces[]>([]);
  // Smart lists will be implemented later
  // const [smartLists, setSmartLists] = useState<any[]>([]);
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
        // Reload lists when screen comes into focus
        loadAllLists();
      }
    }, [user])
  );

  const loadAllLists = async (forceRefresh = false) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Load fresh data from API (caching handled internally)
      await loadUserLists();
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
      // Load default lists (Favorites + Want to Go) and custom lists separately
      const defaultListsData = await listsService.getDefaultLists(user.id);
      const customListsData = await listsService.getCustomLists(user.id);
      
      setDefaultLists(defaultListsData);
      setCustomLists(customListsData);
    } catch (error) {
      console.error('Error loading user lists:', error);
      Alert.alert('Error', 'Failed to load user lists');
    }
  };

  // Smart lists will be implemented later
  // const loadSmartLists = async () => {
  //   // Implementation pending
  // };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllLists(true); // Force refresh from API
    setRefreshing(false);
  };

  const handleNavigateToList = (listId: string, listName: string, isEditable = true) => {
    navigation.navigate('ListDetail', {
      listId,
      listName,
      listType: 'user',
      isEditable,
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
      const newList = await listsService.createList(
        user.id,
        listData.name,
        {
          description: listData.description,
          visibility: 'private', // Default to private
          icon: listData.icon,
          color: listData.color,
        }
      );

      // Reload lists to get the complete data with places
      await loadUserLists();
      
      setShowCreateModal(false);
      Alert.alert('Success', `"${listData.name}" list created!`);
    } catch (error) {
      console.error('Error creating list:', error);
      Alert.alert('Error', 'Failed to create list');
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
              await listsService.deleteList(listId);
              await loadUserLists();
              Alert.alert('Success', 'List deleted');
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Error', 'Failed to delete list');
            }
          }
        }
      ]
    );
  };

  const handleEditList = (listId: string) => {
    // Look for the list in both default and custom lists
    const allLists = [...defaultLists, ...customLists];
    const listToEdit = allLists.find(list => list.id === listId);
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



  // Get specific default lists
  const favoritesList = defaultLists.find(list => list.default_list_type === 'favorites');
  const wantToGoList = defaultLists.find(list => list.default_list_type === 'want_to_go');

  // Convert custom lists to ListItemProps format
  const customListsWithHandlers: ListItemProps[] = customLists.map(list => ({
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
        {/* Default Lists Section */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingTop: Spacing.lg,
          marginBottom: Spacing.layout.sectionSpacing,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: Spacing.md,
          }}>
            {/* Favorites List */}
            {favoritesList && (
              <TouchableOpacity
                onPress={() => handleNavigateToList(favoritesList.id, favoritesList.name, false)}
                activeOpacity={0.7}
                style={{ flex: 1 }}
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
                          color: '#EF4444',
                          fontSize: 15,
                        }}>
                          Favorites
                        </Typography>
                      </View>
                      <SecondaryText style={{ fontWeight: '600', fontSize: 12 }}>
                        {favoritesList.place_count} {favoritesList.place_count === 1 ? 'place' : 'places'}
                      </SecondaryText>
                    </View>
                    <ChevronRight 
                      size={18} 
                      color={Colors.neutral[400]}
                      strokeWidth={2}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            )}

            {/* Want to Go List */}
            {wantToGoList && (
              <TouchableOpacity
                onPress={() => handleNavigateToList(wantToGoList.id, wantToGoList.name, false)}
                activeOpacity={0.7}
                style={{ flex: 1 }}
              >
                <Card 
                  padding="md"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: '#10B981',
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
                        <Bookmark 
                          size={Spacing.iconSize.sm} 
                          color="#10B981"
                          fill="#10B981"
                          strokeWidth={2}
                        />
                        <Typography variant="headline" style={{ 
                          marginLeft: Spacing.xs,
                          fontWeight: '600',
                          color: '#10B981',
                          fontSize: 15,
                        }}>
                          Want to Go
                        </Typography>
                      </View>
                      <SecondaryText style={{ fontWeight: '600', fontSize: 12 }}>
                        {wantToGoList.place_count} {wantToGoList.place_count === 1 ? 'place' : 'places'}
                      </SecondaryText>
                    </View>
                    <ChevronRight 
                      size={18} 
                      color={Colors.neutral[400]}
                      strokeWidth={2}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* My Lists Section */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
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

          {/* Custom Lists */}
          {customListsWithHandlers.length > 0 ? (
            <View>
              {customListsWithHandlers.map((list) => (
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
                  No custom lists yet. Create lists to organize your places!
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