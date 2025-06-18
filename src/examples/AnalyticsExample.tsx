import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../services/auth-context';
import { 
  useAnalytics, 
  usePerformanceTracking, 
  useErrorTracking,
  useSearchAnalytics,
  useUserJourneyAnalytics 
} from '../hooks/useAnalytics';
import { AnalyticsEventName } from '../types/analytics';

/**
 * Comprehensive example showing all analytics patterns
 * This demonstrates the key concepts you'll use throughout your app
 */
export default function AnalyticsExample() {
  const { user } = useAuth();
  
  // 1. Basic analytics with automatic screen tracking
  const analytics = useAnalytics();
  
  // 2. Performance tracking for API calls and operations
  const { trackAsyncOperation } = usePerformanceTracking();
  
  // 3. Error tracking with automatic context
  const { trackError } = useErrorTracking('AnalyticsExample');
  
  // 4. Search analytics
  const { trackSearch } = useSearchAnalytics();
  
  // 5. User journey analytics
  const { trackListViewed, trackPlaceViewed, trackCheckInViewed } = useUserJourneyAnalytics();
  
  const [data, setData] = useState<any[]>([]);

  // Example 1: Track API call performance
  const loadData = async () => {
    try {
      const result = await trackAsyncOperation(
        async () => {
          // Your actual API call here
          const response = await fetch('/api/data');
          return response.json();
        },
        'api_call',
        { endpoint: '/api/data', user_id: user?.id }
      );
      
      setData(result);
      
      // Update user properties based on loaded data
      await analytics.setUserProperties({
        total_lists: result.length,
        last_active_date: new Date().toISOString(),
      });
      
    } catch (error) {
      // Automatic error tracking with context
      trackError(error as Error, {
        errorType: 'network',
        actionAttempted: 'load_data',
      });
    }
  };

  // Example 2: Track user interactions
  const handleListCreated = async (listId: string, listName: string) => {
    try {
      // Use helper function for common events
      await analytics.trackListCreated(
        listId,
        listName,
        'personal',
        'manual',
        0
      );
      
      Alert.alert('Success', 'List created and tracked!');
      
    } catch (error) {
      trackError(error as Error, {
        errorType: 'unknown',
        actionAttempted: 'create_list',
      });
    }
  };

  // Example 3: Track place addition to list
  const handlePlaceAddedToList = async () => {
    try {
      await analytics.trackPlaceAddedToList(
        'list_123',
        'My Favorites',
        'place_456',
        'Amazing Restaurant',
        'search'
      );
      
      Alert.alert('Success', 'Place addition tracked!');
      
    } catch (error) {
      trackError(error as Error, {
        errorType: 'unknown',
        actionAttempted: 'add_place_to_list',
      });
    }
  };

  // Example 4: Track check-in creation
  const handleCheckInCreated = async () => {
    try {
      await analytics.trackCheckInCreated(
        'checkin_789',
        'place_456',
        'Amazing Restaurant',
        {
          rating: 5,
          hasPhoto: true,
          hasNote: true,
          source: 'manual',
          locationAccuracy: 5,
        }
      );
      
      Alert.alert('Success', 'Check-in tracked!');
      
    } catch (error) {
      trackError(error as Error, {
        errorType: 'unknown',
        actionAttempted: 'create_checkin',
      });
    }
  };

  // Example 5: Track search behavior
  const handleSearch = async (query: string) => {
    try {
      // Simulate search results
      const results = data.filter(item => 
        item.name?.toLowerCase().includes(query.toLowerCase())
      );
      
      // Track the search
      await trackSearch(query, 'places', results.length, 'main_search');
      
      // If user selects a result, track that too
      if (results.length > 0) {
        await trackSearch(query, 'places', results.length, 'main_search', 0);
      }
      
    } catch (error) {
      trackError(error as Error, {
        errorType: 'unknown',
        actionAttempted: 'search',
      });
    }
  };

  // Example 6: Track user journey events
  const handleListViewed = async () => {
    try {
      await trackListViewed(
        'list_123',
        'My Favorites',
        'personal',
        15,
        30000 // 30 seconds view duration
      );
      
      Alert.alert('Success', 'List view tracked!');
      
    } catch (error) {
      trackError(error as Error, {
        errorType: 'unknown',
        actionAttempted: 'view_list',
      });
    }
  };

  // Example 7: Track custom events with full control
  const handleCustomEvent = async () => {
    try {
      await analytics.track(AnalyticsEventName.PERFORMANCE, {
        event_type: 'screen_load',
        duration_ms: 1500,
        success: true,
        details: {
          screen_name: 'AnalyticsExample',
          data_loaded: true,
          cache_hit: false,
        },
        timestamp: Date.now(),
      } as any);
      
      Alert.alert('Success', 'Custom event tracked!');
      
    } catch (error) {
      trackError(error as Error, {
        errorType: 'unknown',
        actionAttempted: 'track_custom_event',
      });
    }
  };

  // Example 8: Track user identification (typically done once after login)
  const handleUserIdentification = async () => {
    if (!user) return;
    
    try {
      await analytics.identify(user.id, {
        user_id: user.id,
        email: user.email,
        signup_date: user.created_at,
        signup_method: 'email',
        total_places: 25,
        total_lists: 5,
        total_checkins: 12,
        last_active_date: new Date().toISOString(),
        preferred_location: 'Bangkok',
        notification_preferences: {
          push_enabled: true,
          email_enabled: false,
          location_reminders: true,
        },
        app_version: '1.0.0',
        device_type: 'ios',
        is_premium: false,
      });
      
      Alert.alert('Success', 'User identified!');
      
    } catch (error) {
      trackError(error as Error, {
        errorType: 'authentication',
        actionAttempted: 'identify_user',
      });
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#000' }}>
      <Text style={{ color: '#fff', fontSize: 24, marginBottom: 20 }}>
        Analytics Examples
      </Text>
      
      <Text style={{ color: '#ccc', marginBottom: 20 }}>
        This screen demonstrates all analytics patterns. Check your Amplitude dashboard to see events.
      </Text>

      {/* Example buttons */}
      <TouchableOpacity
        onPress={() => handleListCreated('list_' + Date.now(), 'Example List')}
        style={buttonStyle}
      >
        <Text style={buttonTextStyle}>Track List Creation</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handlePlaceAddedToList}
        style={buttonStyle}
      >
        <Text style={buttonTextStyle}>Track Place Added to List</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleCheckInCreated}
        style={buttonStyle}
      >
        <Text style={buttonTextStyle}>Track Check-in Creation</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleSearch('thai restaurant')}
        style={buttonStyle}
      >
        <Text style={buttonTextStyle}>Track Search</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleListViewed}
        style={buttonStyle}
      >
        <Text style={buttonTextStyle}>Track List Viewed</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleCustomEvent}
        style={buttonStyle}
      >
        <Text style={buttonTextStyle}>Track Custom Event</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleUserIdentification}
        style={buttonStyle}
      >
        <Text style={buttonTextStyle}>Identify User</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={loadData}
        style={buttonStyle}
      >
        <Text style={buttonTextStyle}>Track API Performance</Text>
      </TouchableOpacity>

      {/* Analytics status */}
      <View style={{ marginTop: 30, padding: 15, backgroundColor: '#333', borderRadius: 8 }}>
        <Text style={{ color: '#fff', fontSize: 16, marginBottom: 10 }}>
          Analytics Status
        </Text>
        <Text style={{ color: analytics.isInitialized() ? '#0f0' : '#f00' }}>
          Initialized: {analytics.isInitialized() ? 'Yes' : 'No'}
        </Text>
        <Text style={{ color: '#ccc', marginTop: 5 }}>
          User: {user?.email || 'Not logged in'}
        </Text>
      </View>
    </View>
  );
}

const buttonStyle = {
  backgroundColor: '#007AFF',
  padding: 15,
  borderRadius: 8,
  marginBottom: 10,
  alignItems: 'center' as const,
};

const buttonTextStyle = {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600' as const,
}; 