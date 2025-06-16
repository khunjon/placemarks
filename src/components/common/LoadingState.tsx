import React from 'react';
import { View, ActivityIndicator, ViewStyle, DimensionValue } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import Typography from './Typography';

interface LoadingStateProps {
  variant?: 'fullscreen' | 'inline' | 'overlay' | 'minimal';
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export function LoadingState({ 
  variant = 'inline', 
  message, 
  size = 'large',
  color = Colors.primary[500],
  style 
}: LoadingStateProps) {
  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
    };

    switch (variant) {
      case 'fullscreen':
        return {
          ...baseStyle,
          flex: 1,
          backgroundColor: Colors.semantic.backgroundPrimary,
          paddingHorizontal: Spacing.layout.screenPadding,
        };
      
      case 'overlay':
        return {
          ...baseStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: `${Colors.semantic.backgroundPrimary}CC`,
          zIndex: 1000,
        };
      
      case 'minimal':
        return {
          ...baseStyle,
          paddingVertical: Spacing.sm,
        };
      
      case 'inline':
      default:
        return {
          ...baseStyle,
          paddingVertical: Spacing.xl,
          paddingHorizontal: Spacing.layout.screenPadding,
        };
    }
  };

  return (
    <View style={[getContainerStyle(), style]}>
      <ActivityIndicator 
        size={size} 
        color={color}
        style={{ marginBottom: message ? Spacing.md : 0 }}
      />
      {message && (
        <Typography 
          variant="body" 
          color="secondary"
          style={{ 
            textAlign: 'center',
            marginTop: Spacing.sm,
            maxWidth: 280,
          }}
        >
          {message}
        </Typography>
      )}
    </View>
  );
}

// Preset loading components for common use cases
export function FullScreenLoading({ message = 'Loading...' }: { message?: string }) {
  return <LoadingState variant="fullscreen" message={message} />;
}

export function InlineLoading({ message }: { message?: string }) {
  return <LoadingState variant="inline" message={message} />;
}

export function OverlayLoading({ message }: { message?: string }) {
  return <LoadingState variant="overlay" message={message} />;
}

export function MinimalLoading() {
  return <LoadingState variant="minimal" size="small" />;
}

// Loading skeleton components
interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}: SkeletonProps) {
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: Colors.semantic.backgroundTertiary,
          borderRadius,
          opacity: 0.6,
        },
        style,
      ]}
    />
  );
}

// Preset skeleton components
export function TextSkeleton({ lines = 1 }: { lines?: number }) {
  return (
    <View style={{ gap: Spacing.xs }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '75%' : '100%'}
          height={16}
          style={{ marginBottom: index < lines - 1 ? Spacing.xs : 0 }}
        />
      ))}
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: Colors.semantic.backgroundSecondary,
        borderRadius: Spacing.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
          <Skeleton width="60%" height={16} style={{ marginBottom: Spacing.xs }} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <TextSkeleton lines={2} />
    </View>
  );
}

export function ListItemSkeleton() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.layout.screenPadding,
        borderBottomWidth: 1,
        borderBottomColor: Colors.semantic.borderPrimary,
      }}
    >
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={{ marginLeft: Spacing.md, flex: 1 }}>
        <Skeleton width="70%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="50%" height={12} />
      </View>
      <Skeleton width={60} height={12} />
    </View>
  );
} 