import React, { useRef, useState, useLayoutEffect } from 'react';
import { View, Text, Alert, Animated, PanResponder, LayoutChangeEvent } from 'react-native';
import { Trash2, Plus } from 'lucide-react-native';
import { DarkTheme } from '../../constants/theme';
import PlaceCard, { PlaceCardProps } from './PlaceCard';

// Extended props interface for swipeable functionality
export interface SwipeablePlaceCardProps extends PlaceCardProps {
  onDelete?: (googlePlaceId: string, placeName: string) => void;
  onAddToWantToGo?: (googlePlaceId: string, placeName: string) => void;
  enableDelete?: boolean; // Only true for user lists
  enableAddToWantToGo?: boolean; // True for all lists
}

const SWIPE_THRESHOLD = 80; // Reduced threshold for easier triggering
const MAX_SWIPE = 120; // Reduced max swipe distance
const ACTIVATION_THRESHOLD = 20; // Minimum distance to show action

export default function SwipeablePlaceCard({
  onDelete,
  onAddToWantToGo,
  enableDelete = false,
  enableAddToWantToGo = true,
  ...placeCardProps
}: SwipeablePlaceCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const leftActionOpacity = useRef(new Animated.Value(0)).current;
  const rightActionOpacity = useRef(new Animated.Value(0)).current;
  
  const [cardHeight, setCardHeight] = useState<number>(0);
  const [isSwipeInProgress, setIsSwipeInProgress] = useState(false);

  // Get place data for callbacks
  const placeData = placeCardProps.place ? {
    googlePlaceId: placeCardProps.place.google_place_id,
    name: placeCardProps.place.name,
  } : {
    googlePlaceId: placeCardProps.googlePlaceId,
    name: placeCardProps.name,
  };

  // Handle card layout to get exact height
  const handleCardLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setCardHeight(height);
  };

  // Action handlers
  const handleDelete = () => {
    if (!enableDelete || !onDelete) return;
    
    Alert.alert(
      'Remove Place',
      `Are you sure you want to remove "${placeData.name}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => onDelete(placeData.googlePlaceId, placeData.name)
        }
      ]
    );
  };

  const handleAddToWantToGo = () => {
    if (!enableAddToWantToGo || !onAddToWantToGo) return;
    onAddToWantToGo(placeData.googlePlaceId, placeData.name);
  };

  // Update action animations based on swipe progress
  const updateActionAnimations = (dx: number) => {
    if (dx < 0 && enableDelete) {
      // Left swipe - delete action
      leftActionOpacity.setValue(Math.max(0, (Math.abs(dx) - ACTIVATION_THRESHOLD) / (SWIPE_THRESHOLD - ACTIVATION_THRESHOLD)));
      rightActionOpacity.setValue(0);
    } else if (dx > 0 && enableAddToWantToGo) {
      // Right swipe - add to Want to Go action
      rightActionOpacity.setValue(Math.max(0, (Math.abs(dx) - ACTIVATION_THRESHOLD) / (SWIPE_THRESHOLD - ACTIVATION_THRESHOLD)));
      leftActionOpacity.setValue(0);
    } else {
      // No valid swipe direction
      leftActionOpacity.setValue(0);
      rightActionOpacity.setValue(0);
    }
  };

  // Pan responder for gesture handling
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes with sufficient movement
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
    },
    onPanResponderGrant: () => {
      setIsSwipeInProgress(true);
      translateX.setOffset(0);
      translateX.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      const { dx } = gestureState;
      
      // Constrain swipe based on enabled directions
      let constrainedDx = dx;
      if (dx < 0 && !enableDelete) {
        constrainedDx = 0;
      } else if (dx > 0 && !enableAddToWantToGo) {
        constrainedDx = 0;
      }
      
      // Apply easing for smoother feel - reduce resistance as you approach max
      const easedDx = constrainedDx > 0 
        ? Math.min(constrainedDx, MAX_SWIPE * (1 - Math.exp(-constrainedDx / 60)))
        : Math.max(constrainedDx, -MAX_SWIPE * (1 - Math.exp(constrainedDx / 60)));
      
      translateX.setValue(easedDx);
      updateActionAnimations(easedDx);
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx, vx } = gestureState;
      setIsSwipeInProgress(false);
      
      // Consider velocity for more responsive feel
      const effectiveDx = dx + (vx * 50); // Velocity multiplier
      
      // Check if threshold was reached
      if (effectiveDx < -SWIPE_THRESHOLD && enableDelete) {
        // Left swipe - delete action
        handleDelete();
      } else if (effectiveDx > SWIPE_THRESHOLD && enableAddToWantToGo) {
        // Right swipe - add to Want to Go
        handleAddToWantToGo();
      }
      
      // Spring back to center with improved animation
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
        Animated.spring(leftActionOpacity, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
        Animated.spring(rightActionOpacity, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
      ]).start();
    },
  });

  return (
    <View style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Left Action Background (Delete) */}
      {enableDelete && (
        <Animated.View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 8, // Account for PlaceCard's marginBottom (8px)
            width: MAX_SWIPE,
            backgroundColor: DarkTheme.colors.status.error,
            borderRadius: DarkTheme.borderRadius.md,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
            opacity: leftActionOpacity,
          }}
        >
          <Trash2 
            size={20} 
            color={DarkTheme.colors.system.white}
            strokeWidth={2.5}
          />
          <Text
            style={[
              DarkTheme.typography.caption2,
              {
                color: DarkTheme.colors.system.white,
                fontWeight: '700',
                marginTop: 2,
                fontSize: 10,
              }
            ]}
          >
            Remove
          </Text>
        </Animated.View>
      )}

      {/* Right Action Background (Add to Want to Go) */}
      {enableAddToWantToGo && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 8, // Account for PlaceCard's marginBottom (8px)
            width: MAX_SWIPE,
            backgroundColor: DarkTheme.colors.status.success,
            borderRadius: DarkTheme.borderRadius.md,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
            opacity: rightActionOpacity,
          }}
        >
          <Plus 
            size={20} 
            color={DarkTheme.colors.system.white}
            strokeWidth={2.5}
          />
          <Text
            style={[
              DarkTheme.typography.caption2,
              {
                color: DarkTheme.colors.system.white,
                fontWeight: '700',
                marginTop: 2,
                fontSize: 10,
              }
            ]}
          >
            Want to Go
          </Text>
        </Animated.View>
      )}

      {/* Swipeable Card */}
      <Animated.View
        style={{
          transform: [{ translateX }],
          zIndex: 2,
        }}
        {...panResponder.panHandlers}
        onLayout={handleCardLayout}
      >
        <PlaceCard {...placeCardProps} />
      </Animated.View>
    </View>
  );
}