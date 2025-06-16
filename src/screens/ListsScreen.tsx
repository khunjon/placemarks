import React, { useState } from 'react';
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
import type { ListsStackScreenProps } from '../navigation/types';

// Base list data type without handlers
type ListData = {
  id: string;
  name: string;
  type: 'user' | 'auto';
  listType: 'favorites' | 'coffee' | 'date' | 'work' | 'want_to_try' | 'visited' | 'rated' | 'recent';
  placeCount: number;
  isEditable: boolean;
};

// Mock data for user lists - will be updated with navigation handlers in the component
const initialUserListsData: ListData[] = [
  {
    id: '1',
    name: 'Favorites',
    type: 'user' as const,
    listType: 'favorites' as const,
    placeCount: 12,
    isEditable: true,
  },
  {
    id: '2',
    name: 'Coffee Spots',
    type: 'user' as const,
    listType: 'coffee' as const,
    placeCount: 8,
    isEditable: true,
  },
  {
    id: '3',
    name: 'Date Night',
    type: 'user' as const,
    listType: 'date' as const,
    placeCount: 5,
    isEditable: true,
  },
  {
    id: '4',
    name: 'Work Spots',
    type: 'user' as const,
    listType: 'work' as const,
    placeCount: 15,
    isEditable: true,
  },
  {
    id: '5',
    name: 'Want to Try',
    type: 'user' as const,
    listType: 'want_to_try' as const,
    placeCount: 20,
    isEditable: true,
  },
];

// Mock data for auto-generated lists - will be updated with navigation handlers in the component
const autoListsData: ListData[] = [
  {
    id: 'auto-1',
    name: 'Most Visited',
    type: 'auto' as const,
    listType: 'visited' as const,
    placeCount: 25,
    isEditable: false,
  },
  {
    id: 'auto-2',
    name: 'Highly Rated',
    type: 'auto' as const,
    listType: 'rated' as const,
    placeCount: 18,
    isEditable: false,
  },
  {
    id: 'auto-3',
    name: 'Recent Check-ins',
    type: 'auto' as const,
    listType: 'recent' as const,
    placeCount: 12,
    isEditable: false,
  },
];

type ListsScreenProps = ListsStackScreenProps<'Lists'>;

export default function ListsScreen({ navigation }: ListsScreenProps) {
  const [userLists, setUserLists] = useState(initialUserListsData);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleSaveNewList = (listData: { name: string; description: string; icon: string; color: string }) => {
    // Create new list item
    const newListId = `user-${Date.now()}`;
    const newList: ListData = {
      id: newListId,
      name: listData.name,
      type: 'user',
      listType: 'want_to_try', // Default type, could be determined by icon
      placeCount: 0,
      isEditable: true,
    };

    setUserLists(prev => [...prev, newList]);
    setShowCreateModal(false);
    console.log('New list created:', listData);
  };

  const handleDeleteList = (listId: string) => {
    setUserLists(prev => prev.filter(list => list.id !== listId));
    console.log('List deleted:', listId);
  };

  const handleEditList = (listId: string) => {
    // Find the list data to get the name and other details
    const listToEdit = userLists.find(list => list.id === listId);
    if (listToEdit) {
      navigation.navigate('EditList', {
        listId: listToEdit.id,
        listName: listToEdit.name,
        listDescription: 'Sample list description', // You could store this in the list data
        listIcon: 'heart', // You could store this in the list data
      });
    }
  };

  // Convert ListData to ListItemProps with handlers
  const userListsWithHandlers: ListItemProps[] = userLists.map(list => ({
    ...list,
    onPress: () => handleNavigateToList(list.id, list.name, list.type, list.isEditable),
    onDelete: () => handleDeleteList(list.id),
    onEdit: () => handleEditList(list.id),
  }));

  const autoListsWithHandlers: ListItemProps[] = autoListsData.map(list => ({
    ...list,
    onPress: () => handleNavigateToList(list.id, list.name, list.type, list.isEditable),
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