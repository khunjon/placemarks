# Places Architecture Migration - Implementation Guide

## Pre-Migration Checklist

- [ ] Read and understand `places-architecture-simplification.md`
- [ ] Create full database backup
- [ ] Test migration on development/staging environment first
- [ ] Ensure admin app is documented for future migration
- [ ] Have rollback plan ready

## Phase 1: Database Schema Migration

### Step 1.1: Create Editorial Places Table

**Prompt for Claude:**
```
Create a new database migration file to add the `editorial_places` table. This table should store admin-curated content that can override or enhance Google Places data. Include the following fields:

- google_place_id (TEXT, primary key, references google_places_cache)
- custom_description (TEXT, nullable)
- featured_image_url (TEXT, nullable) 
- recommended_dish (TEXT, nullable)
- pro_tips (TEXT, nullable)
- editorial_notes (TEXT, nullable)
- is_featured (BOOLEAN, default false)
- admin_tags (TEXT[], nullable)
- priority_score (INTEGER, default 0)
- city_context (JSONB, default '{}')
- created_at, updated_at timestamps
- created_by, updated_by (UUID references to users)

Include proper indexes and RLS policies for admin access only.
```

### Step 1.2: Add Google Place ID Columns to Foreign Key Tables

**Prompt for Claude:**
```
Create a database migration to add temporary google_place_id columns to all tables that currently reference places by UUID:

- check_ins: Add google_place_id_temp TEXT column
- list_places: Add google_place_id_temp TEXT column  
- user_place_ratings: Add google_place_id_temp TEXT column

These will be populated from the existing places table mapping, then the old place_id columns will be dropped and these renamed.
```

### Step 1.3: Populate Google Place ID Columns

**Prompt for Claude:**
```
Create a database migration to populate the new google_place_id_temp columns by joining with the existing places table:

UPDATE check_ins SET google_place_id_temp = p.google_place_id 
FROM places p WHERE check_ins.place_id = p.id;

Do this for all three tables (check_ins, list_places, user_place_ratings). Include validation queries to ensure no data loss.
```

### Step 1.4: Switch Foreign Key Columns

**Prompt for Claude:**
```
Create a database migration to:
1. Drop old foreign key constraints on place_id columns
2. Drop the old place_id columns (UUID type)
3. Rename google_place_id_temp columns to place_id
4. Add new foreign key constraints referencing google_places_cache(google_place_id)
5. Update all indexes that referenced the old place_id columns

Ensure this migration is reversible with a DOWN migration.
```

### Step 1.5: Create Enriched Places View

**Prompt for Claude:**
```
Create a database migration to add the enriched_places view that combines google_places_cache with editorial_places data. The view should:

- Show all fields from google_places_cache
- Left join editorial_places to include custom fields when available
- Include computed fields like primary_image_url (editorial override or first Google photo)
- Include display_description (editorial override or excerpt from reviews)
- Only show places where business_status = 'OPERATIONAL'

This view will be used by the place detail screens.
```

## Phase 2: TypeScript Types Update

### Step 2.1: Update Core Types

**Prompt for Claude:**
```
Update the TypeScript types in src/types/ to reflect the new architecture:

1. Update Place interface to use google_place_id as the primary identifier (remove id UUID field)
2. Create new EditorialPlace interface for the editorial_places table
3. Create EnrichedPlace interface that combines Google Places data with editorial overrides
4. Update all place-related types to use string (Google Place ID) instead of UUID
5. Update database types to match the new schema

Make sure to maintain backward compatibility where possible during transition.
```

### Step 2.2: Update Service Layer Types

**Prompt for Claude:**
```
Update all service files in src/services/ to use Google Place IDs instead of UUIDs:

1. Update placesService to work with Google Place IDs
2. Update listsService to reference places by Google Place ID
3. Update checkInsService to use Google Place IDs
4. Update userRatingsService to use Google Place IDs
5. Remove any UUID conversion logic
6. Update all function signatures and return types

Focus on places.ts, listsService.ts, checkInsService.ts, and userRatingsService.ts files.
```

## Phase 3: Application Code Migration

### Step 3.1: Update Places Service

**Prompt for Claude:**
```
Refactor src/services/places.ts to work with the new architecture:

1. Remove all UUID-related code and upsert_place_with_rich_data functions
2. Update place creation/caching to work directly with google_places_cache
3. Add function to get enriched place data (using the enriched_places view)
4. Update search functions to return Google Place IDs
5. Simplify place detail fetching to use single table queries
6. Remove complex place enhancement logic

The service should be much simpler now with direct google_places_cache queries.
```

### Step 3.2: Update Lists Service

**Prompt for Claude:**
```
Update src/services/listsService.ts to work with Google Place IDs:

1. Update addPlaceToList to accept Google Place ID instead of UUID
2. Update removePlaceFromList to work with Google Place IDs
3. Update getListPlaces to return places with Google Place IDs
4. Simplify queries since no UUID conversion is needed
5. Update all list-related operations to work with the new schema

The list operations should be much simpler now.
```

### Step 3.3: Update Check-ins Service

**Prompt for Claude:**
```
Update src/services/checkInsService.ts to work with Google Place IDs:

1. Update createCheckIn to accept Google Place ID for place reference
2. Update getUserCheckIns to return places with Google Place IDs
3. Update getCheckInDetails to work with new schema
4. Remove any place UUID lookup logic
5. Simplify all check-in related queries

Check-ins should now directly reference Google Place IDs.
```

### Step 3.4: Update User Ratings Service

**Prompt for Claude:**
```
Update src/services/userRatingsService.ts to work with Google Place IDs:

1. Update rating creation/update to use Google Place ID
2. Update getUserRating to work with Google Place IDs
3. Update getUserRatings to return simplified data
4. Remove UUID conversion logic
5. Simplify all rating-related operations

This should resolve the UUID/Google Place ID conflicts we had with recommendations.
```

## Phase 4: React Native Components Update

### Step 4.1: Update Place Components

**Prompt for Claude:**
```
Update React Native components in src/components/places/ to work with Google Place IDs:

1. Update PlaceCard to work with Google Place ID as identifier
2. Update PlaceAutocomplete to return Google Place IDs
3. Update any place selection components
4. Remove UUID-related props and state
5. Update navigation parameters to use Google Place IDs

Components should be simpler without UUID conversion.
```

### Step 4.2: Update Place Detail Screen

**Prompt for Claude:**
```
Update src/screens/places/PlaceDetailScreen.tsx to use the new enriched places data:

1. Accept Google Place ID as route parameter instead of UUID
2. Use enriched_places view to get both Google and editorial data
3. Display editorial overrides (custom description, featured image, etc.) when available
4. Update rating functionality to work with Google Place IDs
5. Simplify data loading since no joins are needed

The screen should now handle editorial enhancements seamlessly.
```

### Step 4.3: Update Lists Screens

**Prompt for Claude:**
```
Update list-related screens in src/screens/lists/ to work with Google Place IDs:

1. Update ListDetailScreen to work with Google Place IDs
2. Update AddPlaceToListScreen to use Google Place IDs
3. Update list creation/editing to work with new schema
4. Remove UUID-related logic from list management
5. Update place selection for lists

List management should be much simpler now.
```

### Step 4.4: Update Check-in Screens

**Prompt for Claude:**
```
Update check-in screens in src/screens/checkins/ to work with Google Place IDs:

1. Update CheckInFormScreen to work with Google Place IDs
2. Update CheckInDetailScreen to use new schema
3. Update check-in search to work with Google Place IDs
4. Remove place UUID lookup logic
5. Update place selection for check-ins

Check-in flow should be simplified without UUID conversion.
```

## Phase 5: Recommendations Integration

### Step 5.1: Fix Recommendations Service

**Prompt for Claude:**
```
Update src/services/recommendationService.ts to work seamlessly with the new architecture:

1. Remove the Google Place ID to UUID conversion logic
2. Update recommendations to return Google Place IDs directly
3. Update place availability checks to work with google_places_cache
4. Simplify recommendation scoring since everything uses Google Place IDs
5. Remove the complex place creation logic for recommendations

Recommendations should now work seamlessly with the rest of the app.
```

### Step 5.2: Update Recommendations Screen

**Prompt for Claude:**
```
Update src/screens/decide/RecommendationsScreen.tsx to work with Google Place IDs:

1. Remove Google Place ID to UUID conversion
2. Update place selection to work directly with Google Place IDs
3. Update navigation to place details using Google Place IDs
4. Remove the complex recommendation-to-place mapping logic
5. Simplify the entire recommendations flow

The recommendations should now integrate seamlessly with place details.
```

## Phase 6: Testing and Validation

### Step 6.1: Database Validation

**Prompt for Claude:**
```
Create a comprehensive test script to validate the database migration:

1. Verify all foreign key relationships are working
2. Check that no data was lost during migration
3. Validate that enriched_places view returns correct data
4. Test all PostGIS functions work with new schema
5. Verify RLS policies are working correctly
6. Check that all indexes are properly created

Include queries to count records before/after migration to ensure no data loss.
```

### Step 6.2: Application Testing

**Prompt for Claude:**
```
Create a testing checklist for the application functionality:

1. Test place search and selection
2. Test list creation and place addition/removal
3. Test check-in creation with place selection
4. Test place detail screens with editorial data
5. Test user ratings functionality
6. Test recommendations flow end-to-end
7. Test place caching and Google Places API integration

Include specific test scenarios that cover the most common user flows.
```

## Phase 7: Admin App Migration Guide

### Step 7.1: Admin App Schema Changes

**Create this as a separate document for the admin app team:**

```markdown
# Admin App Migration Guide

## Database Schema Changes

The places system has been simplified. Key changes:

1. **Primary Key Change**: Places now use Google Place ID (TEXT) instead of UUID
2. **Single Source**: google_places_cache is now the primary places table
3. **Editorial Layer**: New editorial_places table for admin overrides
4. **Foreign Keys**: All place references now use Google Place ID

## Required Admin App Changes

1. Update all place queries to use Google Place ID
2. Use enriched_places view for place display
3. Update curated list management to work with Google Place IDs
4. Implement editorial_places management UI
5. Update place search and selection components

## Migration Steps for Admin App

[Include specific step-by-step instructions for admin app]
```

## Phase 8: Cleanup

### Step 8.1: Remove Old Code

**Prompt for Claude:**
```
Clean up the codebase by removing old UUID-based place code:

1. Remove the old places table (after confirming migration success)
2. Remove UUID conversion utility functions
3. Remove complex place enhancement functions
4. Remove deprecated type definitions
5. Update documentation to reflect new architecture
6. Remove any unused imports or dead code

Ensure no references to the old UUID system remain.
```

### Step 8.2: Update Documentation

**Prompt for Claude:**
```
Update all documentation to reflect the new simplified architecture:

1. Update README.md with new schema information
2. Update API documentation if applicable
3. Update the database schema documentation
4. Update any developer guides
5. Create migration completion summary

Ensure future developers understand the simplified system.
```

## Success Validation

After completing all phases, verify:

- [ ] All place operations use Google Place IDs
- [ ] No UUID conversion code remains
- [ ] Place detail screens show editorial enhancements
- [ ] Lists work with Google Place IDs
- [ ] Check-ins work with Google Place IDs
- [ ] User ratings work with Google Place IDs
- [ ] Recommendations integrate seamlessly
- [ ] Database queries are simplified
- [ ] Performance has improved
- [ ] Admin app migration guide is complete

## Rollback Procedure

If migration fails at any point:

1. **Stop immediately** and assess the issue
2. **Restore database** from pre-migration backup
3. **Revert code changes** using git
4. **Document the failure** and lessons learned
5. **Plan fixes** before attempting again

## Post-Migration Benefits

Once complete, you should see:

- **Simpler codebase** with less complexity
- **Better performance** from single-table queries
- **Easier debugging** with consistent identifiers
- **Seamless recommendations** integration
- **Future-proof editorial** capabilities
- **Easier admin app** development

The architecture will be much more maintainable and extensible going forward. 