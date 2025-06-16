import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { Button } from 'react-native-elements';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../types';
import { useAuth } from '../services/auth-context';
import { DarkTheme } from '../constants/theme';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();

  const navigationButtons = [
    {
      title: 'Interactive Map',
      icon: 'map',
      color: DarkTheme.colors.bangkok.sapphire,
      onPress: () => navigation.navigate('Map'),
    },
    {
      title: 'Add Place',
      icon: 'add-location',
      color: DarkTheme.colors.accent.green,
      onPress: () => navigation.navigate('AddPlace'),
    },
    {
      title: 'My Lists',
      icon: 'list',
      color: DarkTheme.colors.accent.purple,
      onPress: () => navigation.navigate('Lists'),
    },
    {
      title: 'Profile',
      icon: 'person',
      color: DarkTheme.colors.accent.orange,
      onPress: () => navigation.navigate('Profile'),
    },
    {
      title: 'Google Places Demo',
      icon: 'search',
      color: DarkTheme.colors.bangkok.emerald,
      onPress: () => navigation.navigate('PlacesSearch'),
    },
    {
      title: 'My Check-ins',
      icon: 'location-on',
      color: DarkTheme.colors.bangkok.gold,
      onPress: () => navigation.navigate('CheckInHistory'),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 py-8">
          {/* Header Section */}
          <View className="items-center mb-12">
            <Text 
              style={[
                DarkTheme.typography.largeTitle,
                { textAlign: 'center', marginBottom: DarkTheme.spacing.sm }
              ]}
            >
              Welcome to Placemarks
            </Text>
            <View className="flex-row items-center">
              <Icon 
                name="location-on" 
                size={20} 
                color={DarkTheme.colors.bangkok.gold} 
              />
              <Text 
                style={[
                  DarkTheme.typography.headline,
                  { 
                    color: DarkTheme.colors.semantic.secondaryLabel,
                    marginLeft: DarkTheme.spacing.xs 
                  }
                ]}
              >
                Hello, {user?.email?.split('@')[0]}!
              </Text>
            </View>
          </View>

          {/* Quick Stats Card */}
          <View 
            className="mb-8 p-4 rounded-2xl"
            style={{ 
              backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
              ...DarkTheme.shadows.medium 
            }}
          >
            <Text 
              style={[
                DarkTheme.typography.headline,
                { marginBottom: DarkTheme.spacing.md }
              ]}
            >
              Discover Bangkok
            </Text>
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text style={DarkTheme.typography.title2}>🏛️</Text>
                <Text style={DarkTheme.typography.caption1}>Temples</Text>
              </View>
              <View className="items-center">
                <Text style={DarkTheme.typography.title2}>🍜</Text>
                <Text style={DarkTheme.typography.caption1}>Street Food</Text>
              </View>
              <View className="items-center">
                <Text style={DarkTheme.typography.title2}>🛍️</Text>
                <Text style={DarkTheme.typography.caption1}>Markets</Text>
              </View>
              <View className="items-center">
                <Text style={DarkTheme.typography.title2}>🌊</Text>
                <Text style={DarkTheme.typography.caption1}>River</Text>
              </View>
            </View>
          </View>

          {/* Navigation Buttons */}
          <View className="mb-8">
            <Text 
              style={[
                DarkTheme.typography.title3,
                { marginBottom: DarkTheme.spacing.lg }
              ]}
            >
              Explore
            </Text>
            <View className="gap-y-3">
              {navigationButtons.map((button, index) => (
                <Button
                  key={index}
                  title={button.title}
                  icon={
                    <Icon 
                      name={button.icon} 
                      size={20} 
                      color={DarkTheme.colors.system.white}
                      style={{ marginRight: DarkTheme.spacing.sm }}
                    />
                  }
                  buttonStyle={[
                    DarkTheme.componentStyles.Button.buttonStyle,
                    { 
                      backgroundColor: button.color,
                      justifyContent: 'flex-start',
                      paddingHorizontal: DarkTheme.spacing.lg,
                    }
                  ]}
                  titleStyle={[
                    DarkTheme.componentStyles.Button.titleStyle,
                    { textAlign: 'left', flex: 1 }
                  ]}
                  onPress={button.onPress}
                />
              ))}
            </View>
          </View>

          {/* Sign Out Section */}
          <View className="mt-auto pt-6">
            <Button
              title="Sign Out"
              icon={
                <Icon 
                  name="logout" 
                  size={20} 
                  color={DarkTheme.colors.system.white}
                  style={{ marginRight: DarkTheme.spacing.sm }}
                />
              }
              buttonStyle={[
                DarkTheme.componentStyles.Button.buttonStyle,
                { 
                  backgroundColor: DarkTheme.colors.status.error,
                  justifyContent: 'center',
                }
              ]}
              titleStyle={DarkTheme.componentStyles.Button.titleStyle}
              onPress={signOut}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 