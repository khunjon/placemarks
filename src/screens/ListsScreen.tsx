import React, { useState, useEffect } from 'react';
import { View, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, List, Zap } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Title3, 
  Body, 
  SecondaryText,
  PrimaryButton,
  Card,
  ElevatedCard,
  RoundedSearchBar
} from '../components/common';
import ListItem, { ListItemProps } from '../components/lists/ListItem';
import CreateListScreen from './CreateListScreen';
import { useAuth } from '../services/auth-context';
import { listService, ListWithPlaceCount } from '../services/lists';
import type { ListsStackScreenProps } from '../navigation/types';

type ListsScreenProps = ListsStackScreenProps<'Lists'>;

export default function ListsScreen({ navigation }: ListsScreenProps) {
  const { user } = useAuth();
  const [userLists, setUserLists] = useState<ListWithPlaceCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load user's lists on component mount
  useEffect(() => {
    if (user) {
      loadUserLists();
    }
  }, [user]);

  // Refresh data when screen comes into focus (e.g., returning from EditListScreen)
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadUserLists();
      }
    }, [user])
  );

  const loadUserLists = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const lists = await listService.getUserLists(user.id);
      
      // Check if Favorites list exists, if not create it
      const hasFavorites = lists.some(list => list.list_type === 'favorites');
      if (!hasFavorites) {
        try {
          await listService.createList({
            user_id: user.id,
            name: 'Favorites',
            description: 'Your favorite places in Bangkok',
            type: 'user',
            list_type: 'favorites',
            icon: 'heart',
            color: '#EF4444', // Red color for favorites
            is_public: false,
          });
          
          // Reload lists to include the new Favorites list
          const updatedLists = await listService.getUserLists(user.id);
          setUserLists(updatedLists);
          // Show a toast notification that Favorites list was created
          // TODO: Add toast notification here if needed
        } catch (createError) {
          console.error('Error creating Favorites list:', createError);
          setUserLists(lists); // Use original lists if creation fails
        }
      } else {
        setUserLists(lists);
      }
    } catch (error) {
      console.error('Error loading user lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToList = (listId: string, listName: string, listType: 'user' | 'auto', isEditable: boolean = false) => {
    navigation.navigate('ListDetail', {
      listId,
      listName,
      listType,
      isEditable,
    });
  };

  const handleCreateList = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleSaveNewList = async (listData: { name: string; description: string; icon: string; color: string }) => {
    if (!user?.id) return;
    
    try {
      const newList = await listService.createList({
        user_id: user.id,
        name: listData.name,
        description: listData.description,
        type: 'user',
        list_type: 'general',
        icon: listData.icon,
        color: listData.color,
        is_public: false,
      });

      // Reload lists to get updated data
      await loadUserLists();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await listService.deleteList(listId);
      await loadUserLists(); // Reload lists
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const handleEditList = (listId: string) => {
    // Find the list data to get the name and other details
    const listToEdit = userLists.find(list => list.id === listId);
    if (listToEdit) {
      navigation.navigate('EditList', {
        listId: listToEdit.id,
        listName: listToEdit.name,
        listDescription: listToEdit.description || '',
        listIcon: listToEdit.icon || 'heart',
        listType: listToEdit.list_type || 'general',
      });
    }
  };

  // Convert ListWithPlaceCount to ListItemProps with handlers
  const userListsWithHandlers: ListItemProps[] = userLists
    .filter(list => list.type === 'user')
    .map(list => ({
      id: list.id,
      name: list.name,
      type: (list.type || 'user') as 'user' | 'auto',
      listType: (list.list_type || 'general') as ListItemProps['listType'],
      placeCount: list.place_count,
      icon: list.icon,
      color: list.color,
      previewPlaces: [], // Will be populated later if needed
      isEditable: true,
      onPress: () => handleNavigateToList(list.id, list.name, (list.type || 'user') as 'user' | 'auto', true),
      onDelete: list.list_type === 'favorites' ? undefined : () => handleDeleteList(list.id),
      onEdit: () => handleEditList(list.id),
    }))
    .sort((a, b) => {
      // Pin Favorites list to the top
      if (a.listType === 'favorites') return -1;
      if (b.listType === 'favorites') return 1;
      // Sort others alphabetically
      return a.name.localeCompare(b.name);
    });

  // Auto-generated lists (filtered from the same data)
  const autoListsWithHandlers: ListItemProps[] = userLists
    .filter(list => list.type === 'auto')
    .map(list => ({
      id: list.id,
      name: list.name,
      type: (list.type || 'auto') as 'user' | 'auto',
      listType: (list.list_type || 'general') as ListItemProps['listType'],
      placeCount: list.place_count,
      icon: list.icon,
      color: list.color,
      previewPlaces: [], // Will be populated later if needed
      isEditable: false,
      onPress: () => handleNavigateToList(list.id, list.name, (list.type || 'auto') as 'user' | 'auto', false),
    }));



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
      >
        {/* Search Bar */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingTop: Spacing.md,
          paddingBottom: Spacing.sm,
        }}>
          <RoundedSearchBar
            placeholder="Search your lists..."
            value=""
            onChangeText={() => {}}
            onClear={() => {}}
          />
        </View>

        {/* Your Lists Section */}
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
              Your Lists
            </Title3>
          </View>

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
                  No custom lists yet
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

          <SecondaryText style={{ marginBottom: Spacing.md }}>
            Automatically generated based on your activity
          </SecondaryText>

                     <View>
             {autoListsWithHandlers.map((list) => (
               <ListItem
                 key={list.id}
                 {...list}
               />
             ))}
           </View>
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