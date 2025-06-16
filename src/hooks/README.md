# Location Hooks

## useLocation

A React hook for handling location permissions, getting current location, and managing location state with proper error handling and fallback behavior.

### Features

- ✅ Automatic permission handling
- ✅ Graceful error handling with user-friendly messages
- ✅ Fallback to Bangkok center when location is unavailable
- ✅ Loading states and retry functionality
- ✅ TypeScript support
- ✅ Configurable accuracy and behavior

### Basic Usage

```tsx
import { useLocation } from '../hooks/useLocation';

function MyComponent() {
  const {
    location,
    loading,
    error,
    hasPermission,
    isLocationAvailable,
    isUsingFallback,
    retry,
    requestPermission,
  } = useLocation();

  if (loading) {
    return <Text>Getting your location...</Text>;
  }

  if (error) {
    return (
      <View>
        <Text>{error}</Text>
        <Button title="Try Again" onPress={retry} />
      </View>
    );
  }

  return (
    <View>
      <Text>
        Location: {location?.latitude}, {location?.longitude}
      </Text>
      {isUsingFallback && (
        <Text>Using Bangkok as default location</Text>
      )}
    </View>
  );
}
```

### Advanced Usage

```tsx
import { useLocation } from '../hooks/useLocation';

function AdvancedLocationComponent() {
  const {
    location,
    loading,
    error,
    hasPermission,
    isLocationAvailable,
    isUsingFallback,
    retry,
    requestPermission,
    clearError,
    formatDistance,
    calculateDistance,
  } = useLocation({
    enableHighAccuracy: false, // Use balanced accuracy for better battery life
    fallbackToBangkok: true,   // Use Bangkok center as fallback
    autoRequest: true,         // Automatically request location on mount
  });

  // Calculate distance to a specific place
  const targetLocation = { latitude: 13.7563, longitude: 100.5018 };
  const distance = location 
    ? calculateDistance(location, targetLocation)
    : null;

  return (
    <View>
      {loading && <Text>Finding your location...</Text>}
      
      {error && (
        <View>
          <Text style={{ color: 'red' }}>{error}</Text>
          <Button title="Retry" onPress={retry} />
          <Button title="Clear Error" onPress={clearError} />
        </View>
      )}
      
      {location && (
        <View>
          <Text>📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>
          
          {isUsingFallback && (
            <Text style={{ color: 'orange' }}>
              Using Bangkok as default. Enable location for personalized results.
            </Text>
          )}
          
          {distance && (
            <Text>Distance to Bangkok center: {formatDistance(distance)}</Text>
          )}
          
          {!hasPermission && (
            <Button 
              title="Enable Location" 
              onPress={requestPermission} 
            />
          )}
        </View>
      )}
    </View>
  );
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableHighAccuracy` | boolean | `true` | Use high accuracy GPS (may drain battery faster) |
| `timeout` | number | `15000` | Timeout for location requests (ms) |
| `maximumAge` | number | `300000` | Maximum age of cached location (ms) |
| `fallbackToBangkok` | boolean | `true` | Use Bangkok center when location unavailable |
| `autoRequest` | boolean | `true` | Automatically request location on mount |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `location` | `LocationCoords \| null` | Current location coordinates |
| `loading` | boolean | Whether location is being fetched |
| `error` | `string \| null` | User-friendly error message |
| `permissionStatus` | `Location.PermissionStatus \| null` | Current permission status |
| `hasPermission` | boolean | Whether location permission is granted |
| `isLocationAvailable` | boolean | Whether location is available |
| `isUsingFallback` | boolean | Whether using fallback location |
| `requestPermission` | function | Request location permission |
| `getCurrentLocation` | function | Get current location (with force refresh option) |
| `retry` | function | Retry getting location |
| `clearError` | function | Clear error state |
| `checkPermissionStatus` | function | Check current permission status |
| `formatDistance` | function | Format distance for display |
| `calculateDistance` | function | Calculate distance between coordinates |

### Error Handling

The hook provides user-friendly error messages for common scenarios:

- **Permission Denied**: "Location access is disabled. Please enable it in your device settings..."
- **Location Unavailable**: "Location services are not available. Please check your device settings."
- **Timeout**: "Location request timed out. Please try again."
- **Network Error**: "Network error. Please check your internet connection and try again."

### Integration with City Context

```tsx
import { useLocation } from '../hooks/useLocation';
import { createCityContext } from '../services/cityContext';

function CityAwareComponent() {
  const { location, isLocationAvailable } = useLocation();
  
  const cityContext = location ? createCityContext(location) : null;
  
  return (
    <View>
      {cityContext?.isInBangkok ? (
        <Text>You're in Bangkok! 🇹🇭</Text>
      ) : (
        <Text>Exploring somewhere else 🌍</Text>
      )}
    </View>
  );
}
``` 