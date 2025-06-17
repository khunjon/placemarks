#!/usr/bin/env node

/**
 * Test script for background location retry functionality
 * 
 * This script helps demonstrate how the background location service works
 * when the app falls back to Bangkok (default) location.
 * 
 * Usage:
 * - Run the app on a device or simulator
 * - Disable location permissions to force fallback to Bangkok
 * - Navigate to the Decide screen
 * - You should see "Using Bangkok (trying to get real location...)" with a gold spinner
 * - Enable location permissions in settings
 * - The app should automatically update to your real location within 30-120 seconds
 * 
 * Features tested:
 * 1. Fallback to Bangkok when location permissions are denied
 * 2. Background retry attempts every 2 minutes
 * 3. Immediate retry when permissions are granted
 * 4. Visual indicators showing fallback status
 * 5. Automatic update across all screens when real location is found
 */

console.log('🧪 Background Location Retry Test Guide');
console.log('=====================================');
console.log('');
console.log('1. 📱 Launch the Placemarks app');
console.log('2. ❌ Disable location permissions in device settings');
console.log('3. 🏠 Navigate to the Decide screen');
console.log('4. 👀 Look for these indicators:');
console.log('   - Gold MapPin icon (instead of gray)');
console.log('   - Gold spinner next to the location');
console.log('   - Text: "Using Bangkok (trying to get real location...)"');
console.log('');
console.log('5. ✅ Enable location permissions in device settings');
console.log('6. ⏱️  Wait up to 2 minutes for automatic retry');
console.log('7. 🎯 Or tap the Sparkles icon to force immediate retry');
console.log('');
console.log('Expected behavior:');
console.log('- App should automatically detect location permission change');
console.log('- Background service retries every 2 minutes (max 10 attempts)');
console.log('- Visual indicators update when real location is found');
console.log('- All screens using location are updated simultaneously');
console.log('');
console.log('Debug logs to watch for:');
console.log('- "🔄 LocationService: Using fallback, starting background retries"');
console.log('- "🔄 LocationService: Retry attempt X/10"');
console.log('- "✅ LocationService: Background retry successful!"');
console.log('- "🔄 useLocation: Global service got real location, updating from fallback"');
console.log('');
console.log('Manual testing steps:');
console.log('1. Test with location completely disabled');
console.log('2. Test with location enabled but accuracy set to low');
console.log('3. Test moving between different screens while retrying');
console.log('4. Test force retry button when using fallback');
console.log('5. Test app backgrounding/foregrounding during retry');
console.log('');
console.log('Technical details:');
console.log('- Retry interval: 2 minutes');
console.log('- Max retry attempts: 10');
console.log('- Min delay between retries: 30 seconds');
console.log('- Immediate retry after 30 seconds when fallback starts');
console.log('- Global service coordinates retries across all location hooks');
console.log('');
console.log('Files involved:');
console.log('- src/services/locationService.ts (Global retry coordinator)');
console.log('- src/hooks/useLocation.ts (Location hook with service integration)');
console.log('- src/screens/DecideScreen.tsx (UI indicators and force retry)');
console.log('');
console.log('🚀 Ready to test! Look for the indicators mentioned above.'); 