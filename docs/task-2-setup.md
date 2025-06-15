# Task 2: Supabase Backend Setup with MCP

This document guides you through setting up the Supabase backend infrastructure for the Placemarks app.

## 🎯 Overview

Task 2 implements:
- Complete database schema with Bangkok-specific features
- Row Level Security (RLS) policies
- Database functions for efficient queries
- Typed Supabase client with full CRUD operations
- MCP integration for database operations

## 📋 Prerequisites

1. **Supabase Account**: Create account at [supabase.com](https://supabase.com)
2. **Environment Variables**: Set up your `.env` file
3. **Database Schema**: Ready to deploy

## 🚀 Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and project name: "placemarks"
4. Set database password (save this!)
5. Choose region closest to Bangkok (Singapore recommended)
6. Wait for project creation (~2 minutes)

### 2. Configure Environment Variables

Copy `env.example` to `.env` and fill in your credentials:

```bash
cp env.example .env
```

Get your credentials from Supabase Dashboard > Settings > API:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-places-key
```

### 3. Deploy Database Schema

#### Option A: Using Supabase Dashboard (Recommended)

1. Open Supabase Dashboard > SQL Editor
2. Copy contents from `database/schema.sql`
3. Paste into SQL Editor
4. Click "Run" to execute

#### Option B: Using Setup Script

```bash
npm run setup-db
```

This will show you instructions and the schema to copy.

### 4. Verify Setup

Test your database connection:

```bash
npm run test-db
```

This will verify:
- ✅ Database connection
- ✅ All tables created
- ✅ Database functions working
- ✅ Authentication system

## 🗄️ Database Schema

### Tables Created

1. **users** - User profiles with social auth support
2. **places** - Location data with Bangkok context
3. **check_ins** - User visits with rich context
4. **lists** - User-created place collections
5. **list_places** - Junction table for list-place relationships
6. **recommendation_requests** - AI recommendation tracking

### Key Features

- **PostGIS Integration**: Spatial queries for location-based features
- **JSONB Fields**: Flexible Bangkok context and user preferences
- **Row Level Security**: User data protection
- **Optimized Indexes**: Fast queries for location and user data
- **Custom Functions**: Efficient complex queries

### Database Functions

#### `search_places_near_location(lat, lng, radius_meters)`
Finds places within radius of coordinates with distance calculation.

```sql
SELECT * FROM search_places_near_location(13.7563, 100.5018, 5000);
```

#### `get_user_check_ins_with_places(user_uuid)`
Gets user check-ins with place details in single query.

```sql
SELECT * FROM get_user_check_ins_with_places('user-id-here');
```

## 🔐 Security Setup

### Row Level Security (RLS)

All user tables have RLS enabled with policies:

- **users**: Users can only access their own profile
- **check_ins**: Users can only access their own check-ins
- **lists**: Users can only access their own lists
- **list_places**: Access controlled via list ownership
- **recommendation_requests**: Users can only access their own requests

### OAuth Configuration

Configure in Supabase Dashboard > Authentication > Providers:

#### Google OAuth
1. Enable Google provider
2. Add your OAuth client IDs:
   - Web Client ID: `EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID`
   - iOS Client ID: `EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID`

#### Facebook OAuth
1. Enable Facebook provider
2. Add your Facebook App ID: `EXPO_PUBLIC_FACEBOOK_APP_ID`

#### Apple Sign In
1. Enable Apple provider
2. Configure for iOS App Store requirements

## 📱 Client Integration

### Supabase Client

The app uses a typed Supabase client with full TypeScript support:

```typescript
import { supabase } from '../services/supabase';

// All operations are fully typed
const { data, error } = await supabase
  .from('places')
  .select('*')
  .eq('place_type', 'restaurant');
```

### Service Functions

Pre-built service functions for all operations:

- **authService**: Authentication and user management
- **placesService**: Place CRUD and search operations
- **checkInsService**: Check-in management
- **listsService**: List management with place relationships
- **recommendationService**: AI recommendation tracking

## 🧪 Testing

### Database Connection Test

```bash
npm run test-db
```

### Manual Testing with MCP

Use Cursor with Supabase MCP for direct database operations:

```bash
# Query users
@supabase SELECT * FROM users LIMIT 10;

# Search places near Bangkok
@supabase SELECT * FROM search_places_near_location(13.7563, 100.5018, 5000);

# Get user check-ins
@supabase SELECT * FROM get_user_check_ins_with_places('user-uuid');
```

## 🔧 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check environment variables
   - Verify Supabase project is active
   - Check network connectivity

2. **Table Not Found**
   - Ensure schema was deployed correctly
   - Check SQL Editor for errors
   - Verify all tables exist in Database > Tables

3. **RLS Policy Errors**
   - Check user authentication
   - Verify policy conditions
   - Test with authenticated user

4. **Function Errors**
   - Ensure PostGIS extension is enabled
   - Check function syntax in SQL Editor
   - Verify function permissions

### Getting Help

1. Check Supabase Dashboard > Logs for errors
2. Use `npm run test-db` for connection diagnostics
3. Review database schema in `database/schema.sql`
4. Check service implementations in `src/services/supabase.ts`

## 📚 Next Steps

After completing Task 2:

1. ✅ **Task 3**: Enhanced Authentication Module with Social Login
2. ✅ **Task 4**: User Profile & Preferences System
3. ✅ **Task 5**: Google Places Integration with MCP Caching

## 🎉 Success Criteria

Task 2 is complete when:

- ✅ Supabase project created and configured
- ✅ Database schema deployed successfully
- ✅ All tables and functions working
- ✅ RLS policies protecting user data
- ✅ Environment variables configured
- ✅ Database connection test passes
- ✅ Service functions implemented and typed
- ✅ OAuth providers configured (optional for now)

## 💡 MCP Integration Tips

- Use `@supabase` commands in Cursor for direct database operations
- Leverage MCP for schema analysis and query optimization
- Use MCP to generate complex queries and test data
- MCP can help with RLS policy debugging and optimization

---

**🚀 Ready to proceed to Task 3: Enhanced Authentication Module!** 