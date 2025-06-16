import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Title2, 
  Body,
  PrimaryButton,
  GhostButton,
  ElevatedCard 
} from '../components/common';
import type { ListsStackScreenProps } from '../navigation/types';

type EditListScreenProps = ListsStackScreenProps<'EditList'>;

export default function EditListScreen({ route, navigation }: EditListScreenProps) {
  const { listId, listName, listDescription = '', listIcon = 'heart' } = route.params;
  
  const [name, setName] = useState(listName);
  const [description, setDescription] = useState(listDescription);
  const [selectedIcon, setSelectedIcon] = useState(listIcon);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    Alert.alert(
      'List Updated',
      `"${name}" has been updated successfully!`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
      }}>
        <GhostButton
          title=""
          onPress={() => navigation.goBack()}
          icon={X}
          size="sm"
        />

        <Title2>Edit List</Title2>

        <PrimaryButton
          title=""
          onPress={handleSave}
          icon={Check}
          size="sm"
          disabled={!name.trim()}
        />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <ElevatedCard padding="lg" style={{ margin: Spacing.layout.screenPadding }}>
          <Body>Editing: {listName}</Body>
          <Body color="secondary" style={{ marginTop: Spacing.sm }}>
            List editing functionality would be implemented here.
          </Body>
        </ElevatedCard>
      </ScrollView>
    </SafeAreaView>
  );
} 