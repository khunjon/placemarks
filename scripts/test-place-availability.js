/**
 * Test script for Place Availability Service
 * Demonstrates efficient geographic place counting using PostGIS
 */

const { placeAvailabilityService, placeAvailabilityUtils } = require('../src/services/placeAvailability');

async function testPlaceAvailability() {
  console.log('🧪 TESTING PLACE AVAILABILITY SERVICE');
  console.log('=====================================\n');

  try {
    // Test locations in Thailand
    const testLocations = [
      { name: 'Bangkok Center', latitude: 13.7563, longitude: 100.5018 },
      { name: 'Chiang Mai', latitude: 18.7883, longitude: 98.9853 },
      { name: 'Phuket', latitude: 7.8804, longitude: 98.3923 },
      { name: 'Remote Area', latitude: 15.0, longitude: 101.0 }
    ];

    console.log('📍 TESTING INDIVIDUAL LOCATIONS:');
    console.log('================================\n');

    for (const location of testLocations) {
      console.log(`🏙️ Testing: ${location.name}`);
      console.log(`   Coordinates: ${location.latitude}, ${location.longitude}`);
      
      // Check if location is in supported area
      const isSupported = placeAvailabilityUtils.isInSupportedArea(location.latitude, location.longitude);
      console.log(`   Supported area: ${isSupported ? '✅ Yes' : '❌ No'}`);
      
      try {
        // Check place availability with default settings (15km, 5 places)
        const result = await placeAvailabilityService.checkPlaceAvailability(
          location.latitude, 
          location.longitude
        );
        
        console.log(`   Result: ${result.hasEnoughPlaces ? '✅' : '❌'} ${placeAvailabilityUtils.formatAvailabilityMessage(result)}`);
        
        // Get radius recommendation if needed
        const radiusRec = placeAvailabilityUtils.getRadiusRecommendation(result);
        if (radiusRec) {
          console.log(`   💡 Suggestion: ${radiusRec}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }

    // Test with Bangkok center - detailed analysis
    console.log('📊 DETAILED ANALYSIS FOR BANGKOK:');
    console.log('=================================\n');
    
    const bangkokLat = 13.7563;
    const bangkokLng = 100.5018;
    
    // Get statistics for different radii
    const stats = await placeAvailabilityService.getPlaceAvailabilityStats(bangkokLat, bangkokLng);
    
    console.log('Places found at different radii:');
    stats.forEach(stat => {
      console.log(`   ${stat.radiusKm}km radius: ${stat.placeCount} places`);
    });
    console.log('');

    // Test different minimum place requirements
    console.log('📋 TESTING DIFFERENT REQUIREMENTS:');
    console.log('==================================\n');
    
    const requirements = [3, 5, 10, 20];
    
    for (const minPlaces of requirements) {
      const result = await placeAvailabilityService.checkPlaceAvailability(
        bangkokLat, 
        bangkokLng,
        { minimumPlaces: minPlaces }
      );
      
      const status = result.hasEnoughPlaces ? '✅ Available' : '❌ Not enough';
      console.log(`   ${minPlaces}+ places needed: ${status} (found ${result.placeCount})`);
    }
    console.log('');

    // Test different radii
    console.log('🎯 TESTING DIFFERENT RADII:');
    console.log('===========================\n');
    
    const radii = [5, 10, 15, 20, 25]; // km
    
    for (const radiusKm of radii) {
      const radiusMeters = radiusKm * 1000;
      const result = await placeAvailabilityService.getPlaceCount(
        bangkokLat, 
        bangkokLng, 
        radiusMeters
      );
      
      console.log(`   ${radiusKm}km radius: ${result.count} places`);
    }
    console.log('');

    // Test multiple locations at once
    console.log('🌍 TESTING MULTIPLE LOCATIONS:');
    console.log('==============================\n');
    
    const multipleResults = await placeAvailabilityService.checkMultipleLocations(
      testLocations.map(loc => ({ latitude: loc.latitude, longitude: loc.longitude }))
    );
    
    multipleResults.forEach((result, index) => {
      const location = testLocations[index];
      const status = result.hasEnoughPlaces ? '✅' : '❌';
      console.log(`   ${location.name}: ${status} ${result.placeCount} places`);
    });
    console.log('');

    // Test edge cases
    console.log('⚠️ TESTING EDGE CASES:');
    console.log('======================\n');
    
    try {
      // Test invalid coordinates
      await placeAvailabilityService.checkPlaceAvailability(200, 200);
    } catch (error) {
      console.log(`   ✅ Invalid coordinates handled: ${error.message}`);
    }
    
    try {
      // Test invalid radius
      await placeAvailabilityService.getPlaceCount(13.7563, 100.5018, 200000);
    } catch (error) {
      console.log(`   ✅ Invalid radius handled: ${error.message}`);
    }
    
    try {
      // Test invalid minimum places
      await placeAvailabilityService.checkPlaceAvailability(13.7563, 100.5018, { minimumPlaces: -1 });
    } catch (error) {
      console.log(`   ✅ Invalid minimum places handled: ${error.message}`);
    }

    console.log('\n✅ PLACE AVAILABILITY TEST COMPLETED');
    console.log('====================================');
    console.log('Key features demonstrated:');
    console.log('  • Fast PostGIS-based geographic queries');
    console.log('  • Configurable radius and minimum place requirements');
    console.log('  • Multiple location checking');
    console.log('  • Detailed statistics and analysis');
    console.log('  • Proper error handling and validation');
    console.log('  • Utility functions for display and recommendations');

  } catch (error) {
    console.error('❌ Error in place availability test:', error);
  }
}

// Run the test
if (require.main === module) {
  testPlaceAvailability();
}

module.exports = { testPlaceAvailability }; 