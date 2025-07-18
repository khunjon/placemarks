# Supabase Admin Integration Guide

This document provides comprehensive guidance for connecting a web admin UI to the Placemarks Supabase backend for managing curated lists and administrative functions.

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Environment Setup](#environment-setup)
4. [TypeScript Types](#typescript-types)
5. [Service Functions](#service-functions)
6. [Authentication & Security](#authentication--security)
7. [API Examples](#api-examples)
8. [Best Practices](#best-practices)

## Overview

The Placemarks app uses Supabase as its backend with PostgreSQL + PostGIS for geospatial data. This guide enables you to build an admin interface that connects to the same database instance to manage curated lists, places, and administrative functions.

### Key Features Supported
- ✅ Curated lists management (CRUD operations)
- ✅ Place management and assignment to lists
- ✅ Publisher and branding support
- ✅ Priority-based list ordering
- ✅ Location-scoped lists
- ✅ Admin statistics and analytics
- ✅ Batch operations for efficiency

## Database Schema

### Core Tables

#### `lists` Table (Enhanced for Curated Lists)
```sql
CREATE TABLE lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULLABLE for curated lists
  name TEXT NOT NULL,
  auto_generated BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public', 'curated')),
  description TEXT,
  list_type TEXT,
  icon TEXT,
  color TEXT,
  type TEXT CHECK (type IN ('user', 'auto', 'curated')),
  is_default BOOLEAN DEFAULT FALSE,
  is_curated BOOLEAN DEFAULT FALSE,
  publisher_name TEXT,
  publisher_logo_url TEXT,
  external_link TEXT,
  location_scope TEXT,
  curator_priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Key Fields for Curated Lists:
- `is_curated`: Boolean flag for admin-managed lists
- `user_id`: NULL for curated lists (not owned by app users)
- `publisher_name`: Organization or entity that curated the list
- `publisher_logo_url`: Branding logo URL
- `external_link`: Optional link for more information
- `location_scope`: Geographic scope (e.g., "Bangkok", "Sukhumvit")
- `curator_priority`: Ordering priority (higher = more prominent)
- `visibility`: Should be 'public' or 'curated' for admin lists

#### `places` Table
```sql
CREATE TABLE places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  google_place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  coordinates POINT NOT NULL, -- PostGIS geometry
  place_type TEXT,
  google_types TEXT[],
  primary_type TEXT,
  price_level INTEGER,
  city_context JSONB, -- New multi-city context
  bangkok_context JSONB, -- Legacy Bangkok-specific context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `list_places` Junction Table
```sql
CREATE TABLE list_places (
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  PRIMARY KEY (list_id, place_id)
);
```

### Indexes for Performance
```sql
-- Optimized for curated lists queries
CREATE INDEX idx_lists_is_curated ON lists (is_curated) WHERE is_curated = true;
CREATE INDEX idx_lists_curator_priority ON lists (curator_priority DESC) WHERE is_curated = true;
CREATE INDEX idx_lists_location_scope ON lists (location_scope) WHERE is_curated = true;
CREATE INDEX idx_lists_publisher_name ON lists (publisher_name) WHERE is_curated = true;
CREATE INDEX idx_places_coordinates ON places USING GIST (coordinates);
```

## Environment Setup

### Required Environment Variables
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key  # For admin operations

# Optional: Google Places API (if managing places)
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

### Installation
```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

## TypeScript Types

### Core Entity Types
```typescript
// Base entity interface
interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

// Curated list entity
interface CuratedList extends BaseEntity {
  user_id?: null; // Always null for curated lists
  name: string;
  auto_generated: false; // Always false for curated lists
  visibility: 'public' | 'curated';
  description?: string;
  list_type?: string;
  icon?: string;
  color?: string;
  type: 'curated';
  is_default: false;
  is_curated: true;
  publisher_name: string;
  publisher_logo_url?: string;
  external_link?: string;
  location_scope?: string;
  curator_priority: number;
}

// Place entity with geospatial data
interface Place extends BaseEntity {
  google_place_id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
  place_type?: string;
  google_types?: string[];
  primary_type?: string;
  price_level?: number;
  city_context?: CityContext;
  bangkok_context?: BangkokContext; // Legacy
}

// List-place relationship
interface ListPlace {
  list_id: string;
  place_id: string;
  added_at: string;
  notes?: string;
  places?: Place; // Joined data
  lists?: CuratedList; // Joined data
}

// Multi-city context for places
interface CityContext {
  city_code: string; // 'BKK', 'TYO', 'NYC', etc.
  environment: 'indoor' | 'outdoor' | 'mixed';
  location_type: string;
  noise_level: 'quiet' | 'moderate' | 'loud';
  air_conditioning?: boolean;
  transport_proximity?: {
    system: string;
    distance: 'walking' | 'near' | 'far' | 'none';
    stations?: string[];
  };
  price_context: {
    tier: string;
    local_scale: string[];
  };
  local_characteristics: Record<string, any>;
  crowd_level?: 'empty' | 'few' | 'moderate' | 'busy' | 'packed';
  wifi_available?: boolean;
  parking_available?: boolean;
}
```

### Admin Operation Types
```typescript
// For creating curated lists
interface CuratedListCreate {
  name: string;
  description?: string;
  publisher_name: string;
  publisher_logo_url?: string;
  external_link?: string;
  location_scope?: string;
  curator_priority?: number;
  list_type?: string;
  icon?: string;
  color?: string;
  visibility?: 'public' | 'curated';
  is_curated: true;
  type: 'curated';
}

// For updating curated lists
interface CuratedListUpdate {
  name?: string;
  description?: string;
  publisher_name?: string;
  publisher_logo_url?: string;
  external_link?: string;
  location_scope?: string;
  curator_priority?: number;
  list_type?: string;
  icon?: string;
  color?: string;
  visibility?: 'public' | 'curated';
}

// For filtering curated lists
interface CuratedListFilters {
  location_scope?: string;
  list_type?: string;
  publisher_name?: string;
  min_priority?: number;
}

// For batch priority updates
interface PriorityUpdate {
  id: string;
  priority: number;
}

// Admin statistics
interface CuratedListStats {
  total_curated_lists: number;
  total_places_in_curated_lists: number;
  publishers_count: number;
  location_scopes_count: number;
  avg_places_per_list: number;
  most_recent_update: string;
}
```

## Service Functions

### Supabase Client Setup
```typescript
import { createClient } from '@supabase/supabase-js';

// For admin operations, use service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!, // Service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// For public operations, use anon key
const supabasePublic = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

### Admin Service Class
```typescript
class CuratedListsAdminService {
  constructor(private supabase = supabaseAdmin) {}

  // Get all curated lists with optional filtering
  async getCuratedLists(filters?: CuratedListFilters) {
    const { data, error } = await this.supabase
      .rpc('get_curated_lists', {
        p_location_scope: filters?.location_scope || null,
        p_list_type: filters?.list_type || null,
        p_publisher_name: filters?.publisher_name || null,
        p_min_priority: filters?.min_priority || null,
      });
    
    return { data, error };
  }

  // Get detailed curated list with places
  async getCuratedListWithPlaces(listId: string) {
    const { data, error } = await this.supabase
      .rpc('get_curated_list_with_places', {
        list_uuid: listId
      });
    
    return { data: data?.[0] || null, error };
  }

  // Create new curated list
  async createCuratedList(listData: CuratedListCreate) {
    const { data, error } = await this.supabase
      .from('lists')
      .insert({
        user_id: null, // Always null for curated lists
        name: listData.name,
        auto_generated: false,
        visibility: listData.visibility || 'public',
        description: listData.description,
        list_type: listData.list_type,
        icon: listData.icon,
        color: listData.color,
        type: 'curated',
        is_default: false,
        is_curated: true,
        publisher_name: listData.publisher_name,
        publisher_logo_url: listData.publisher_logo_url,
        external_link: listData.external_link,
        location_scope: listData.location_scope,
        curator_priority: listData.curator_priority || 0,
      })
      .select()
      .single();

    return { data, error };
  }

  // Update curated list
  async updateCuratedList(listId: string, updates: CuratedListUpdate) {
    const { data, error } = await this.supabase
      .from('lists')
      .update(updates)
      .eq('id', listId)
      .eq('is_curated', true)
      .select()
      .single();

    return { data, error };
  }

  // Delete curated list
  async deleteCuratedList(listId: string) {
    const { error } = await this.supabase
      .from('lists')
      .delete()
      .eq('id', listId)
      .eq('is_curated', true);

    return { error };
  }

  // Add place to curated list
  async addPlaceToList(listId: string, placeId: string, notes?: string) {
    const { data, error } = await this.supabase
      .from('list_places')
      .insert({
        list_id: listId,
        place_id: placeId,
        notes,
      })
      .select();

    return { data, error };
  }

  // Remove place from curated list
  async removePlaceFromList(listId: string, placeId: string) {
    const { error } = await this.supabase
      .from('list_places')
      .delete()
      .eq('list_id', listId)
      .eq('place_id', placeId);

    return { error };
  }

  // Batch update curator priorities
  async updateCuratorPriorities(priorityUpdates: PriorityUpdate[]) {
    const { data, error } = await this.supabase
      .rpc('update_curator_priorities', {
        list_priorities: JSON.stringify(priorityUpdates)
      });

    return { data, error };
  }

  // Get admin statistics
  async getStats(): Promise<{ data: CuratedListStats | null; error: any }> {
    const { data, error } = await this.supabase
      .rpc('get_curated_lists_stats');

    return { data: data?.[0] || null, error };
  }

  // Search places by location (Bangkok-focused but extensible)
  async searchNearbyPlaces(lat: number, lng: number, radiusMeters: number = 5000) {
    const { data, error } = await this.supabase
      .rpc('search_places_near_location', {
        lat,
        lng,
        radius_meters: radiusMeters,
      });

    return { data, error };
  }

  // Get place by Google Place ID
  async getPlaceByGoogleId(googlePlaceId: string) {
    const { data, error } = await this.supabase
      .from('places')
      .select('*')
      .eq('google_place_id', googlePlaceId)
      .single();

    return { data, error };
  }

  // Create new place
  async createPlace(place: Omit<Place, 'id' | 'created_at'>) {
    const { data, error } = await this.supabase
      .from('places')
      .insert({
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        coordinates: `POINT(${place.coordinates[1]} ${place.coordinates[0]})`,
        place_type: place.place_type,
        google_types: place.google_types,
        primary_type: place.primary_type,
        price_level: place.price_level,
        city_context: place.city_context,
        bangkok_context: place.bangkok_context,
      })
      .select()
      .single();

    return { data, error };
  }
}

// Export singleton instance
export const curatedListsAdmin = new CuratedListsAdminService();
```

## Authentication & Security

### Row Level Security (RLS) Policies

The database includes RLS policies for secure access:

```sql
-- Public read access to curated lists
CREATE POLICY "Anyone can view curated lists" ON lists FOR SELECT USING (
  is_curated = true AND visibility IN ('public', 'curated')
);

-- Admin management access (implement proper admin authentication)
CREATE POLICY "Admins can manage curated lists" ON lists FOR ALL USING (
  is_curated = true AND 
  -- TODO: Implement proper admin authentication
  -- auth.jwt() ->> 'role' = 'admin'
  true -- Placeholder
);
```

### Admin Authentication Implementation

You'll need to implement admin authentication. Here are recommended approaches:

#### Option 1: JWT Role-Based Authentication
```typescript
// Extend Supabase auth with custom claims
const supabaseAdminAuth = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});

// Custom admin login
async function adminLogin(email: string, password: string) {
  const { data, error } = await supabaseAdminAuth.auth.signInWithPassword({
    email,
    password,
  });

  // Verify admin role from user metadata or separate admin table
  if (data.user) {
    const { data: adminData } = await supabaseAdminAuth
      .from('admin_users')
      .select('role')
      .eq('user_id', data.user.id)
      .single();

    if (!adminData || adminData.role !== 'admin') {
      await supabaseAdminAuth.auth.signOut();
      throw new Error('Unauthorized: Admin access required');
    }
  }

  return { data, error };
}
```

#### Option 2: Service Key Authentication
```typescript
// Use service role key for all admin operations
// This bypasses RLS but requires careful API security
const adminService = new CuratedListsAdminService(supabaseAdmin);
```

### Security Best Practices

1. **Environment Variables**: Never expose service role keys in client-side code
2. **API Routes**: Create server-side API routes for admin operations
3. **Input Validation**: Validate all inputs before database operations
4. **Rate Limiting**: Implement rate limiting for admin endpoints
5. **Audit Logging**: Log all admin operations for compliance
6. **HTTPS Only**: Ensure all admin operations use HTTPS

## API Examples

### RESTful API Endpoints (Next.js/Express)

```typescript
// pages/api/admin/curated-lists/index.ts (Next.js)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authentication check
  const isAdmin = await verifyAdminToken(req);
  if (!isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'GET':
      const { data, error } = await curatedListsAdmin.getCuratedLists(req.query);
      if (error) return res.status(500).json({ error });
      return res.json(data);

    case 'POST':
      const { data: newList, error: createError } = await curatedListsAdmin.createCuratedList(req.body);
      if (createError) return res.status(500).json({ error: createError });
      return res.status(201).json(newList);

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// pages/api/admin/curated-lists/[id].ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const isAdmin = await verifyAdminToken(req);
  if (!isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'GET':
      const { data, error } = await curatedListsAdmin.getCuratedListWithPlaces(id as string);
      if (error) return res.status(500).json({ error });
      return res.json(data);

    case 'PUT':
      const { data: updated, error: updateError } = await curatedListsAdmin.updateCuratedList(
        id as string, 
        req.body
      );
      if (updateError) return res.status(500).json({ error: updateError });
      return res.json(updated);

    case 'DELETE':
      const { error: deleteError } = await curatedListsAdmin.deleteCuratedList(id as string);
      if (deleteError) return res.status(500).json({ error: deleteError });
      return res.status(204).end();

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
```

### Frontend Usage Examples

```typescript
// Admin dashboard component
function CuratedListsAdmin() {
  const [lists, setLists] = useState<CuratedList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCuratedLists();
  }, []);

  const loadCuratedLists = async () => {
    try {
      const response = await fetch('/api/admin/curated-lists');
      const data = await response.json();
      setLists(data);
    } catch (error) {
      console.error('Failed to load curated lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createList = async (listData: CuratedListCreate) => {
    try {
      const response = await fetch('/api/admin/curated-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listData),
      });
      const newList = await response.json();
      setLists([newList, ...lists]);
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  const updatePriorities = async (updates: PriorityUpdate[]) => {
    try {
      await fetch('/api/admin/curated-lists/priorities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      loadCuratedLists(); // Refresh
    } catch (error) {
      console.error('Failed to update priorities:', error);
    }
  };

  // Component JSX...
}
```

## Best Practices

### Performance Optimization

1. **Use Database Functions**: Leverage PostgreSQL functions for complex queries
2. **Implement Caching**: Cache frequently accessed data (Redis/Memcached)
3. **Pagination**: Implement pagination for large datasets
4. **Indexes**: Ensure proper indexing for query performance
5. **Connection Pooling**: Use connection pooling for high-traffic scenarios

### Data Management

1. **Validation**: Validate data at multiple layers (client, API, database)
2. **Transactions**: Use database transactions for multi-table operations
3. **Backup Strategy**: Implement regular database backups
4. **Monitoring**: Monitor database performance and query execution
5. **Migrations**: Use migration files for schema changes

### Error Handling

```typescript
// Comprehensive error handling
class AdminAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AdminAPIError';
  }
}

async function safeAdminOperation<T>(
  operation: () => Promise<{ data: T; error: any }>
): Promise<T> {
  try {
    const { data, error } = await operation();
    
    if (error) {
      console.error('Database error:', error);
      throw new AdminAPIError(
        error.message || 'Database operation failed',
        500,
        error.code
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof AdminAPIError) {
      throw error;
    }
    
    console.error('Unexpected error:', error);
    throw new AdminAPIError('Internal server error', 500);
  }
}
```

### Logging and Monitoring

```typescript
// Admin operation logging
interface AdminLog {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

async function logAdminAction(log: AdminLog) {
  await supabaseAdmin
    .from('admin_logs')
    .insert(log);
}

// Usage
await logAdminAction({
  user_id: adminUserId,
  action: 'CREATE',
  resource_type: 'curated_list',
  resource_id: newList.id,
  timestamp: new Date().toISOString(),
  metadata: { publisher_name: newList.publisher_name }
});
```

## Migration Guide

To implement this admin system:

1. **Run Database Migration**:
   ```bash
   # In your Placemarks project
   supabase db push
   ```

2. **Update Your Admin Project**:
   - Copy the TypeScript types
   - Implement the service functions
   - Create API endpoints
   - Build admin UI components

3. **Configure Authentication**:
   - Implement admin user authentication
   - Update RLS policies with proper admin checks
   - Secure your API endpoints

4. **Test Integration**:
   - Test CRUD operations
   - Verify RLS policies
   - Test batch operations
   - Monitor performance

This guide provides everything needed to build a comprehensive admin interface for managing curated lists in your Placemarks app. The schema is designed to be extensible and the service layer provides all necessary operations for effective admin management.