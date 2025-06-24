const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MOBILE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const ADMIN_API_KEY = process.env.ADMIN_GOOGLE_PLACES_API_KEY; // Your admin API key

async function fixPhotoApiKeys() {
  console.log('🔧 Starting photo API key standardization...');
  
  try {
    // Find all places with admin API key in photo URLs
    const { data: placesWithWrongKey, error: fetchError } = await supabase
      .from('places')
      .select('id, name, google_place_id, photos_urls')
      .not('photos_urls', 'is', null)
      .textSearch('photos_urls', ADMIN_API_KEY);

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${placesWithWrongKey.length} places with admin API key`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const place of placesWithWrongKey) {
      try {
        // Get correct photo URLs from google_places_cache
        const { data: cacheData, error: cacheError } = await supabase
          .from('google_places_cache')
          .select('photo_urls')
          .eq('google_place_id', place.google_place_id)
          .single();

        if (cacheError || !cacheData?.photo_urls) {
          console.log(`⚠️ No cache data for ${place.name}, skipping`);
          continue;
        }

        // Update place with mobile API key URLs
        const { error: updateError } = await supabase
          .from('places')
          .update({ photos_urls: cacheData.photo_urls })
          .eq('id', place.id);

        if (updateError) throw updateError;

        console.log(`✅ Fixed ${place.name}`);
        fixedCount++;

      } catch (error) {
        console.error(`❌ Error fixing ${place.name}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`✅ Fixed: ${fixedCount} places`);
    console.log(`❌ Errors: ${errorCount} places`);
    console.log(`🎉 Photo API key standardization complete!`);

  } catch (error) {
    console.error('💥 Script failed:', error);
  }
}

// Run the script
fixPhotoApiKeys(); 