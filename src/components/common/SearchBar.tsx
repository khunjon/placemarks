import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { Spacing, BorderRadius, Typography } from '../../constants/Spacing';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
  editable?: boolean;
  showClearButton?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  onFocus,
  onBlur,
  onSubmitEditing,
  onClear,
  autoFocus = false,
  editable = true,
  showClearButton = true,
  style,
  inputStyle,
  containerStyle,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  const containerStyles: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.surfaceSecondary,
    borderRadius: BorderRadius.component.input,
    borderWidth: 1,
    borderColor: isFocused ? Colors.primary[500] : Colors.semantic.borderPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  };

  const inputStyles: TextStyle = {
    flex: 1,
    fontSize: Typography.fontSize.lg,
    lineHeight: Typography.lineHeight.lg,
    color: Colors.semantic.textPrimary,
    marginLeft: Spacing.sm,
    marginRight: showClearButton && value ? Spacing.sm : 0,
  };

  return (
    <View style={[containerStyles, containerStyle, style]}>
      {/* Search Icon */}
      <Search
        size={Spacing.iconSize.md}
        color={isFocused ? Colors.primary[500] : Colors.semantic.textTertiary}
        strokeWidth={2}
      />

      {/* Text Input */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.semantic.textTertiary}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={onSubmitEditing}
        autoFocus={autoFocus}
        editable={editable}
        returnKeyType="search"
        clearButtonMode="never" // We'll handle clear button manually
        style={[inputStyles, inputStyle]}
      />

      {/* Clear Button */}
      {showClearButton && value && (
        <TouchableOpacity
          onPress={handleClear}
          activeOpacity={0.7}
          style={{
            padding: Spacing.xs,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.semantic.textTertiary,
          }}
        >
          <X
            size={Spacing.iconSize.sm}
            color={Colors.semantic.backgroundSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// Preset search bar variants
export interface CompactSearchBarProps extends Omit<SearchBarProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

export function CompactSearchBar(props: CompactSearchBarProps) {
  return (
    <SearchBar
      {...props}
      containerStyle={[
        {
          minHeight: 36,
          paddingVertical: Spacing.xs,
          paddingHorizontal: Spacing.sm,
        },
        props.containerStyle,
      ]}
      inputStyle={[
        {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.lineHeight.md,
        },
        props.inputStyle,
      ]}
    />
  );
}

export interface RoundedSearchBarProps extends Omit<SearchBarProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

export function RoundedSearchBar(props: RoundedSearchBarProps) {
  return (
    <SearchBar
      {...props}
      containerStyle={[
        {
          borderRadius: BorderRadius.full,
          paddingHorizontal: Spacing.lg,
        },
        props.containerStyle,
      ]}
    />
  );
}

export interface OutlinedSearchBarProps extends Omit<SearchBarProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

export function OutlinedSearchBar(props: OutlinedSearchBarProps) {
  return (
    <SearchBar
      {...props}
      containerStyle={[
        {
          backgroundColor: 'transparent',
          borderWidth: 2,
        },
        props.containerStyle,
      ]}
    />
  );
} 