# Places Architecture Simplification Design Document

## Overview

This document outlines the migration from a complex dual-table places system (UUID-based `places` + `google_places_cache`) to a simplified hybrid architecture using Google Place IDs as universal identifiers.

## Current Problems

1. **Complexity**: Dual table system requires complex sync logic
2. **Performance**: Multiple joins required for basic place data
3. **Development Friction**: Constant UUID ↔ Google Place ID conversion
4. **Maintenance**: Complex `upsert_place_with_rich_data` functions
5. **Recommendations Issues**: Mixing UUID places with Google Place ID recommendations

## New Architecture

### Core Principle
- **Google Place ID becomes the universal identifier** across all tables
- **Google Places Cache** stores all Google-sourced data
- **Editorial Places** stores admin-curated overrides and custom fields
- **Most operations** only interact with Google Places Cache
- **Editorial layer** only used for place detail enhancement

### Table Structure

#### 1. `google_places_cache` (Primary Data Source)
```sql
-- Remains largely the same, this becomes the main places table
CREATE TABLE google_places_cache (
  google_place_id TEXT PRIMARY KEY,
  name TEXT,
  formatted_address TEXT,
  geometry JSONB,
  types TEXT[],
  rating DECIMAL(3,2),
  user_ratings_total INTEGER,
  price_level INTEGER,
  formatted_phone_number TEXT,
  website TEXT,
  opening_hours JSONB,
  photos JSONB,
  photo_urls TEXT[],
  reviews JSONB,
  business_status TEXT,
  -- Cache management
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  -- Data completeness flags
  has_basic_data BOOLEAN DEFAULT FALSE,
  has_contact_data BOOLEAN DEFAULT FALSE,
  has_hours_data BOOLEAN DEFAULT FALSE,
  has_photos_data BOOLEAN DEFAULT FALSE,
  has_reviews_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `editorial_places` (Admin Overrides)
```sql
-- New table for admin-managed editorial content
CREATE TABLE editorial_places (
  google_place_id TEXT PRIMARY KEY REFERENCES google_places_cache(google_place_id),
  
  -- Editorial overrides
  custom_description TEXT,
  featured_image_url TEXT,
  recommended_dish TEXT,
  pro_tips TEXT,
  editorial_notes TEXT,
  
  -- Admin metadata
  is_featured BOOLEAN DEFAULT FALSE,
  admin_tags TEXT[],
  priority_score INTEGER DEFAULT 0,
  
  -- City-specific context
  city_context JSONB DEFAULT '{}',
  
  -- Management
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);
```

#### 3. Updated Foreign Key Tables
```sql
-- All tables now reference google_place_id directly
ALTER TABLE check_ins ALTER COLUMN place_id TYPE TEXT;
ALTER TABLE list_places ALTER COLUMN place_id TYPE TEXT;
ALTER TABLE user_place_ratings ALTER COLUMN place_id TYPE TEXT;

-- Update foreign key constraints
ALTER TABLE check_ins 
  DROP CONSTRAINT check_ins_place_id_fkey,
  ADD CONSTRAINT check_ins_place_id_fkey 
  FOREIGN KEY (place_id) REFERENCES google_places_cache(google_place_id);

-- Similar for other tables...
```

### Data Access Patterns

#### 1. List Management (Most Common)
```sql
-- Simple query, no joins needed
SELECT * FROM google_places_cache 
WHERE google_place_id = ANY($1);
```

#### 2. Place Detail Page (Enhanced)
```sql
-- View that combines Google data with editorial overrides
CREATE VIEW enriched_places AS
SELECT 
  gpc.*,
  ep.custom_description,
  ep.featured_image_url,
  ep.recommended_dish,
  ep.pro_tips,
  ep.is_featured,
  ep.city_context,
  COALESCE(ep.featured_image_url, gpc.photo_urls[1]) as primary_image_url,
  CASE 
    WHEN ep.custom_description IS NOT NULL THEN ep.custom_description
    ELSE gpc.reviews->>0->>'text' 
  END as display_description
FROM google_places_cache gpc
LEFT JOIN editorial_places ep ON gpc.google_place_id = ep.google_place_id;
```

#### 3. Search and Recommendations
```sql
-- Direct queries on google_places_cache
SELECT * FROM google_places_cache 
WHERE ST_DWithin(geometry, $1, $2) 
AND business_status = 'OPERATIONAL'
ORDER BY rating DESC;
```

## Migration Benefits

1. **Simplified Codebase**: No more UUID conversion logic
2. **Better Performance**: Single table queries for most operations
3. **Consistent IDs**: Frontend always works with Google Place IDs
4. **Easier Debugging**: Single source of truth for place data
5. **Future-Proof**: Editorial layer allows custom enhancements
6. **Admin-Friendly**: Clear separation between Google data and editorial content

## Migration Risks & Mitigations

### Risk: Google Place ID Changes
- **Mitigation**: Google provides migration paths and advance notice
- **Fallback**: Can add mapping table if needed in future

### Risk: Admin App Breakage
- **Mitigation**: Detailed migration instructions and step-by-step guide
- **Timing**: Can be fixed after mobile app migration is complete

### Risk: Data Loss During Migration
- **Mitigation**: Comprehensive backup and rollback plan
- **Testing**: Full migration test on development environment first

## Implementation Phases

### Phase 1: Database Schema Changes
1. Create `editorial_places` table
2. Add Google Place ID columns to foreign key tables
3. Migrate data from UUID references to Google Place IDs
4. Update constraints and indexes

### Phase 2: Application Code Updates
1. Update TypeScript types
2. Modify service layer to use Google Place IDs
3. Update React Native components
4. Test all place-related functionality

### Phase 3: Admin App Migration
1. Provide detailed migration guide
2. Update admin queries to use Google Place IDs
3. Implement editorial place management UI

### Phase 4: Cleanup
1. Remove old `places` table
2. Remove UUID-related code
3. Update documentation

## Success Metrics

- [ ] All place operations use Google Place IDs
- [ ] No more UUID ↔ Google Place ID conversion code
- [ ] Single table queries for list management
- [ ] Editorial overrides working on place detail pages
- [ ] Admin app successfully migrated
- [ ] No data loss during migration
- [ ] Performance improvements measurable

## Rollback Plan

If migration fails:
1. Restore database from backup
2. Revert code changes via git
3. Re-enable UUID system
4. Document lessons learned

## Next Steps

See the detailed implementation guide in the next section for step-by-step prompts and instructions. 