import React, { useRef, memo, useState } from 'react';
import { View, Text, Alert, Animated, ActivityIndicator } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
  State,
} from 'react-native-gesture-handler';
import { Trash2, Plus } from '../icons';
import { DarkTheme } from '../../constants/theme';
import PlaceCard, { PlaceCardProps } from './PlaceCard';

// Extended props interface for swipeable functionality
export interface SwipeablePlaceCardProps extends PlaceCardProps {
  onDelete?: (googlePlaceId: string, placeName: string) => Promise<void>;
  onAddToWantToGo?: (googlePlaceId: string, placeName: string) => Promise<void>;
  enableDelete?: boolean; // Only true for user lists
  enableAddToWantToGo?: boolean; // True for all lists
  isProcessing?: boolean; // External processing state
}

const SWIPE_THRESHOLD = 80; // Threshold for triggering actions
const MAX_SWIPE = 120; // Maximum swipe distance
const ACTIVATION_THRESHOLD = 20; // Minimum distance to show action

const SwipeablePlaceCard = memo(function SwipeablePlaceCard({
  onDelete,
  onAddToWantToGo,
  enableDelete = false,
  enableAddToWantToGo = true,
  isProcessing: externalProcessing = false,
  ...placeCardProps
}: SwipeablePlaceCardProps) {
  // Local processing state
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use a single animated value for translation
  const translateX = useRef(new Animated.Value(0)).current;
  
  // Animated value for processing overlay
  const processingOpacity = useRef(new Animated.Value(0)).current;
  
  // Pre-calculate interpolated opacity values based on translateX
  const leftActionOpacity = enableDelete ? translateX.interpolate({
    inputRange: [-MAX_SWIPE, -ACTIVATION_THRESHOLD, 0, MAX_SWIPE],
    outputRange: [1, 0, 0, 0],
    extrapolate: 'clamp',
  }) : new Animated.Value(0);
  
  const rightActionOpacity = enableAddToWantToGo ? translateX.interpolate({
    inputRange: [-MAX_SWIPE, 0, ACTIVATION_THRESHOLD, MAX_SWIPE],
    outputRange: [0, 0, 0, 1],
    extrapolate: 'clamp',
  }) : new Animated.Value(0);

  // Scale animations for visual feedback
  const leftActionScale = translateX.interpolate({
    inputRange: [-MAX_SWIPE, -SWIPE_THRESHOLD, 0],
    outputRange: [1.2, 1, 0.8],
    extrapolate: 'clamp',
  });
  
  const rightActionScale = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, MAX_SWIPE],
    outputRange: [0.8, 1, 1.2],
    extrapolate: 'clamp',
  });

  // Get place data for callbacks
  const placeData = placeCardProps.place ? {
    googlePlaceId: placeCardProps.place.google_place_id,
    name: placeCardProps.place.name,
  } : {
    googlePlaceId: placeCardProps.googlePlaceId,
    name: placeCardProps.name,
  };

  // Action handlers
  const handleDelete = async () => {
    if (!enableDelete || !onDelete) return;
    
    Alert.alert(
      'Confirm Remove',
      `Are you sure you want to remove ${placeData.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            // Animate processing overlay in
            Animated.timing(processingOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
            
            try {
              await onDelete(placeData.googlePlaceId, placeData.name || 'Unknown Place');
            } finally {
              setIsProcessing(false);
              processingOpacity.setValue(0);
            }
          }
        }
      ]
    );
  };

  const handleAddToWantToGo = async () => {
    if (!enableAddToWantToGo || !onAddToWantToGo) return;
    
    setIsProcessing(true);
    // Animate processing overlay in
    Animated.timing(processingOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    try {
      await onAddToWantToGo(placeData.googlePlaceId, placeData.name || 'Unknown Place');
    } finally {
      setIsProcessing(false);
      // Animate processing overlay out
      Animated.timing(processingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  // Handle gesture event - runs on UI thread with native driver
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  // Handle gesture state changes
  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // Consider velocity for more responsive feel
      const effectiveDx = translationX + (velocityX * 0.2);
      
      // Check if threshold was reached
      if (effectiveDx < -SWIPE_THRESHOLD && enableDelete) {
        // Snap to delete position with visual feedback
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: -MAX_SWIPE,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
        
        // Trigger delete after a short delay for visual feedback
        setTimeout(() => handleDelete(), 150);
      } else if (effectiveDx > SWIPE_THRESHOLD && enableAddToWantToGo) {
        // Snap to add position with visual feedback
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: MAX_SWIPE,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
        
        // Trigger add after a short delay for visual feedback
        setTimeout(() => handleAddToWantToGo(), 150);
      } else {
        // Spring back to center
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 7,
        }).start();
      }
    }
  };

  return (
    <View style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Left Action Background (Delete) */}
      {enableDelete && (
        <Animated.View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 8, // Account for PlaceCard's marginBottom
            width: MAX_SWIPE,
            backgroundColor: DarkTheme.colors.status.error,
            borderRadius: DarkTheme.borderRadius.md,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: leftActionOpacity,
            transform: [{ scale: leftActionScale }],
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
            bottom: 8, // Account for PlaceCard's marginBottom
            width: MAX_SWIPE,
            backgroundColor: DarkTheme.colors.status.success,
            borderRadius: DarkTheme.borderRadius.md,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: rightActionOpacity,
            transform: [{ scale: rightActionScale }],
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
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]} // Require 10px movement to activate
        failOffsetY={[-5, 5]} // Cancel if vertical movement exceeds 5px
        shouldCancelWhenOutside={true}
        enabled={(enableDelete || enableAddToWantToGo) && !isProcessing && !externalProcessing}
      >
        <Animated.View
          style={{
            transform: [{ 
              translateX: translateX.interpolate({
                inputRange: [-MAX_SWIPE, MAX_SWIPE],
                outputRange: [-MAX_SWIPE, MAX_SWIPE],
                extrapolate: 'clamp',
              })
            }],
            zIndex: 2,
          }}
        >
          <PlaceCard {...placeCardProps} />
          
          {/* Processing Overlay */}
          {(isProcessing || externalProcessing) && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderRadius: DarkTheme.borderRadius.md,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: processingOpacity,
              }}
            >
              <View
                style={{
                  backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
                  padding: DarkTheme.spacing.lg,
                  borderRadius: DarkTheme.borderRadius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <ActivityIndicator 
                  size="small" 
                  color={DarkTheme.colors.bangkok.gold} 
                  style={{ marginRight: DarkTheme.spacing.sm }}
                />
                <Text
                  style={[
                    DarkTheme.typography.callout,
                    { color: DarkTheme.colors.semantic.label }
                  ]}
                >
                  Processing...
                </Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

export default SwipeablePlaceCard;