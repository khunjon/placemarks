import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DarkTheme } from '../../constants/theme';

export interface DarkInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  variant?: 'default' | 'filled' | 'outline' | 'underline';
  size?: 'small' | 'medium' | 'large';
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: any;
  inputStyle?: any;
  containerStyle?: any;
}

const getVariantStyles = (variant: DarkInputProps['variant'], isFocused: boolean, hasError: boolean) => {
  let borderColor: string = DarkTheme.colors.semantic.separator;
  
  if (hasError) {
    borderColor = DarkTheme.colors.status.error;
  } else if (isFocused) {
    borderColor = DarkTheme.colors.accent.blue;
  }

  const baseStyles = {
    backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground,
    borderColor,
    borderWidth: 1,
  };

  switch (variant) {
    case 'filled':
      return {
        ...baseStyles,
        backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
        borderRadius: DarkTheme.borderRadius.md,
      };
    case 'outline':
      return {
        ...baseStyles,
        backgroundColor: 'transparent',
        borderRadius: DarkTheme.borderRadius.md,
        borderWidth: 2,
      };
    case 'underline':
      return {
        backgroundColor: 'transparent',
        borderBottomColor: hasError 
          ? DarkTheme.colors.status.error 
          : isFocused 
            ? DarkTheme.colors.accent.blue 
            : DarkTheme.colors.semantic.separator,
        borderBottomWidth: isFocused ? 2 : 1,
        borderRadius: 0,
      };
    default: // default
      return {
        ...baseStyles,
        borderRadius: DarkTheme.borderRadius.sm,
      };
  }
};

const getSizeStyles = (size: DarkInputProps['size']) => {
  switch (size) {
    case 'small':
      return {
        paddingVertical: DarkTheme.spacing.sm,
        paddingHorizontal: DarkTheme.spacing.md,
        typography: DarkTheme.typography.callout,
        iconSize: 16,
      };
    case 'large':
      return {
        paddingVertical: DarkTheme.spacing.lg,
        paddingHorizontal: DarkTheme.spacing.lg,
        typography: DarkTheme.typography.headline,
        iconSize: 24,
      };
    default: // medium
      return {
        paddingVertical: DarkTheme.spacing.md,
        paddingHorizontal: DarkTheme.spacing.md,
        typography: DarkTheme.typography.body,
        iconSize: 20,
      };
  }
};

export default function DarkInput({
  label,
  placeholder,
  value,
  onChangeText,
  variant = 'default',
  size = 'medium',
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  error,
  helperText,
  required = false,
  onFocus,
  onBlur,
  style,
  inputStyle,
  containerStyle,
}: DarkInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const hasError = !!error;
  const variantStyles = getVariantStyles(variant, isFocused, hasError);
  const sizeStyles = getSizeStyles(size);
  
  const isPasswordField = secureTextEntry;
  const actualSecureTextEntry = isPasswordField && !showPassword;

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleRightIconPress = () => {
    if (isPasswordField) {
      setShowPassword(!showPassword);
    } else {
      onRightIconPress?.();
    }
  };

  const renderLabel = () => {
    if (!label) return null;

    return (
      <View className="flex-row items-center mb-2">
        <Text 
          style={[
            DarkTheme.typography.subhead,
            { 
              color: hasError 
                ? DarkTheme.colors.status.error 
                : DarkTheme.colors.semantic.label,
              fontWeight: '600',
            }
          ]}
        >
          {label}
        </Text>
        {required && (
          <Text 
            style={[
              DarkTheme.typography.subhead,
              { 
                color: DarkTheme.colors.status.error,
                marginLeft: DarkTheme.spacing.xs 
              }
            ]}
          >
            *
          </Text>
        )}
      </View>
    );
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;

    return (
      <Icon 
        name={leftIcon} 
        size={sizeStyles.iconSize} 
        color={
          hasError 
            ? DarkTheme.colors.status.error 
            : isFocused 
              ? DarkTheme.colors.accent.blue 
              : DarkTheme.colors.semantic.placeholderText
        }
        style={{ marginRight: DarkTheme.spacing.sm }}
      />
    );
  };

  const renderRightIcon = () => {
    const iconName = isPasswordField 
      ? (showPassword ? 'visibility-off' : 'visibility')
      : rightIcon;
    
    if (!iconName) return null;

    return (
      <TouchableOpacity onPress={handleRightIconPress}>
        <Icon 
          name={iconName} 
          size={sizeStyles.iconSize} 
          color={
            hasError 
              ? DarkTheme.colors.status.error 
              : isFocused 
                ? DarkTheme.colors.accent.blue 
                : DarkTheme.colors.semantic.placeholderText
          }
          style={{ marginLeft: DarkTheme.spacing.sm }}
        />
      </TouchableOpacity>
    );
  };

  const renderHelperText = () => {
    const text = error || helperText;
    if (!text) return null;

    return (
      <Text 
        style={[
          DarkTheme.typography.caption1,
          { 
            color: hasError 
              ? DarkTheme.colors.status.error 
              : DarkTheme.colors.semantic.secondaryLabel,
            marginTop: DarkTheme.spacing.xs,
          }
        ]}
      >
        {text}
      </Text>
    );
  };

  return (
    <View style={[{ marginBottom: DarkTheme.spacing.md }, containerStyle]}>
      {renderLabel()}
      
      <View 
        className="flex-row items-center"
        style={[
          variantStyles,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            opacity: editable ? 1 : 0.6,
          },
          style,
        ]}
      >
        {renderLeftIcon()}
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={DarkTheme.colors.semantic.placeholderText}
          secureTextEntry={actualSecureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          maxLength={maxLength}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            sizeStyles.typography,
            {
              flex: 1,
              color: DarkTheme.colors.semantic.label,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            inputStyle,
          ]}
        />
        
        {renderRightIcon()}
      </View>
      
      {renderHelperText()}
    </View>
  );
}

// Preset input variants for common use cases
export const FilledInput = (props: Omit<DarkInputProps, 'variant'>) => (
  <DarkInput {...props} variant="filled" />
);

export const OutlineInput = (props: Omit<DarkInputProps, 'variant'>) => (
  <DarkInput {...props} variant="outline" />
);

export const UnderlineInput = (props: Omit<DarkInputProps, 'variant'>) => (
  <DarkInput {...props} variant="underline" />
);

export const EmailInput = (props: Omit<DarkInputProps, 'keyboardType' | 'autoCapitalize' | 'leftIcon'>) => (
  <DarkInput 
    {...props} 
    keyboardType="email-address" 
    autoCapitalize="none" 
    leftIcon="email"
  />
);

export const PasswordInput = (props: Omit<DarkInputProps, 'secureTextEntry' | 'leftIcon'>) => (
  <DarkInput 
    {...props} 
    secureTextEntry 
    leftIcon="lock"
  />
);

export const SearchInput = (props: Omit<DarkInputProps, 'leftIcon' | 'placeholder'>) => (
  <DarkInput 
    {...props} 
    leftIcon="search" 
    placeholder="Search..."
  />
); 