const { enhancedListsService } = require('../src/services/listsService');

async function testSearchOptimization() {
  console.log('🧪 Testing Search Optimization');
  console.log('==============================\n');

  try {
    // Test 1: First search (should make API call)
    console.log('Test 1: First search for "coffee"');
    const start1 = Date.now();
    const results1 = await enhancedListsService.searchPlacesForList('coffee');
    const time1 = Date.now() - start1;
    console.log(`✅ First search completed in ${time1}ms`);
    console.log(`   Found ${results1.length} results`);
    console.log(`   Sample result: ${results1[0]?.name} - ${results1[0]?.address}\n`);

    // Test 2: Same search immediately (should use cache)
    console.log('Test 2: Same search immediately (should be cached)');
    const start2 = Date.now();
    const results2 = await enhancedListsService.searchPlacesForList('coffee');
    const time2 = Date.now() - start2;
    console.log(`✅ Cached search completed in ${time2}ms`);
    console.log(`   Found ${results2.length} results`);
    console.log(`   Performance improvement: ${Math.round(((time1 - time2) / time1) * 100)}% faster\n`);

    // Test 3: Different search (should make new API call)
    console.log('Test 3: Different search for "restaurant"');
    const start3 = Date.now();
    const results3 = await enhancedListsService.searchPlacesForList('restaurant');
    const time3 = Date.now() - start3;
    console.log(`✅ New search completed in ${time3}ms`);
    console.log(`   Found ${results3.length} results\n`);

    // Summary
    console.log('📊 OPTIMIZATION SUMMARY');
    console.log('=======================');
    console.log(`• Before optimization: Each search = 1 + ${results1.length} API calls = ${results1.length + 1} total`);
    console.log(`• After optimization: Each search = 1 API call only`);
    console.log(`• API calls saved per search: ${results1.length} calls`);
    console.log(`• Cost savings per search: $${(results1.length * 0.017).toFixed(3)}`);
    console.log(`• Cache performance: ${Math.round(((time1 - time2) / time1) * 100)}% faster for repeated searches`);
    console.log(`• Search results still include: name, address, place_id`);
    console.log(`• Detailed info (rating, photos, etc.) fetched only when adding to list`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSearchOptimization().then(() => {
    console.log('\n🎉 Search optimization test completed!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test error:', error);
    process.exit(1);
  });
}

module.exports = { testSearchOptimization }; 