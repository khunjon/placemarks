import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Edit3, User } from '../icons';
import { DarkTheme } from '../../constants/theme';

export interface UserProfileHeaderProps {
  name: string;
  email: string;
  avatarUrl?: string;
  onEditPress: () => void;
}

export default function UserProfileHeader({
  name,
  email,
  avatarUrl,
  onEditPress,
}: UserProfileHeaderProps) {
  return (
    <View
      style={{
        backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
        paddingHorizontal: DarkTheme.spacing.lg,
        paddingVertical: DarkTheme.spacing.xl,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: DarkTheme.colors.semantic.separator,
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: DarkTheme.colors.bangkok.gold + '20',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: DarkTheme.spacing.md,
          borderWidth: 3,
          borderColor: DarkTheme.colors.bangkok.gold,
        }}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{
              width: 74,
              height: 74,
              borderRadius: 37,
            }}
            resizeMode="cover"
          />
        ) : (
          <User
            size={40}
            color={DarkTheme.colors.bangkok.gold}

          />
        )}
      </View>

      {/* User Info */}
      <Text
        style={[
          DarkTheme.typography.title2,
          {
            color: DarkTheme.colors.semantic.label,
            fontWeight: 'bold',
            marginBottom: DarkTheme.spacing.xs,
            textAlign: 'center',
          }
        ]}
      >
        {name}
      </Text>

      <Text
        style={[
          DarkTheme.typography.subhead,
          {
            color: DarkTheme.colors.semantic.secondaryLabel,
            marginBottom: DarkTheme.spacing.lg,
            textAlign: 'center',
          }
        ]}
      >
        {email}
      </Text>

      {/* Edit Button */}
      <TouchableOpacity
        onPress={onEditPress}
        style={{
          backgroundColor: DarkTheme.colors.bangkok.gold,
          paddingHorizontal: DarkTheme.spacing.lg,
          paddingVertical: DarkTheme.spacing.sm,
          borderRadius: DarkTheme.borderRadius.md,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        activeOpacity={0.8}
      >
        <Edit3
          size={16}
          color={DarkTheme.colors.system.black}

        />
        <Text
          style={[
            DarkTheme.typography.callout,
            {
              color: DarkTheme.colors.system.black,
              fontWeight: '600',
              marginLeft: DarkTheme.spacing.xs,
            }
          ]}
        >
          Edit Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}