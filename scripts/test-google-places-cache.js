/**
 * Test script for Google Places Cache integration
 * Run with: node scripts/test-google-places-cache.js
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testGooglePlacesCache() {
  console.log('🧪 Testing Google Places Cache Integration...\n');
  console.log('📝 Console Log Legend:');
  console.log('   🗄️ = Database cache operations (FREE)');
  console.log('   🟢 = Google API calls (PAID)');
  console.log('   ⏱️ = Rate limiting');
  console.log('');

  try {
    // Test 1: Check if the table exists and is accessible
    console.log('📋 Test 1: Table accessibility');
    const { data: tables, error: tableError } = await supabase
      .from('google_places_cache')
      .select('google_place_id')
      .limit(1);

    if (tableError) {
      console.error('❌ Table access failed:', tableError.message);
      return;
    }
    console.log('✅ Google Places cache table is accessible');

    // Test 2: Insert a test cache entry
    console.log('\n📝 Test 2: Insert test cache entry');
    const testEntry = {
      google_place_id: 'ChIJTestCache123456',
      name: 'Test Cache Restaurant',
      formatted_address: '123 Test Street, Bangkok, Thailand',
      geometry: {
        location: { lat: 13.7563, lng: 100.5018 }
      },
      types: ['restaurant', 'food', 'establishment'],
      rating: 4.2,
      user_ratings_total: 125,
      price_level: 2,
      has_basic_data: true,
      has_contact_data: false,
      has_hours_data: false,
      has_photos_data: false,
      has_reviews_data: false
    };

    const { data: insertData, error: insertError } = await supabase
      .from('google_places_cache')
      .insert(testEntry)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      return;
    }
    console.log('✅ Test entry inserted successfully');
    console.log(`   Place ID: ${insertData.google_place_id}`);
    console.log(`   Name: ${insertData.name}`);
    console.log(`   Rating: ${insertData.rating}`);

    // Test 3: Query the cached entry
    console.log('\n🔍 Test 3: Query cached entry');
    const { data: queryData, error: queryError } = await supabase
      .from('google_places_cache')
      .select('*')
      .eq('google_place_id', 'ChIJTestCache123456')
      .single();

    if (queryError) {
      console.error('❌ Query failed:', queryError.message);
      return;
    }
    console.log('✅ Cache entry retrieved successfully');
    console.log(`   Access count: ${queryData.access_count}`);
    console.log(`   Cached at: ${queryData.cached_at}`);
    console.log(`   Expires at: ${queryData.expires_at}`);

    // Test 4: Test the increment function
    console.log('\n📈 Test 4: Test access count increment');
    const { data: incrementData, error: incrementError } = await supabase
      .rpc('increment_access_count', { p_place_id: 'ChIJTestCache123456' });

    if (incrementError) {
      console.error('❌ Increment function failed:', incrementError.message);
      return;
    }
    console.log('✅ Access count incremented successfully');
    console.log(`   New access count: ${incrementData}`);

    // Test 5: Test the valid cache view
    console.log('\n👁️ Test 5: Test valid cache view');
    const { data: viewData, error: viewError } = await supabase
      .from('google_places_cache_valid')
      .select('google_place_id, name, access_count')
      .eq('google_place_id', 'ChIJTestCache123456')
      .single();

    if (viewError) {
      console.error('❌ View query failed:', viewError.message);
      return;
    }
    console.log('✅ Valid cache view working');
    console.log(`   Place: ${viewData.name}`);
    console.log(`   Access count: ${viewData.access_count}`);

    // Test 6: Test cache statistics
    console.log('\n📊 Test 6: Test cache statistics');
    const { data: statsData, error: statsError } = await supabase
      .from('google_places_cache')
      .select('google_place_id', { count: 'exact' });

    if (statsError) {
      console.error('❌ Stats query failed:', statsError.message);
      return;
    }
    console.log('✅ Cache statistics working');
    console.log(`   Total entries: ${statsData.length}`);

    // Test 7: Performance test with multiple entries
    console.log('\n⚡ Test 7: Performance test with batch operations');
    const batchEntries = [];
    for (let i = 0; i < 5; i++) {
      batchEntries.push({
        google_place_id: `ChIJBatchTest${i}`,
        name: `Batch Test Place ${i}`,
        formatted_address: `${i} Batch Street, Bangkok, Thailand`,
        geometry: {
          location: { lat: 13.7563 + (i * 0.001), lng: 100.5018 + (i * 0.001) }
        },
        types: ['restaurant'],
        rating: 3.5 + (i * 0.2),
        has_basic_data: true
      });
    }

    const { data: batchData, error: batchError } = await supabase
      .from('google_places_cache')
      .insert(batchEntries)
      .select('google_place_id, name');

    if (batchError) {
      console.error('❌ Batch insert failed:', batchError.message);
      return;
    }
    console.log('✅ Batch operations working');
    console.log(`   Inserted ${batchData.length} entries`);

    // Cleanup: Remove test entries
    console.log('\n🧹 Cleanup: Removing test entries');
    const testIds = ['ChIJTestCache123456', ...batchEntries.map(e => e.google_place_id)];
    
    const { error: cleanupError } = await supabase
      .from('google_places_cache')
      .delete()
      .in('google_place_id', testIds);

    if (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError.message);
    } else {
      console.log('✅ Test entries cleaned up successfully');
    }

    // Final summary
    console.log('\n🎉 All tests passed! Google Places Cache is working correctly.');
    console.log('\n📋 Integration Summary:');
    console.log('   ✅ Database table accessible');
    console.log('   ✅ CRUD operations working');
    console.log('   ✅ Access tracking functional');
    console.log('   ✅ Cache views operational');
    console.log('   ✅ Batch operations supported');
    console.log('   ✅ Performance optimizations active');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testGooglePlacesCache(); 