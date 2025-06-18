/**
 * Test script for Enhanced Google Places Cache
 * Demonstrates configurable cache duration and soft expiry functionality
 */

const { googlePlacesCache } = require('../src/services/googlePlacesCache');

async function testEnhancedCache() {
  console.log('🧪 TESTING ENHANCED GOOGLE PLACES CACHE');
  console.log('==========================================\n');

  try {
    // Show current cache configuration
    const config = googlePlacesCache.getCacheConfig();
    console.log('📋 CACHE CONFIGURATION:');
    console.log(`   Cache Duration: ${config.cacheDurationDays} days`);
    console.log(`   Stale Threshold: ${config.staleCacheThresholdDays} days`);
    console.log(`   Soft Expiry: ${config.softExpiryEnabled ? 'Enabled' : 'Disabled'}`);
    console.log('');

    // Get cache statistics
    const stats = await googlePlacesCache.getCacheStats();
    console.log('📊 CACHE STATISTICS:');
    console.log(`   Total Entries: ${stats.totalEntries}`);
    console.log(`   Valid Entries: ${stats.validEntries}`);
    console.log(`   Expired Entries: ${stats.expiredEntries}`);
    console.log(`   Stale but Usable: ${stats.staleButUsableEntries}`);
    console.log(`   Top Places: ${stats.topPlaces.slice(0, 3).map(p => p.name).join(', ')}`);
    console.log('');

    // Demonstrate soft expiry logging
    console.log('🎯 SOFT EXPIRY DEMONSTRATION:');
    await googlePlacesCache.demonstrateLogging();
    console.log('');

    // Test with a real place ID if available
    const testPlaceId = process.env.TEST_GOOGLE_PLACE_ID;
    if (testPlaceId) {
      console.log('🏢 TESTING WITH REAL PLACE:');
      console.log(`   Place ID: ${testPlaceId.substring(0, 20)}...`);
      
      // Test normal cache behavior
      console.log('\n   🔍 Normal cache behavior (strict expiry):');
      const normalResult = await googlePlacesCache.getPlaceDetails(testPlaceId, false, false);
      
      // Test soft expiry behavior
      console.log('\n   🔍 Soft expiry behavior (for recommendations):');
      const softResult = await googlePlacesCache.getPlaceDetails(testPlaceId, false, true);
      
      console.log(`   ✅ Both requests completed successfully`);
    } else {
      console.log('💡 To test with real data, set TEST_GOOGLE_PLACE_ID environment variable');
    }

    console.log('\n✅ ENHANCED CACHE TEST COMPLETED');
    console.log('Key improvements:');
    console.log('  • Configurable cache duration (default 90 days)');
    console.log('  • Soft expiry for recommendations (uses stale data)');
    console.log('  • Enhanced cache statistics');
    console.log('  • Backwards compatible with existing code');

  } catch (error) {
    console.error('❌ Error testing enhanced cache:', error);
  }
}

// Run the test
if (require.main === module) {
  testEnhancedCache();
}

module.exports = { testEnhancedCache }; 