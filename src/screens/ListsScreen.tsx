import React, { useState, useEffect } from 'react';
import { View, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  ElevatedCard 
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

  const loadUserLists = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const lists = await listService.getUserLists(user.id);
      setUserLists(lists);
    } catch (error) {
      console.error('Error loading lists:', error);
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
    if (!user) return;
    
    try {
      // Create new list in database
      const newList = await listService.createList({
        user_id: user.id,
        name: listData.name,
        description: listData.description || undefined,
        type: 'user',
        list_type: 'general', // Default type
        icon: listData.icon,
        color: listData.color,
        is_public: false,
      });

      // Reload lists to get updated data
      await loadUserLists();
      setShowCreateModal(false);
      console.log('New list created:', newList);
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await listService.deleteList(listId);
      await loadUserLists(); // Reload lists
      console.log('List deleted:', listId);
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
      });
    }
  };

  // Convert ListWithPlaceCount to ListItemProps with handlers
  const userListsWithHandlers: ListItemProps[] = userLists
    .filter(list => list.type === 'user')
    .map(list => ({
      id: list.id,
      name: list.name,
      type: list.type,
      listType: list.list_type as ListItemProps['listType'],
      placeCount: list.place_count,
      previewPlaces: [], // Will be populated later if needed
      isEditable: true,
      onPress: () => handleNavigateToList(list.id, list.name, list.type, true),
      onDelete: () => handleDeleteList(list.id),
      onEdit: () => handleEditList(list.id),
    }));

  // Auto-generated lists (filtered from the same data)
  const autoListsWithHandlers: ListItemProps[] = userLists
    .filter(list => list.type === 'auto')
    .map(list => ({
      id: list.id,
      name: list.name,
      type: list.type,
      listType: list.list_type as ListItemProps['listType'],
      placeCount: list.place_count,
      previewPlaces: [], // Will be populated later if needed
      isEditable: false,
      onPress: () => handleNavigateToList(list.id, list.name, list.type, false),
    }));

  const totalUserLists = userListsWithHandlers.length;
  const totalAutoLists = autoListsWithHandlers.length;
  const totalPlaces = [...userListsWithHandlers, ...autoListsWithHandlers].reduce((sum, list) => sum + list.placeCount, 0);

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
        {/* Stats Dashboard */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingTop: Spacing.lg,
          paddingBottom: Spacing.md,
        }}>
          <ElevatedCard padding="lg">
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}>
              <View style={{ alignItems: 'center' }}>
                <Typography variant="title2" color="brand" style={{ fontWeight: 'bold' }}>
                  {totalUserLists + totalAutoLists}
                </Typography>
                <SecondaryText style={{ fontSize: 12 }}>
                  Total Lists
                </SecondaryText>
              </View>
              
              <View style={{ alignItems: 'center' }}>
                <Typography variant="title2" color="brand" style={{ fontWeight: 'bold' }}>
                  {totalPlaces}
                </Typography>
                <SecondaryText style={{ fontSize: 12 }}>
                  Total Places
                </SecondaryText>
              </View>
              
              <View style={{ alignItems: 'center' }}>
                <Typography variant="title2" color="brand" style={{ fontWeight: 'bold' }}>
                  {totalUserLists}
                </Typography>
                <SecondaryText style={{ fontSize: 12 }}>
                  Custom Lists
                </SecondaryText>
              </View>
            </View>
          </ElevatedCard>
        </View>

        {/* Your Lists Section */}
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