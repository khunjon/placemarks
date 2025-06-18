import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAnalytics } from '../hooks/useAnalytics';
import { navigationTrackingService } from '../services/navigationTracking';
import { SCREEN_NAMES, NAVIGATION_METHODS } from '../constants/ScreenNames';

/**
 * Example component demonstrating navigation tracking features
 */
export default function NavigationTrackingExample() {
  const navigation = useNavigation();
  const analytics = useAnalytics(); // Automatic tracking enabled
  
  const [currentScreen, setCurrentScreen] = useState<string | null>(null);
  const [screenStats, setScreenStats] = useState<any>({});
  const [navigationState, setNavigationState] = useState<any>({});

  // Update current screen info
  useEffect(() => {
    const updateScreenInfo = () => {
      const current = analytics.getCurrentScreenName();
      const stats = analytics.getScreenUsageStats();
      const state = navigationTrackingService.getCurrentState();
      
      setCurrentScreen(current);
      setScreenStats(stats);
      setNavigationState(state);
    };

    // Update immediately
    updateScreenInfo();

    // Update every 2 seconds for demo purposes
    const interval = setInterval(updateScreenInfo, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Example navigation actions
  const handleNavigateToLists = () => {
    // This will be automatically tracked
    navigation.navigate('ListsStack' as any, { screen: 'Lists' });
  };

  const handleNavigateToProfile = () => {
    // This will be automatically tracked
    navigation.navigate('ProfileStack' as any, { screen: 'Profile' });
  };

  const handleManualTrackTabPress = async () => {
    // Example of manual tab tracking (normally automatic)
    await analytics.trackTabPress(SCREEN_NAMES.DECIDE);
    Alert.alert('Success', 'Tab press tracked manually!');
  };

  const handleManualTrackModal = async () => {
    // Example of tracking modal presentation
    await analytics.trackModalPresentation(SCREEN_NAMES.LISTS_CREATE_LIST, {
      source: 'example_button',
      context: 'demo',
    });
    Alert.alert('Success', 'Modal presentation tracked!');
  };

  const handleManualTrackBack = async () => {
    // Example of tracking back navigation
    await analytics.trackBackNavigation(SCREEN_NAMES.LISTS, 'back_button');
    Alert.alert('Success', 'Back navigation tracked!');
  };

  const handleTrackCustomScreen = async () => {
    // Example of tracking a custom screen event
    await analytics.trackCurrentScreen(
      SCREEN_NAMES.PLACE_DETAIL,
      NAVIGATION_METHODS.DEEP_LINK,
      {
        placeId: 'example_place_123',
        placeName: 'Demo Restaurant',
        source: 'deep_link',
      }
    );
    Alert.alert('Success', 'Custom screen tracked!');
  };

  const handleResetTracking = () => {
    navigationTrackingService.reset();
    setCurrentScreen(null);
    setScreenStats({});
    setNavigationState({});
    Alert.alert('Success', 'Navigation tracking reset!');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ color: '#fff', fontSize: 24, marginBottom: 20, textAlign: 'center' }}>
          Navigation Tracking Demo
        </Text>

        {/* Current State */}
        <View style={sectionStyle}>
          <Text style={headerStyle}>Current State</Text>
          <Text style={textStyle}>
            Current Screen: {currentScreen || 'None'}
          </Text>
          <Text style={textStyle}>
            Tracking Initialized: {navigationTrackingService.getCurrentState().isInitialized ? 'Yes' : 'No'}
          </Text>
          <Text style={textStyle}>
            Session History: {navigationState.sessionHistory?.length || 0} screens
          </Text>
        </View>

        {/* Navigation Actions */}
        <View style={sectionStyle}>
          <Text style={headerStyle}>Navigation Actions</Text>
          <Text style={subHeaderStyle}>These will be automatically tracked:</Text>
          
          <TouchableOpacity onPress={handleNavigateToLists} style={buttonStyle}>
            <Text style={buttonTextStyle}>Navigate to Lists</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNavigateToProfile} style={buttonStyle}>
            <Text style={buttonTextStyle}>Navigate to Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Manual Tracking Examples */}
        <View style={sectionStyle}>
          <Text style={headerStyle}>Manual Tracking</Text>
          <Text style={subHeaderStyle}>Examples of manual tracking (for special cases):</Text>
          
          <TouchableOpacity onPress={handleManualTrackTabPress} style={buttonStyle}>
            <Text style={buttonTextStyle}>Track Tab Press</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleManualTrackModal} style={buttonStyle}>
            <Text style={buttonTextStyle}>Track Modal Presentation</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleManualTrackBack} style={buttonStyle}>
            <Text style={buttonTextStyle}>Track Back Navigation</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTrackCustomScreen} style={buttonStyle}>
            <Text style={buttonTextStyle}>Track Custom Screen</Text>
          </TouchableOpacity>
        </View>

        {/* Screen Statistics */}
        <View style={sectionStyle}>
          <Text style={headerStyle}>Screen Usage Statistics</Text>
          {Object.keys(screenStats).length > 0 ? (
            Object.entries(screenStats).map(([screenName, stats]: [string, any]) => (
              <View key={screenName} style={{ marginBottom: 10, padding: 10, backgroundColor: '#333', borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{screenName}</Text>
                <Text style={{ color: '#ccc', fontSize: 12 }}>
                  Visits: {stats.visits} | Avg Time: {Math.round(stats.avgTime / 1000)}s
                </Text>
              </View>
            ))
          ) : (
            <Text style={textStyle}>No screen statistics available yet</Text>
          )}
        </View>

        {/* Navigation History */}
        <View style={sectionStyle}>
          <Text style={headerStyle}>Recent Navigation History</Text>
          {navigationState.sessionHistory?.length > 0 ? (
            navigationState.sessionHistory.slice(-5).reverse().map((session: any, index: number) => (
              <View key={index} style={{ marginBottom: 8, padding: 8, backgroundColor: '#333', borderRadius: 6 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                  {session.screenName}
                </Text>
                <Text style={{ color: '#ccc', fontSize: 12 }}>
                  Method: {session.navigationMethod}
                </Text>
                <Text style={{ color: '#ccc', fontSize: 12 }}>
                  Time: {new Date(session.startTime).toLocaleTimeString()}
                </Text>
                {session.previousScreen && (
                  <Text style={{ color: '#ccc', fontSize: 12 }}>
                    From: {session.previousScreen}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={textStyle}>No navigation history available</Text>
          )}
        </View>

        {/* Debug Actions */}
        <View style={sectionStyle}>
          <Text style={headerStyle}>Debug Actions</Text>
          
          <TouchableOpacity onPress={handleResetTracking} style={[buttonStyle, { backgroundColor: '#ff4444' }]}>
            <Text style={buttonTextStyle}>Reset Tracking</Text>
          </TouchableOpacity>
        </View>

        {/* Implementation Notes */}
        <View style={sectionStyle}>
          <Text style={headerStyle}>Implementation Notes</Text>
          <Text style={textStyle}>
            • Screen tracking is automatic via React Navigation listeners
          </Text>
          <Text style={textStyle}>
            • Time spent is calculated automatically
          </Text>
          <Text style={textStyle}>
            • Navigation methods are detected automatically
          </Text>
          <Text style={textStyle}>
            • Manual tracking is available for special cases
          </Text>
          <Text style={textStyle}>
            • All events are sent to Amplitude with proper context
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const sectionStyle = {
  marginBottom: 30,
  padding: 15,
  backgroundColor: '#222',
  borderRadius: 10,
};

const headerStyle = {
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold' as const,
  marginBottom: 10,
};

const subHeaderStyle = {
  color: '#ccc',
  fontSize: 14,
  marginBottom: 15,
  fontStyle: 'italic' as const,
};

const textStyle = {
  color: '#ccc',
  fontSize: 14,
  marginBottom: 5,
  lineHeight: 20,
};

const buttonStyle = {
  backgroundColor: '#007AFF',
  padding: 12,
  borderRadius: 8,
  marginBottom: 10,
  alignItems: 'center' as const,
};

const buttonTextStyle = {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600' as const,
}; 