/**
 * Demo script to showcase Google Places Cache vs API logging
 * Run with: node scripts/demo-cache-logging.js
 * 
 * This script demonstrates the difference between:
 * 🗄️ Database cache hits (FREE)
 * 🟢 Google API calls (PAID)
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simulate the cache service logging behavior
class DemoCacheService {
  async simulateCacheHit(placeId, placeName) {
    console.log('🗄️ CACHE HIT: Retrieved from database cache', {
      googlePlaceId: placeId.substring(0, 20) + '...',
      name: placeName,
      cost: '$0.000 - FREE!',
      accessCount: Math.floor(Math.random() * 50) + 1,
      cachedAt: new Date().toISOString()
    });
  }

  async simulateApiCall(placeId, placeName) {
    console.log('🟢 GOOGLE API CALL: Fresh data from Google Places API', {
      googlePlaceId: placeId.substring(0, 20) + '...',
      name: placeName,
      cost: '$0.017 per 1000 calls - PAID',
      hasPhotos: true,
      rating: (Math.random() * 2 + 3).toFixed(1),
      nowCached: true
    });
  }

  async simulateBatchOperation(places) {
    const cachedCount = Math.floor(places.length * 0.7); // 70% cache hit rate
    const apiCount = places.length - cachedCount;
    
    console.log(`🗄️ BATCH CACHE CHECK: ${cachedCount} found in cache, ${apiCount} need Google API calls`);
    
    // Simulate cached places
    for (let i = 0; i < cachedCount; i++) {
      await this.simulateCacheHit(places[i].id, places[i].name);
      await this.delay(50); // Small delay for readability
    }
    
    // Simulate API calls for missing places
    for (let i = cachedCount; i < places.length; i++) {
      if (i > cachedCount) {
        console.log('⏱️ Rate limiting: Waiting 100ms before next Google API call...');
        await this.delay(100);
      }
      await this.simulateApiCall(places[i].id, places[i].name);
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function demonstrateLogging() {
  console.log('🎯 Google Places Cache Logging Demonstration\n');
  console.log('📝 Console Log Legend:');
  console.log('   🗄️ = Database cache operations (FREE)');
  console.log('   🟢 = Google API calls (PAID)');
  console.log('   ⏱️ = Rate limiting between API calls');
  console.log('');

  const demo = new DemoCacheService();

  // Demo 1: Single place - cache hit
  console.log('📍 Demo 1: Popular place (cache hit)');
  await demo.simulateCacheHit('ChIJN1t_tDeuEmsRUsoyG83frY4', 'Sydney Opera House');
  console.log('');

  // Demo 2: Single place - API call
  console.log('📍 Demo 2: New place (API call required)');
  await demo.simulateApiCall('ChIJP3Sa8ziYEmsRUNoVmyS7ACA', 'Sydney Harbour Bridge');
  console.log('');

  // Demo 3: Batch operation
  console.log('📍 Demo 3: Batch operation (mixed cache hits and API calls)');
  const places = [
    { id: 'ChIJrTLr-GyuEmsRBfy61i59si0', name: 'Bondi Beach' },
    { id: 'ChIJ68aBlEKuEmsRHUA9oME5Zh0', name: 'Darling Harbour' },
    { id: 'ChIJISz8NjyuEmsRFTQ9Iw7Ear8', name: 'The Rocks' },
    { id: 'ChIJrx_ErYeuEmsR6_wDBrEOlxs', name: 'Royal Botanic Gardens' },
    { id: 'ChIJ90260rCuEmsRkubos-jOYRA', name: 'Circular Quay' }
  ];
  
  await demo.simulateBatchOperation(places);
  console.log('');

  // Demo 4: Cache maintenance
  console.log('📍 Demo 4: Cache maintenance operation');
  console.log('🗄️ CACHE MAINTENANCE: Cleared 23 expired entries from database');
  console.log('');

  // Summary
  console.log('✅ Demo completed!');
  console.log('');
  console.log('💡 Key Benefits:');
  console.log('   • Cache hits are instant and free');
  console.log('   • API calls are logged with cost information');
  console.log('   • Batch operations show efficiency gains');
  console.log('   • Rate limiting prevents quota exhaustion');
  console.log('');
  console.log('📊 Expected Performance:');
  console.log('   • 70-90% cache hit rate for popular places');
  console.log('   • 50-80% faster response times');
  console.log('   • Significant cost savings on Google Places API');
}

// Test database connectivity
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('google_places_cache')
      .select('google_place_id')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🧪 Testing database connection...\n');
  
  const connected = await testConnection();
  if (!connected) {
    console.log('⚠️ Database connection failed, but proceeding with demo...\n');
  }
  
  await demonstrateLogging();
}

main().catch(console.error); 