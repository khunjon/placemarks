import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import Typography from './Typography';
import { PrimaryButton, SecondaryButton } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: {
    title: string;
    onPress: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    title: string;
    onPress: () => void;
    icon?: LucideIcon;
  };
  variant?: 'default' | 'minimal' | 'illustration';
  style?: ViewStyle;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'default',
  style,
}: EmptyStateProps) {
  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.layout.screenPadding,
    };

    switch (variant) {
      case 'minimal':
        return {
          ...baseStyle,
          paddingVertical: Spacing.lg,
        };
      
      case 'illustration':
        return {
          ...baseStyle,
          paddingVertical: Spacing.xxl,
          flex: 1,
        };
      
      case 'default':
      default:
        return {
          ...baseStyle,
          paddingVertical: Spacing.xl,
          minHeight: 200,
        };
    }
  };

  return (
    <View style={[getContainerStyle(), style]}>
      {Icon && (
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: `${Colors.semantic.textSecondary}10`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Spacing.lg,
          }}
        >
          <Icon
            size={40}
            color={Colors.semantic.textSecondary}
            strokeWidth={1.5}
          />
        </View>
      )}

      <Typography
        variant="title2"
        style={{
          textAlign: 'center',
          marginBottom: description ? Spacing.sm : Spacing.lg,
          fontWeight: '600',
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body"
          color="secondary"
          style={{
            textAlign: 'center',
            marginBottom: Spacing.lg,
            maxWidth: 280,
            lineHeight: 22,
          }}
        >
          {description}
        </Typography>
      )}

      {(primaryAction || secondaryAction) && (
        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.sm,
            marginTop: Spacing.md,
          }}
        >
          {primaryAction && (
            <PrimaryButton
              title={primaryAction.title}
              onPress={primaryAction.onPress}
              icon={primaryAction.icon}
              size="md"
            />
          )}
          
          {secondaryAction && (
            <SecondaryButton
              title={secondaryAction.title}
              onPress={secondaryAction.onPress}
              icon={secondaryAction.icon}
              size="md"
            />
          )}
        </View>
      )}
    </View>
  );
}

// Preset empty state components for common scenarios
interface EmptyListProps {
  title?: string;
  description?: string;
  onCreatePress?: () => void;
  createButtonTitle?: string;
  icon?: LucideIcon;
}

export function EmptyListState({
  title = 'No items yet',
  description = 'Get started by creating your first item.',
  onCreatePress,
  createButtonTitle = 'Create Item',
  icon,
}: EmptyListProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      primaryAction={
        onCreatePress
          ? {
              title: createButtonTitle,
              onPress: onCreatePress,
            }
          : undefined
      }
    />
  );
}

interface EmptySearchProps {
  query?: string;
  onClearPress?: () => void;
  onRetryPress?: () => void;
}

export function EmptySearchState({
  query,
  onClearPress,
  onRetryPress,
}: EmptySearchProps) {
  return (
    <EmptyState
      title={query ? `No results for "${query}"` : 'No results found'}
      description="Try adjusting your search terms or filters to find what you're looking for."
      primaryAction={
        onRetryPress
          ? {
              title: 'Try Again',
              onPress: onRetryPress,
            }
          : undefined
      }
      secondaryAction={
        onClearPress
          ? {
              title: 'Clear Search',
              onPress: onClearPress,
            }
          : undefined
      }
      variant="minimal"
    />
  );
}

interface EmptyErrorProps {
  title?: string;
  description?: string;
  onRetryPress?: () => void;
  onContactPress?: () => void;
}

export function EmptyErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error while loading your data. Please try again.',
  onRetryPress,
  onContactPress,
}: EmptyErrorProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      primaryAction={
        onRetryPress
          ? {
              title: 'Try Again',
              onPress: onRetryPress,
            }
          : undefined
      }
      secondaryAction={
        onContactPress
          ? {
              title: 'Contact Support',
              onPress: onContactPress,
            }
          : undefined
      }
    />
  );
}

interface EmptyOfflineProps {
  onRetryPress?: () => void;
}

export function EmptyOfflineState({ onRetryPress }: EmptyOfflineProps) {
  return (
    <EmptyState
      title="You're offline"
      description="Check your internet connection and try again."
      primaryAction={
        onRetryPress
          ? {
              title: 'Retry',
              onPress: onRetryPress,
            }
          : undefined
      }
      variant="minimal"
    />
  );
} 