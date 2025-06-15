# Supabase MCP Guide for Placemarks

This guide explains how to use Supabase MCP (Model Context Protocol) with your Placemarks project for efficient database operations and management.

## What is Supabase MCP?

Supabase MCP is a protocol that allows you to interact with your Supabase database through intelligent commands, making database operations more efficient and context-aware.

## Setup Complete ✅

Your Placemarks project is now fully configured with Supabase MCP:

- ✅ Supabase CLI installed and authenticated
- ✅ Project linked to remote Supabase instance (`lyldvspxpdqpatqnlkyf`)
- ✅ Database schema deployed via MCP migrations
- ✅ PostGIS enabled for spatial operations
- ✅ All tables and functions working correctly

## Key MCP Commands Used

### 1. Project Initialization
```bash
# Initialize Supabase in project
supabase init

# Login to Supabase
supabase login

# Link to remote project
supabase link --project-ref lyldvspxpdqpatqnlkyf
```

### 2. Database Schema Management
```bash
# Push migrations to remote database
supabase db push

# Generate new migration
supabase migration new migration_name

# Reset local database (requires Docker)
supabase db reset
```

### 3. Migration Files Created
- `supabase/migrations/20241215000000_initial_schema.sql` - Main database schema
- `supabase/migrations/20241215000001_enable_postgis.sql` - PostGIS extension
- `supabase/migrations/20241215000002_fix_coordinates.sql` - PostGIS geometry setup

## Database Schema Overview

### Tables Created via MCP
1. **users** - User profiles with social auth support
2. **places** - Bangkok places with PostGIS coordinates
3. **check_ins** - User check-ins with rich context
4. **lists** - User-created place lists
5. **list_places** - Junction table for list-place relationships
6. **recommendation_requests** - AI recommendation tracking

### Functions Created via MCP
1. **get_user_check_ins_with_places()** - Get user check-ins with place details
2. **search_places_near_location()** - PostGIS spatial search

### Security Features
- Row Level Security (RLS) enabled on all user tables
- Comprehensive security policies
- User data isolation

## Using MCP in Development

### Database Operations
```javascript
// Your existing services use MCP-deployed schema
import { supabase } from '../services/supabase';

// These work because of MCP deployment:
const { data: places } = await supabase
  .rpc('search_places_near_location', {
    lat: 13.7563,
    lng: 100.5018,
    radius_meters: 5000
  });

const { data: checkIns } = await supabase
  .rpc('get_user_check_ins_with_places', {
    user_uuid: userId
  });
```

### Testing Database
```bash
# Test all database functionality
npm run test-db

# Setup database (shows deployment instructions)
npm run setup-db
```

## Advanced MCP Features

### 1. Spatial Queries (PostGIS)
Your database now supports advanced spatial operations:
- Distance calculations
- Radius searches
- Geographic indexing
- Bangkok-specific location intelligence

### 2. Real-time Subscriptions
```javascript
// Subscribe to real-time changes
const subscription = supabase
  .channel('places_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'places'
  }, (payload) => {
    console.log('Place updated:', payload);
  })
  .subscribe();
```

### 3. Batch Operations
```javascript
// Efficient batch inserts via MCP
const { data, error } = await supabase
  .from('check_ins')
  .insert([
    { user_id: userId, place_id: place1, rating: 5 },
    { user_id: userId, place_id: place2, rating: 4 },
    // ... more check-ins
  ]);
```

## MCP Best Practices

### 1. Migration Management
- Always create migrations for schema changes
- Test migrations locally when possible
- Use descriptive migration names
- Keep migrations atomic and reversible

### 2. Function Development
- Use `SECURITY DEFINER` for functions that need elevated privileges
- Always handle errors in PL/pgSQL functions
- Use proper parameter types and return types

### 3. Performance Optimization
- Use PostGIS indexes for spatial queries
- Create appropriate indexes for frequently queried columns
- Use RPC functions for complex queries

## Troubleshooting MCP Issues

### Common Issues and Solutions

1. **Connection Errors**
   ```bash
   # Re-authenticate if needed
   supabase login
   
   # Check project link
   supabase projects list
   ```

2. **Migration Failures**
   ```bash
   # Check migration syntax
   supabase db push --debug
   
   # View migration status
   supabase migration list
   ```

3. **Function Errors**
   - Check PostgreSQL logs in Supabase dashboard
   - Verify function syntax and parameter types
   - Test functions in SQL editor

## Next Steps

Now that your Supabase MCP setup is complete, you can:

1. **Implement Authentication Flows**
   - Use the deployed user table
   - Set up OAuth providers in Supabase dashboard

2. **Add Place Data**
   - Import Bangkok places using Google Places API
   - Use PostGIS functions for location-based features

3. **Build Recommendation Engine**
   - Leverage the recommendation_requests table
   - Use spatial queries for location-based suggestions

4. **Set up Real-time Features**
   - Use Supabase subscriptions for live updates
   - Implement collaborative features

## Configuration Files

### supabase/config.toml
Your project configuration is automatically managed by MCP. Key settings:
- Database version: PostgreSQL 17
- PostGIS enabled
- Auth configuration
- API settings

### Environment Variables
Make sure these are set in your `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://lyldvspxpdqpatqnlkyf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Monitoring and Analytics

Use Supabase dashboard to monitor:
- Database performance
- API usage
- Real-time connections
- Storage usage

Your Placemarks project is now ready for full-scale development with Supabase MCP! 🚀 