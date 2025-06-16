import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import { ProfileStackParamList } from './types';
import type { ProfileStackScreenProps } from './types';

// Import screens
import ProfileScreen from '../screens/ProfileScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import AchievementDetailScreen from '../screens/AchievementDetailScreen';
// import EditProfileScreen from '../screens/EditProfileScreen';

// Placeholder wrapper component for EditProfile screen to avoid inline function
function EditProfileScreenWrapper({ navigation, route }: ProfileStackScreenProps<'EditProfile'>) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.semantic.backgroundPrimary }}>
      <Text style={{ color: Colors.semantic.textPrimary, fontSize: 18, marginBottom: 20 }}>
        Edit Profile Screen
      </Text>
      <Text style={{ color: Colors.semantic.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 }}>
        This screen will be implemented later.{'\n'}
        User: {route.params.userName}{'\n'}
        Email: {route.params.userEmail}
      </Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.semantic.backgroundSecondary,
        },
        headerTintColor: Colors.semantic.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        headerShadowVisible: false,
        headerBackVisible: true,
        contentStyle: {
          backgroundColor: Colors.semantic.backgroundPrimary,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          headerShown: false, // ProfileScreen has its own header
        }}
      />
      
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreenWrapper}
        options={{
          title: 'Edit Profile',
          headerShown: true,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      
      <Stack.Screen 
        name="Preferences" 
        component={PreferencesScreen}
        options={({ route }) => ({
          title: `${route.params.section || 'Preferences'}`.charAt(0).toUpperCase() + 
                 `${route.params.section || 'preferences'}`.slice(1),
          headerShown: true,
        })}
      />
      
      <Stack.Screen 
        name="AchievementDetail" 
        component={AchievementDetailScreen}
        options={({ route }) => ({
          title: route.params.achievementName,
          headerShown: true,
        })}
      />
    </Stack.Navigator>
  );
} 