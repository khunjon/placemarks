import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, ActionSheetIOS, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { 
  Typography, 
  Title2,
  Body, 
  SecondaryText,
  ElevatedCard,
  PrimaryButton,
  OutlineButton,
  LoadingState,
} from '../components/common';
import Toast from '../components/ui/Toast';
import { useAuth } from '../services/auth-context';
import { checkInsService, ThumbsRating, checkInUtils, CheckInWithPlace } from '../services/checkInsService';
import { enhancedListsService, ListWithPlaces } from '../services/listsService';
import { ListsCache } from '../services/listsCache';
import type { CheckInStackScreenProps } from '../navigation/types';

type CheckInDetailScreenProps = CheckInStackScreenProps<'CheckInDetail'>;

export default function CheckInDetailScreen({ navigation, route }: CheckInDetailScreenProps) {
  const { user } = useAuth();
  const { checkInId, placeName } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  
  const [checkIn, setCheckIn] = useState<CheckInWithPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRating, setSelectedRating] = useState<ThumbsRating | null>(null);
  const [comment, setComment] = useState('');
  const [userLists, setUserLists] = useState<ListWithPlaces[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Load check-in details
  useEffect(() => {
    loadCheckInDetails();
    if (user) {
      loadUserLists();
    }
  }, [checkInId, user]);

  const loadCheckInDetails = async () => {
    try {
      setLoading(true);
      
      if (!user) return;
      
      const checkInsByDate = await checkInsService.getUserCheckInsByDate(user.id, 100);
      const allCheckIns = checkInsByDate.flatMap(group => group.checkIns);
      const foundCheckIn = allCheckIns.find(ci => ci.id === checkInId);
      
      if (!foundCheckIn) {
        Alert.alert('Error', 'Check-in not found');
        navigation.goBack();
        return;
      }
      
      setCheckIn(foundCheckIn);
      setSelectedRating(foundCheckIn.rating || null);
      setComment(foundCheckIn.comment || '');
      
    } catch (error) {
      console.error('Error loading check-in details:', error);
      Alert.alert('Error', 'Failed to load check-in details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadUserLists = async () => {
    try {
      if (!user) return;
      const lists = await enhancedListsService.getUserLists(user.id);
      setUserLists(lists.filter((list: any) => list.type === 'user'));
    } catch (error) {
      console.error('Error loading user lists:', error);
    }
  };

  const handleRatingSelect = (rating: ThumbsRating | null) => {
    setSelectedRating(rating);
    setHasUnsavedChanges(true);
  };

  const handleCommentChange = (text: string) => {
    setComment(text);
    setHasUnsavedChanges(true);
  };

  const handleTextInputFocus = () => {
    // Small delay to ensure keyboard animation starts
    setTimeout(() => {
      textInputRef.current?.measureInWindow((x, y, width, height) => {
        // Calculate a more aggressive scroll position
        // Scroll to position the input in the upper third of the visible area
        const keyboardHeight = Platform.OS === 'ios' ? 300 : 250; // Estimated keyboard height
        const targetY = y - keyboardHeight + 150; // More aggressive offset
        
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, targetY), // Ensure we don't scroll to negative values
          animated: true,
        });
      });
    }, 150); // Slightly longer delay for better coordination
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleSaveChanges = async () => {
    if (!checkIn || !user) return;
    
    try {
      setSaving(true);
      
      const updates: any = {};
      if (selectedRating !== checkIn.rating) {
        updates.rating = selectedRating;
      }
      if (comment !== (checkIn.comment || '')) {
        updates.comment = comment.trim() || undefined;
      }
      
      if (Object.keys(updates).length > 0) {
        await checkInsService.updateCheckIn(checkIn.id, user.id, updates);
        setCheckIn(prev => prev ? { ...prev, ...updates } : null);
        setHasUnsavedChanges(false);
        
        // Show success toast and navigate back
        showToast('Changes saved successfully!');
        
        // Navigate back after a short delay to let user see the toast
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
      
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast('Failed to save changes. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToList = () => {
    if (!checkIn || userLists.length === 0) {
      Alert.alert('No Lists', 'Create a list first to add places to it.');
      return;
    }

    const listOptions = userLists.map(list => list.name);
    listOptions.push('Cancel');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: listOptions,
          cancelButtonIndex: listOptions.length - 1,
          title: 'Add to List',
        },
        async (buttonIndex) => {
          if (buttonIndex < userLists.length) {
            const selectedList = userLists[buttonIndex];
            try {
              await enhancedListsService.addPlaceToList(selectedList.id, {
                google_place_id: checkIn.place.google_place_id,
                name: checkIn.place.name,
                address: checkIn.place.address,
                coordinates: checkIn.place.coordinates,
                place_type: checkIn.place.place_type
              });
              
              // Invalidate cache since a place was added to a list
              if (user?.id) {
                await ListsCache.invalidateCache();
              }
              
              Alert.alert('Added', `Added ${checkIn.place.name} to ${selectedList.name}`);
            } catch (error) {
              console.error('Error adding to list:', error);
              Alert.alert('Error', 'Failed to add to list');
            }
          }
        }
      );
    } else {
      Alert.alert(
        'Add to List',
        'Choose a list:',
        [
          ...userLists.map(list => ({
            text: list.name,
            onPress: async () => {
              try {
                await enhancedListsService.addPlaceToList(list.id, {
                  google_place_id: checkIn.place.google_place_id,
                  name: checkIn.place.name,
                  address: checkIn.place.address,
                  coordinates: checkIn.place.coordinates,
                  place_type: checkIn.place.place_type
                });
                
                // Invalidate cache since a place was added to a list
                if (user?.id) {
                  await ListsCache.invalidateCache();
                }
                
                Alert.alert('Added', `Added ${checkIn.place.name} to ${list.name}`);
              } catch (error) {
                console.error('Error adding to list:', error);
                Alert.alert('Error', 'Failed to add to list');
              }
            },
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleDeleteCheckIn = () => {
    Alert.alert(
      'Delete Check-in',
      'Are you sure you want to delete this check-in? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!checkIn || !user) return;
              
              await checkInsService.deleteCheckIn(checkIn.id, user.id);
              
              // Show success toast and navigate back
              showToast('Check-in deleted successfully', 'error'); // Using 'error' type for red color
              
              // Navigate back after a short delay to let user see the toast
              setTimeout(() => {
                navigation.goBack();
              }, 1500);
            } catch (error) {
              console.error('Error deleting check-in:', error);
              showToast('Failed to delete check-in', 'error');
            }
          },
        },
      ]
    );
  };

  const renderRatingOption = (rating: ThumbsRating, emoji: string, label: string) => {
    const isSelected = selectedRating === rating;
    
    return (
      <TouchableOpacity
        key={rating}
        onPress={() => handleRatingSelect(rating)}
        style={{
          flex: 1,
          alignItems: 'center',
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.sm,
          borderRadius: 12,
          backgroundColor: isSelected 
            ? checkInUtils.getRatingColor(rating) + '20'
            : Colors.semantic.backgroundSecondary,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected 
            ? checkInUtils.getRatingColor(rating)
            : Colors.semantic.borderSecondary,
          marginHorizontal: Spacing.xs,
          minHeight: 70,
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
      >
        <Typography 
          variant="body" 
          style={{ 
            fontSize: 24, 
            marginBottom: Spacing.xs,
            lineHeight: 28,
            textAlign: 'center',
          }}
        >
          {emoji}
        </Typography>
        <Body 
          style={{ 
            fontWeight: isSelected ? '600' : '400',
            color: isSelected 
              ? checkInUtils.getRatingColor(rating)
              : Colors.semantic.textSecondary,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          {label}
        </Body>
      </TouchableOpacity>
    );
  };

  const formatDateTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary 
      }}>
        <LoadingState message="Loading check-in details..." />
      </SafeAreaView>
    );
  }

  if (!checkIn) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary 
      }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Body color="secondary">Check-in not found</Body>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: Colors.semantic.backgroundPrimary 
    }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      
      <View style={{
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: Spacing.md }}
        >
          <Typography variant="body" color="primary">
            ← Back
          </Typography>
        </TouchableOpacity>
        <Typography variant="title2" style={{ fontWeight: 'bold', flex: 1 }}>
          Check-in Details
        </Typography>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingHorizontal: Spacing.layout.screenPadding,
            paddingVertical: Spacing.lg,
            paddingBottom: Spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ref={scrollViewRef}
        >
          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.lg }}>
            <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
              <Typography 
                variant="body" 
                style={{ 
                  fontSize: 20, 
                  marginBottom: Spacing.sm,
                  lineHeight: 24,
                }}
              >
                📍
              </Typography>
              <Title2 style={{ textAlign: 'center', marginBottom: Spacing.xs }}>
                {checkIn.place.name}
              </Title2>
              <SecondaryText style={{ textAlign: 'center', fontSize: 14, marginBottom: Spacing.sm }}>
                {checkIn.place.address}
              </SecondaryText>
              <SecondaryText style={{ textAlign: 'center', fontSize: 12 }}>
                {formatDateTime(checkIn.timestamp)}
              </SecondaryText>
            </View>
          </ElevatedCard>

          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.lg }}>
            <Body style={{ 
              fontWeight: '600', 
              marginBottom: Spacing.md,
              textAlign: 'center',
            }}>
              How was your experience?
            </Body>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              marginHorizontal: Spacing.sm,
              marginBottom: Spacing.md,
            }}>
              {renderRatingOption('thumbs_down', '👎', 'Not Great')}
              {renderRatingOption('neutral', '😐', 'Okay')}
              {renderRatingOption('thumbs_up', '👍', 'Great!')}
            </View>

            <TouchableOpacity
              onPress={() => handleRatingSelect(null)}
              style={{
                alignItems: 'center',
                paddingVertical: Spacing.sm,
              }}
            >
              <SecondaryText style={{ fontSize: 14 }}>
                {selectedRating ? 'Clear Rating' : 'No rating selected'}
              </SecondaryText>
            </TouchableOpacity>
          </ElevatedCard>

          <ElevatedCard padding="lg" style={{ marginBottom: Spacing.lg }}>
            <Body style={{ 
              fontWeight: '600', 
              marginBottom: Spacing.md 
            }}>
              Your thoughts
            </Body>
            
            <TextInput
              value={comment}
              onChangeText={handleCommentChange}
              onFocus={handleTextInputFocus}
              placeholder="Share your thoughts about this place..."
              placeholderTextColor={Colors.semantic.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                padding: Spacing.md,
                fontSize: 16,
                lineHeight: 22,
                color: Colors.semantic.textPrimary,
                minHeight: 100,
                backgroundColor: Colors.semantic.backgroundSecondary,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: Colors.semantic.borderSecondary,
              }}
              maxLength={500}
              ref={textInputRef}
            />
            
            <SecondaryText style={{ 
              fontSize: 12, 
              marginTop: Spacing.xs,
              textAlign: 'right',
            }}>
              {comment.length}/500
            </SecondaryText>
          </ElevatedCard>

          <View style={{ gap: Spacing.md }}>
            {hasUnsavedChanges && (
              <PrimaryButton
                title={saving ? "Saving..." : "Save Changes"}
                onPress={handleSaveChanges}
                disabled={saving}
              />
            )}

            <OutlineButton
              title="Add to List"
              onPress={handleAddToList}
              disabled={userLists.length === 0}
            />

            <TouchableOpacity
              onPress={handleDeleteCheckIn}
              style={{
                paddingVertical: Spacing.md,
                alignItems: 'center',
              }}
            >
              <Typography variant="body" style={{ color: Colors.semantic.error }}>
                Delete Check-in
              </Typography>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 