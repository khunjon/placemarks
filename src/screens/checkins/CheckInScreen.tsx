import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { 
  Typography, 
  Title3, 
  Body, 
  SecondaryText,
  ElevatedCard,
  EmptyState,
  LoadingState,
  PrimaryButton,
} from '../../components/common';
import { useAuth } from '../../services/auth-context';
import { checkInsService, CheckInsByDate, checkInUtils, ThumbsRating } from '../../services/checkInsService';
import type { CheckInStackScreenProps } from '../../navigation/types';

type CheckInScreenProps = CheckInStackScreenProps<'CheckIn'>;

export default function CheckInScreen({ navigation }: CheckInScreenProps) {
  const { user, loading: authLoading } = useAuth();
  const [checkInHistory, setCheckInHistory] = useState<CheckInsByDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);



  // Load check-in history
  const loadCheckInHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const history = await checkInsService.getUserCheckInsByDate(user.id);
      // Check-in history loaded successfully
      setCheckInHistory(history);
    } catch (err) {
      console.error('Error loading check-in history:', err);
      setError('Failed to load check-in history');
      // Set empty history on error so we show empty state instead of loading forever
      setCheckInHistory([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Track if this is the initial mount to prevent useFocusEffect from running twice
  const isInitialMount = useRef(true);

  // Initial load
  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) {
      return;
    }

    if (user === null) {
      // User is not authenticated, stop loading
      console.log('No user authenticated, showing empty state');
      setLoading(false);
      return;
    }
    
    if (user) {
      // User is authenticated, load history

      loadCheckInHistory();
    }
  }, [user, authLoading, loadCheckInHistory]);

  // Refresh data when screen comes back into focus (but not on initial mount)
  useFocusEffect(
    useCallback(() => {
      // Skip the first focus effect call (initial mount)
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      // Only reload if user exists and auth is not loading
      if (user && !authLoading) {
        console.log('Screen focused, refreshing check-in history');
        loadCheckInHistory();
      }
    }, [user, authLoading, loadCheckInHistory])
  );

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached, stopping loading');
        setLoading(false);
        setError('Loading took too long. Please try refreshing.');
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCheckInHistory();
    setRefreshing(false);
  }, [loadCheckInHistory]);

  // Handle check-in button press
  const handleCheckInButtonPress = () => {
    // Navigate directly to nearby places search
    navigation.navigate('CheckInSearch');
  };

  // Handle check-in item press
  const handleCheckInItemPress = (checkInId: string, placeName: string) => {
    // Navigate to check-in detail screen
    navigation.navigate('CheckInDetail', {
      checkInId: checkInId,
      placeName: placeName,
    });
  };

  // Format time for display
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Render check-in item
  const renderCheckInItem = (checkIn: any) => (
    <TouchableOpacity
      key={checkIn.id}
      onPress={() => handleCheckInItemPress(checkIn.id, checkIn.place.name)}
      style={{
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderSecondary,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Category Icon */}
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: Colors.semantic.backgroundTertiary,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: Spacing.md,
          marginTop: 2, // Slight offset to align with text
        }}>
          <Typography variant="body" style={{ fontSize: 16 }}>
            {checkInUtils.getCategoryIcon(checkIn.place.place_type, undefined, checkIn.place.name)}
          </Typography>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs }}>
            <Body style={{ fontWeight: '600', flex: 1 }}>
              {checkIn.place.name}
            </Body>
            <View style={{ marginLeft: Spacing.sm }}>
              <Typography 
                variant="body" 
                style={{ fontSize: 18 }}
              >
                {checkInUtils.formatRating(checkIn.rating)}
              </Typography>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SecondaryText style={{ fontSize: 14 }}>
              {checkIn.place.district ? `${checkIn.place.district}, Bangkok` : 'Bangkok'}
            </SecondaryText>
            <SecondaryText style={{ fontSize: 14, marginHorizontal: Spacing.xs }}>
              •
            </SecondaryText>
            <SecondaryText style={{ fontSize: 14 }}>
              {formatTime(checkIn.timestamp)}
            </SecondaryText>
          </View>
          
          {checkIn.comment && (
            <Body 
              color="secondary" 
              style={{ 
                fontSize: 14, 
                marginTop: Spacing.xs,
                fontStyle: 'italic' 
              }}
            >
              "{checkIn.comment}"
            </Body>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render date section
  const renderDateSection = (dateGroup: CheckInsByDate) => (
    <View key={dateGroup.date} style={{ marginBottom: Spacing.lg }}>
      <View style={{
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.semantic.backgroundPrimary,
      }}>
        <Typography 
          variant="subhead" 
          style={{ 
            fontWeight: '600',
            color: Colors.semantic.textSecondary 
          }}
        >
          {checkInUtils.formatDateForDisplay(dateGroup.date)}
        </Typography>
      </View>
      
      <ElevatedCard padding="none">
        {dateGroup.checkIns.map((checkIn, index) => (
          <View key={checkIn.id}>
            {renderCheckInItem(checkIn)}
          </View>
        ))}
      </ElevatedCard>
    </View>
  );

  // Loading state
  if (loading) {
    const loadingMessage = authLoading 
      ? "Setting up your account..." 
      : "Loading your check-in history...";
      
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: Colors.semantic.backgroundPrimary 
      }}>
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingVertical: Spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: Colors.semantic.borderPrimary,
        }}>
          <Typography variant="largeTitle" style={{ fontWeight: 'bold' }}>
            Check In
          </Typography>
        </View>
        <LoadingState message={loadingMessage} />
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
        paddingHorizontal: Spacing.layout.screenPadding,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
      }}>
        <Typography variant="largeTitle" style={{ fontWeight: 'bold' }}>
          Check In
        </Typography>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingBottom: Spacing.xl,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[500]}
            colors={[Colors.primary[500]]}
          />
        }
      >
        {/* Check In Button */}
        <View style={{
          paddingHorizontal: Spacing.layout.screenPadding,
          paddingTop: Spacing.lg,
          paddingBottom: Spacing.md,
        }}>
          <TouchableOpacity
            onPress={handleCheckInButtonPress}
            style={{
              backgroundColor: Colors.primary[500],
              borderRadius: 16,
              paddingVertical: Spacing.md,
              paddingHorizontal: Spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: Colors.primary[500],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
            activeOpacity={0.8}
          >
            {/* Location Pin Icon */}
            <View style={{
              width: 20,
              height: 20,
              marginRight: Spacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <View style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: Colors.neutral[950],
                backgroundColor: 'transparent',
                position: 'relative',
              }}>
                <View style={{
                  position: 'absolute',
                  bottom: -6,
                  left: 4,
                  width: 0,
                  height: 0,
                  borderLeftWidth: 2,
                  borderRightWidth: 2,
                  borderTopWidth: 6,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: Colors.neutral[950],
                }} />
              </View>
            </View>
            <Typography 
              variant="body" 
              style={{ 
                fontWeight: '600', 
                fontSize: 16,
                color: Colors.neutral[950] 
              }}
            >
              Check In Here
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Error State */}
        {error && (
          <View style={{
            paddingHorizontal: Spacing.layout.screenPadding,
            marginBottom: Spacing.lg,
          }}>
            <ElevatedCard padding="lg">
              <Body color="error" style={{ textAlign: 'center' }}>
                {error}
              </Body>
            </ElevatedCard>
          </View>
        )}

        {/* Check-in History */}
        {checkInHistory.length > 0 ? (
          <View style={{
            paddingHorizontal: Spacing.layout.screenPadding,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: Spacing.md,
            }}>
              <Title3>Your Check-ins</Title3>
              <SecondaryText>
                {checkInHistory.reduce((total, group) => total + group.checkIns.length, 0)} total
              </SecondaryText>
            </View>

            {checkInHistory.map(renderDateSection)}
          </View>
        ) : (
          /* Empty State */
          <View style={{ 
            flex: 1, 
            paddingHorizontal: Spacing.layout.screenPadding,
            justifyContent: 'center',
            minHeight: 300,
          }}>
            <EmptyState
              title="Ready to start exploring?"
              description="Check in somewhere!"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
} 