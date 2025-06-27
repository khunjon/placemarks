-- Database Migration Validation Script
-- Tests the migration from UUID-based to Google Place ID architecture
-- Run this script after migration to validate all changes

-- =====================================================
-- 1. DATA INTEGRITY CHECKS
-- =====================================================

\echo '=== 1. DATA INTEGRITY VALIDATION ==='

-- Check for null Google Place IDs (should be minimal)
\echo '1.1. Checking for null Google Place IDs...'
SELECT 
  'google_places_cache' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN google_place_id IS NULL THEN 1 END) as null_google_place_ids,
  ROUND(COUNT(CASE WHEN google_place_id IS NULL THEN 1 END) * 100.0 / COUNT(*), 2) as null_percentage
FROM google_places_cache
UNION ALL
SELECT 
  'check_ins' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN place_id IS NULL THEN 1 END) as null_place_ids,
  ROUND(COUNT(CASE WHEN place_id IS NULL THEN 1 END) * 100.0 / COUNT(*), 2) as null_percentage
FROM check_ins
UNION ALL
SELECT 
  'list_places' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN place_id IS NULL THEN 1 END) as null_place_ids,
  ROUND(COUNT(CASE WHEN place_id IS NULL THEN 1 END) * 100.0 / COUNT(*), 2) as null_percentage
FROM list_places
UNION ALL
SELECT 
  'user_ratings' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN place_id IS NULL THEN 1 END) as null_place_ids,
  ROUND(COUNT(CASE WHEN place_id IS NULL THEN 1 END) * 100.0 / COUNT(*), 2) as null_percentage
FROM user_ratings;

-- Check Google Place ID format (should all start with "ChIJ")
\echo '1.2. Validating Google Place ID format...'
SELECT 
  'google_places_cache' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN google_place_id LIKE 'ChIJ%' THEN 1 END) as valid_format_count,
  ROUND(COUNT(CASE WHEN google_place_id LIKE 'ChIJ%' THEN 1 END) * 100.0 / COUNT(*), 2) as valid_format_percentage
FROM google_places_cache
WHERE google_place_id IS NOT NULL;

-- Check for duplicate Google Place IDs in cache
\echo '1.3. Checking for duplicate Google Place IDs in cache...'
SELECT 
  google_place_id,
  COUNT(*) as duplicate_count
FROM google_places_cache
WHERE google_place_id IS NOT NULL
GROUP BY google_place_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

-- =====================================================
-- 2. FOREIGN KEY RELATIONSHIP VALIDATION
-- =====================================================

\echo '=== 2. FOREIGN KEY RELATIONSHIP VALIDATION ==='

-- Check check_ins -> google_places_cache relationship
\echo '2.1. Validating check_ins foreign key relationships...'
SELECT 
  'check_ins -> google_places_cache' as relationship,
  ci.total_check_ins,
  ci.valid_references,
  ci.invalid_references,
  ROUND(ci.valid_references * 100.0 / ci.total_check_ins, 2) as valid_percentage
FROM (
  SELECT 
    COUNT(*) as total_check_ins,
    COUNT(gpc.google_place_id) as valid_references,
    COUNT(*) - COUNT(gpc.google_place_id) as invalid_references
  FROM check_ins c
  LEFT JOIN google_places_cache gpc ON c.place_id = gpc.google_place_id
  WHERE c.place_id IS NOT NULL
) ci;

-- Check list_places -> google_places_cache relationship
\echo '2.2. Validating list_places foreign key relationships...'
SELECT 
  'list_places -> google_places_cache' as relationship,
  lp.total_list_places,
  lp.valid_references,
  lp.invalid_references,
  ROUND(lp.valid_references * 100.0 / lp.total_list_places, 2) as valid_percentage
FROM (
  SELECT 
    COUNT(*) as total_list_places,
    COUNT(gpc.google_place_id) as valid_references,
    COUNT(*) - COUNT(gpc.google_place_id) as invalid_references
  FROM list_places lp
  LEFT JOIN google_places_cache gpc ON lp.place_id = gpc.google_place_id
  WHERE lp.place_id IS NOT NULL
) lp;

-- Check user_ratings -> google_places_cache relationship
\echo '2.3. Validating user_ratings foreign key relationships...'
SELECT 
  'user_ratings -> google_places_cache' as relationship,
  ur.total_ratings,
  ur.valid_references,
  ur.invalid_references,
  ROUND(ur.valid_references * 100.0 / ur.total_ratings, 2) as valid_percentage
FROM (
  SELECT 
    COUNT(*) as total_ratings,
    COUNT(gpc.google_place_id) as valid_references,
    COUNT(*) - COUNT(gpc.google_place_id) as invalid_references
  FROM user_ratings ur
  LEFT JOIN google_places_cache gpc ON ur.place_id = gpc.google_place_id
  WHERE ur.place_id IS NOT NULL
) ur;

-- Show orphaned records that reference non-existent Google Place IDs
\echo '2.4. Finding orphaned records...'
-- Orphaned check-ins
SELECT 'orphaned_check_ins' as type, COUNT(*) as count
FROM check_ins c
LEFT JOIN google_places_cache gpc ON c.place_id = gpc.google_place_id
WHERE c.place_id IS NOT NULL AND gpc.google_place_id IS NULL
UNION ALL
-- Orphaned list places
SELECT 'orphaned_list_places' as type, COUNT(*) as count
FROM list_places lp
LEFT JOIN google_places_cache gpc ON lp.place_id = gpc.google_place_id
WHERE lp.place_id IS NOT NULL AND gpc.google_place_id IS NULL
UNION ALL
-- Orphaned user ratings
SELECT 'orphaned_user_ratings' as type, COUNT(*) as count
FROM user_ratings ur
LEFT JOIN google_places_cache gpc ON ur.place_id = gpc.google_place_id
WHERE ur.place_id IS NOT NULL AND gpc.google_place_id IS NULL;

-- =====================================================
-- 3. ENRICHED_PLACES VIEW VALIDATION
-- =====================================================

\echo '=== 3. ENRICHED_PLACES VIEW VALIDATION ==='

-- Check that enriched_places view is accessible and returns data
\echo '3.1. Testing enriched_places view accessibility...'
SELECT 
  COUNT(*) as total_enriched_places,
  COUNT(CASE WHEN google_place_id IS NOT NULL THEN 1 END) as with_google_place_id,
  COUNT(CASE WHEN name IS NOT NULL THEN 1 END) as with_name,
  COUNT(CASE WHEN geometry IS NOT NULL THEN 1 END) as with_geometry,
  COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_places,
  COUNT(CASE WHEN has_editorial_content = true THEN 1 END) as with_editorial_content
FROM enriched_places;

-- Test a few sample records from enriched_places
\echo '3.2. Sample enriched_places records...'
SELECT 
  google_place_id,
  name,
  rating,
  price_level,
  is_featured,
  has_editorial_content,
  LENGTH(display_description) as description_length
FROM enriched_places
WHERE google_place_id IS NOT NULL
ORDER BY rating DESC NULLS LAST
LIMIT 5;

-- Check editorial data integration
\echo '3.3. Editorial data integration check...'
SELECT 
  COUNT(*) as total_places,
  COUNT(CASE WHEN ep.custom_description IS NOT NULL THEN 1 END) as with_custom_description,
  COUNT(CASE WHEN ep.featured_image_url IS NOT NULL THEN 1 END) as with_featured_image,
  COUNT(CASE WHEN ep.is_featured = true THEN 1 END) as featured_count,
  ROUND(COUNT(CASE WHEN ep.is_featured = true THEN 1 END) * 100.0 / COUNT(*), 2) as featured_percentage
FROM enriched_places ep;

-- =====================================================
-- 4. POSTGIS FUNCTIONS VALIDATION
-- =====================================================

\echo '=== 4. POSTGIS FUNCTIONS VALIDATION ==='

-- Test spatial queries work with new schema
\echo '4.1. Testing PostGIS spatial functions...'

-- Test basic distance calculation (Bangkok center)
WITH test_location AS (
  SELECT 13.7563 as lat, 100.5018 as lng
)
SELECT 
  'spatial_query_test' as test_name,
  COUNT(*) as places_found,
  MIN(ST_Distance(
    ST_GeogFromText('POINT(' || 100.5018 || ' ' || 13.7563 || ')'),
    ST_GeogFromText('POINT(' || 
      (geometry->>'location'->>'lng')::float || ' ' || 
      (geometry->>'location'->>'lat')::float || ')')
  )) as min_distance_meters,
  MAX(ST_Distance(
    ST_GeogFromText('POINT(' || 100.5018 || ' ' || 13.7563 || ')'),
    ST_GeogFromText('POINT(' || 
      (geometry->>'location'->>'lng')::float || ' ' || 
      (geometry->>'location'->>'lat')::float || ')')
  )) as max_distance_meters
FROM google_places_cache
WHERE geometry IS NOT NULL
  AND geometry->>'location'->>'lat' IS NOT NULL 
  AND geometry->>'location'->>'lng' IS NOT NULL
  AND ST_Distance(
    ST_GeogFromText('POINT(' || 100.5018 || ' ' || 13.7563 || ')'),
    ST_GeogFromText('POINT(' || 
      (geometry->>'location'->>'lng')::float || ' ' || 
      (geometry->>'location'->>'lat')::float || ')')
  ) < 50000; -- Within 50km of Bangkok center

-- Test PostGIS function for recommendations
\echo '4.2. Testing get_google_places_within_radius function...'
SELECT 
  'get_google_places_within_radius' as function_name,
  COUNT(*) as places_returned
FROM get_google_places_within_radius(
  13.7563, -- Bangkok center lat
  100.5018, -- Bangkok center lng  
  15, -- 15km radius
  10, -- limit 10 places
  ARRAY[]::text[] -- no exclusions
);

-- Test place availability functions
\echo '4.3. Testing place availability functions...'
SELECT 
  'has_minimum_places_within_radius' as function_name,
  has_minimum_places_within_radius(
    13.7563, -- Bangkok center lat
    100.5018, -- Bangkok center lng
    15000, -- 15km radius in meters
    5 -- minimum 5 places
  ) as has_enough_places;

SELECT 
  'count_places_within_radius' as function_name,
  count_places_within_radius(
    13.7563, -- Bangkok center lat
    100.5018, -- Bangkok center lng
    15000 -- 15km radius in meters
  ) as place_count;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) VALIDATION
-- =====================================================

\echo '=== 5. ROW LEVEL SECURITY VALIDATION ==='

-- Check RLS is enabled on tables
\echo '5.1. Checking RLS status on tables...'
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('check_ins', 'lists', 'list_places', 'user_ratings', 'editorial_places')
ORDER BY tablename;

-- Check RLS policies exist
\echo '5.2. Checking RLS policies...'
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('check_ins', 'lists', 'list_places', 'user_ratings', 'editorial_places')
ORDER BY tablename, policyname;

-- Test that google_places_cache is accessible (should be public)
\echo '5.3. Testing google_places_cache accessibility...'
SELECT 
  'google_places_cache_access' as test_name,
  COUNT(*) as accessible_records
FROM google_places_cache
LIMIT 1;

-- =====================================================
-- 6. INDEX VALIDATION
-- =====================================================

\echo '=== 6. INDEX VALIDATION ==='

-- Check critical indexes exist
\echo '6.1. Checking critical indexes...'
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%google_place_id%' OR
    indexname LIKE '%place_id%' OR
    indexname LIKE '%geometry%' OR
    indexname LIKE '%location%'
  )
ORDER BY tablename, indexname;

-- Check PostGIS spatial indexes
\echo '6.2. Checking PostGIS spatial indexes...'
SELECT 
  schemaname,
  tablename,
  attname,
  indexname,
  indisunique as is_unique
FROM pg_indexes pi
JOIN pg_class pc ON pc.relname = pi.indexname
JOIN pg_index i ON i.indexrelid = pc.oid
JOIN pg_class pt ON pt.oid = i.indrelid
JOIN pg_attribute pa ON pa.attrelid = pt.oid AND pa.attnum = ANY(i.indkey)
WHERE pi.schemaname = 'public'
  AND (pa.attname LIKE '%geometry%' OR pa.attname LIKE '%location%')
ORDER BY tablename, indexname;

-- Check index usage statistics (if available)
\echo '6.3. Index usage statistics...'
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('google_places_cache', 'check_ins', 'list_places', 'user_ratings')
ORDER BY idx_scan DESC;

-- =====================================================
-- 7. PERFORMANCE VALIDATION
-- =====================================================

\echo '=== 7. PERFORMANCE VALIDATION ==='

-- Test query performance on key operations
\echo '7.1. Testing key query performance...'

-- Time a spatial query
\timing on
EXPLAIN (ANALYZE, BUFFERS) 
SELECT google_place_id, name, rating
FROM google_places_cache
WHERE ST_DWithin(
  ST_GeogFromText('POINT(' || 
    (geometry->>'location'->>'lng')::float || ' ' || 
    (geometry->>'location'->>'lat')::float || ')'),
  ST_GeogFromText('POINT(100.5018 13.7563)'),
  15000 -- 15km
)
LIMIT 10;

-- Time enriched_places view query
EXPLAIN (ANALYZE, BUFFERS)
SELECT google_place_id, name, rating, display_description
FROM enriched_places
WHERE rating > 4.0
LIMIT 10;
\timing off

-- =====================================================
-- 8. DATA CONSISTENCY CHECKS
-- =====================================================

\echo '=== 8. DATA CONSISTENCY VALIDATION ==='

-- Check for inconsistent data
\echo '8.1. Checking data consistency...'

-- Places with invalid coordinates
SELECT 
  'invalid_coordinates' as issue_type,
  COUNT(*) as count
FROM google_places_cache
WHERE geometry IS NOT NULL
  AND (
    (geometry->>'location'->>'lat')::float < -90 OR 
    (geometry->>'location'->>'lat')::float > 90 OR
    (geometry->>'location'->>'lng')::float < -180 OR 
    (geometry->>'location'->>'lng')::float > 180
  )
UNION ALL
-- Places with invalid ratings
SELECT 
  'invalid_ratings' as issue_type,
  COUNT(*) as count
FROM google_places_cache
WHERE rating IS NOT NULL
  AND (rating < 0 OR rating > 5)
UNION ALL
-- Places with invalid price levels
SELECT 
  'invalid_price_levels' as issue_type,
  COUNT(*) as count
FROM google_places_cache
WHERE price_level IS NOT NULL
  AND (price_level < 0 OR price_level > 4);

-- Check referential integrity across all relationships
\echo '8.2. Cross-table referential integrity...'
SELECT 
  'check_ins_with_valid_places' as metric,
  COUNT(CASE WHEN gpc.google_place_id IS NOT NULL THEN 1 END) as valid_count,
  COUNT(*) as total_count,
  ROUND(COUNT(CASE WHEN gpc.google_place_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as integrity_percentage
FROM check_ins ci
LEFT JOIN google_places_cache gpc ON ci.place_id = gpc.google_place_id
WHERE ci.place_id IS NOT NULL
UNION ALL
SELECT 
  'list_places_with_valid_places' as metric,
  COUNT(CASE WHEN gpc.google_place_id IS NOT NULL THEN 1 END) as valid_count,
  COUNT(*) as total_count,
  ROUND(COUNT(CASE WHEN gpc.google_place_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as integrity_percentage
FROM list_places lp
LEFT JOIN google_places_cache gpc ON lp.place_id = gpc.google_place_id
WHERE lp.place_id IS NOT NULL;

-- =====================================================
-- 9. MIGRATION SUMMARY REPORT
-- =====================================================

\echo '=== 9. MIGRATION SUMMARY REPORT ==='

-- Overall data summary
\echo '9.1. Overall data summary...'
SELECT 
  'Total Google Places' as metric,
  COUNT(*) as count,
  'Primary place data repository' as description
FROM google_places_cache
UNION ALL
SELECT 
  'Total Check-ins' as metric,
  COUNT(*) as count,
  'User check-ins linked to Google Place IDs' as description
FROM check_ins
UNION ALL
SELECT 
  'Total Lists' as metric,
  COUNT(*) as count,
  'User-created lists' as description
FROM lists
UNION ALL
SELECT 
  'Total List Places' as metric,
  COUNT(*) as count,
  'Places in lists linked to Google Place IDs' as description
FROM list_places
UNION ALL
SELECT 
  'Total User Ratings' as metric,
  COUNT(*) as count,
  'User ratings linked to Google Place IDs' as description
FROM user_ratings
UNION ALL
SELECT 
  'Total Editorial Places' as metric,
  COUNT(*) as count,
  'Editorial content for places' as description
FROM editorial_places;

-- Migration health score
\echo '9.2. Migration health score...'
WITH migration_metrics AS (
  SELECT 
    -- Data integrity (40 points)
    LEAST(40, 
      ROUND(
        (COUNT(CASE WHEN google_place_id IS NOT NULL THEN 1 END) * 40.0) / COUNT(*)
      )
    ) as data_integrity_score,
    
    -- Valid format score (20 points)  
    LEAST(20,
      ROUND(
        (COUNT(CASE WHEN google_place_id LIKE 'ChIJ%' THEN 1 END) * 20.0) / 
        GREATEST(COUNT(CASE WHEN google_place_id IS NOT NULL THEN 1 END), 1)
      )
    ) as format_score
  FROM google_places_cache
),
foreign_key_metrics AS (
  SELECT 
    -- Foreign key integrity (40 points)
    LEAST(40,
      ROUND(
        ((
          (SELECT COUNT(gpc.google_place_id) FROM check_ins ci 
           LEFT JOIN google_places_cache gpc ON ci.place_id = gpc.google_place_id 
           WHERE ci.place_id IS NOT NULL) +
          (SELECT COUNT(gpc.google_place_id) FROM list_places lp 
           LEFT JOIN google_places_cache gpc ON lp.place_id = gpc.google_place_id 
           WHERE lp.place_id IS NOT NULL)
        ) * 40.0) / 
        GREATEST((
          (SELECT COUNT(*) FROM check_ins WHERE place_id IS NOT NULL) +
          (SELECT COUNT(*) FROM list_places WHERE place_id IS NOT NULL)
        ), 1)
      )
    ) as foreign_key_score
)
SELECT 
  mm.data_integrity_score,
  mm.format_score, 
  fkm.foreign_key_score,
  (mm.data_integrity_score + mm.format_score + fkm.foreign_key_score) as total_score,
  CASE 
    WHEN (mm.data_integrity_score + mm.format_score + fkm.foreign_key_score) >= 95 THEN 'EXCELLENT'
    WHEN (mm.data_integrity_score + mm.format_score + fkm.foreign_key_score) >= 85 THEN 'GOOD'
    WHEN (mm.data_integrity_score + mm.format_score + fkm.foreign_key_score) >= 70 THEN 'FAIR'
    ELSE 'NEEDS_ATTENTION'
  END as migration_status
FROM migration_metrics mm, foreign_key_metrics fkm;

\echo '=== MIGRATION VALIDATION COMPLETE ==='
\echo 'Review the results above to ensure migration was successful.'
\echo 'Key things to check:'
\echo '- Health score should be EXCELLENT (95+) or GOOD (85+)'
\echo '- Foreign key integrity should be close to 100%'
\echo '- No or minimal orphaned records'
\echo '- All critical indexes are present'
\echo '- PostGIS functions return expected results'