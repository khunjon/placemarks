import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import { Check, X, Info, AlertCircle } from '../icons';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function Toast({ 
  visible, 
  message, 
  type = 'success', 
  duration = 3000, 
  onHide 
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) {
        onHide();
      }
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: Colors.semantic.success,
          icon: Check,
          iconColor: '#FFFFFF',
        };
      case 'error':
        return {
          backgroundColor: Colors.semantic.error,
          icon: X,
          iconColor: '#FFFFFF',
        };
      case 'warning':
        return {
          backgroundColor: Colors.semantic.warning,
          icon: AlertCircle,
          iconColor: '#FFFFFF',
        };
      case 'info':
      default:
        return {
          backgroundColor: Colors.primary[500],
          icon: Info,
          iconColor: '#FFFFFF',
        };
    }
  };

  const config = getToastConfig();
  const IconComponent = config.icon;

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60, // Below status bar and navigation
        left: Spacing.layout.screenPadding,
        right: Spacing.layout.screenPadding,
        zIndex: 700,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View
        style={{
          backgroundColor: config.backgroundColor,
          borderRadius: 12,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <IconComponent
          size={20}
          color={config.iconColor}
          strokeWidth={2}
          style={{ marginRight: Spacing.sm }}
        />
        
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '500',
            flex: 1,
          }}
          numberOfLines={2}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
} 