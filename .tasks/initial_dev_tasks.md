# Placemarks Development Task List
## AI-Powered Location Assistant for Bangkok

### Project Overview
**Product:** Placemarks - Your AI-powered location assistant for Bangkok  
**Vision:** Eliminate decision paralysis about where to go by learning preferences and providing intelligent, context-aware recommendations  
**Tech Stack:** React Native (Expo) + Supabase + Google APIs + Supabase MCP

---

## Phase 1: Project Setup & Foundation

### ✅ Task 1: Project Initialization with Supabase MCP
**Priority:** HIGH | **Estimated Time:** 4-6 hours

Create a new Expo React Native project called "Placemarks" with Supabase MCP integration:

**Dependencies to Install:**
```bash
npx create-expo-app Placemarks --template
cd Placemarks
npm install @supabase/supabase-js expo-auth-session expo-crypto expo-linking
npm install @react-navigation/native @react-navigation/stack
npm install expo-location expo-sqlite @react-native-async-storage/async-storage
npm install react-native-maps react-native-vector-icons
npm install @types/react-native-vector-icons --save-dev
```

**Project Structure to Create:**
```
src/
├── components/
│   ├── common/
│   ├── places/
│   └── auth/
├── screens/
│   ├── auth/
│   ├── places/
│   ├── lists/
│   └── profile/
├── services/
│   ├── supabase.ts
│   ├── places.ts
│   └── auth.ts
├── types/
│   ├── database.ts
│   ├── places.ts
│   └── user.ts
├── utils/
└── constants/
```

**TypeScript Interfaces to Create:**
```typescript
// types/database.ts
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider: 'email' | 'google' | 'facebook' | 'apple';
  preferences: UserPreferences;
  created_at: string;
}

export interface Place {
  id: string;
  google_place_id: string;
  name: string;
  address: string;
  coordinates: [number, number];
  place_type: string;
  price_level?: number;
  bangkok_context: BangkokContext;
}

export interface CheckIn {
  id: string;
  user_id: string;
  place_id: string;
  timestamp: string;
  rating: number;
  tags: string[];
  context: CheckInContext;
  photos: string[];
  notes?: string;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  auto_generated: boolean;
  privacy_level: 'private' | 'friends' | 'public';
  created_at: string;
}
```

**Environment Variables (.env):**
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_key
EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID=your_google_oauth_web_client_id
EXPO_PUBLIC_GOOGLE_OAUTH_IOS_CLIENT_ID=your_google_oauth_ios_client_id
EXPO_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
```

---

### ✅ Task 2: Supabase Backend Setup with MCP
**Priority:** HIGH | **Estimated Time:** 3-4 hours

Set up Supabase backend infrastructure using MCP for database operations:

**Database Tables to Create (use Supabase MCP):**

```sql
-- Users table with social auth support
CREATE TABLE users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Places table with Bangkok context
CREATE TABLE places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  google_place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  coordinates POINT NOT NULL,
  place_type TEXT,
  price_level INTEGER,
  bangkok_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check-ins table with rich context
CREATE TABLE check_ins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}',
  context JSONB DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lists table
CREATE TABLE lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  auto_generated BOOLEAN DEFAULT FALSE,
  privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('private', 'friends', 'public')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- List places junction table
CREATE TABLE list_places (
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  PRIMARY KEY (list_id, place_id)
);

-- Recommendation requests for tracking AI suggestions
CREATE TABLE recommendation_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  context JSONB NOT NULL,
  suggested_places UUID[] DEFAULT '{}',
  user_feedback TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policies to Create:**
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Check-ins policies
CREATE POLICY "Users can view own check-ins" ON check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check-ins" ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own check-ins" ON check_ins FOR UPDATE USING (auth.uid() = user_id);

-- Lists policies (with future social sharing support)
CREATE POLICY "Users can view own lists" ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON lists FOR UPDATE USING (auth.uid() = user_id);
```

**Supabase Client Setup (services/supabase.ts):**
```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**OAuth Provider Configuration (in Supabase Dashboard):**
- Google OAuth: Configure web and mobile client IDs
- Facebook OAuth: Configure app ID and secret
- Apple Sign In: Configure for iOS App Store requirements

---

### ✅ Task 3: Enhanced Authentication Module with Social Login
**Priority:** HIGH | **Estimated Time:** 6-8 hours

Create comprehensive authentication system with social providers:

**Files to Create:**

1. **services/auth.ts** - Authentication service
2. **screens/auth/WelcomeScreen.tsx** - Social login buttons
3. **screens/auth/LoginScreen.tsx** - Email/password login
4. **screens/auth/SignUpScreen.tsx** - Email registration
5. **screens/auth/ProfileSetupScreen.tsx** - Post-social-login onboarding
6. **contexts/AuthContext.tsx** - App-wide auth state

**Key Features to Implement:**

```typescript
// services/auth.ts
export class AuthService {
  // Google Sign In with proper scopes
  async signInWithGoogle(): Promise<AuthResponse>
  
  // Facebook Login with email and profile permissions
  async signInWithFacebook(): Promise<AuthResponse>
  
  // Apple Sign In with email and name
  async signInWithApple(): Promise<AuthResponse>
  
  // Email/password authentication
  async signInWithEmail(email: string, password: string): Promise<AuthResponse>
  async signUpWithEmail(email: string, password: string): Promise<AuthResponse>
  
  // Profile management
  async updateProfile(data: ProfileUpdate): Promise<void>
  async uploadAvatar(imageUri: string): Promise<string>
  
  // Session management
  async signOut(): Promise<void>
  async getCurrentUser(): Promise<User | null>
}
```

**OAuth Flow Implementation:**
- Handle redirect URLs and deep linking
- Implement user profile creation/update after social login
- Add profile picture handling from social providers
- Create account linking functionality
- Proper error handling for OAuth failures

**AuthContext Setup:**
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (provider: AuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
}
```

---

### ✅ Task 4: User Profile & Preferences System
**Priority:** MEDIUM | **Estimated Time:** 4-5 hours

Build user profile management leveraging social auth data:

**Files to Create:**
1. **screens/profile/UserProfileScreen.tsx**
2. **screens/profile/PreferencesScreen.tsx**
3. **components/profile/ProfilePictureUpload.tsx**
4. **services/profile.ts**

**Features to Implement:**
- Profile picture upload to Supabase Storage
- Bangkok-specific preferences (districts, transport methods)
- Dietary restrictions and cuisine preferences
- Privacy settings for future social features
- Account management (connected social accounts)
- Data export and deletion options

---

## Phase 2: Core Location Features

### ✅ Task 5: Google Places Integration with MCP Caching
**Priority:** HIGH | **Estimated Time:** 6-7 hours

Implement Google Places API with intelligent database caching:

**Files to Create:**
1. **services/places.ts** - Google Places API integration
2. **services/placesCache.ts** - Database caching logic
3. **screens/places/PlaceSearchScreen.tsx**
4. **components/places/PlaceCard.tsx**
5. **components/places/PlaceAutocomplete.tsx**

**Key Features:**
```typescript
// services/places.ts
export class PlacesService {
  // Search nearby places with caching
  async searchNearbyPlaces(location: Location, radius: number): Promise<Place[]>
  
  // Autocomplete with cached suggestions
  async getPlaceAutocomplete(query: string): Promise<PlaceSuggestion[]>
  
  // Get detailed place information
  async getPlaceDetails(placeId: string): Promise<PlaceDetails>
  
  // Bangkok-specific categorization
  async categorizeBangkokPlace(place: Place): Promise<BangkokContext>
}
```

**Caching Strategy (use Supabase MCP):**
- Cache place data to reduce API calls
- Implement cache invalidation based on data freshness
- Create database indexes for efficient searches
- Bangkok-specific place categorization

---

### ✅ Task 6: Enhanced Check-in System with MCP
**Priority:** HIGH | **Estimated Time:** 8-10 hours

Build comprehensive check-in functionality using MCP for data operations:

**Files to Create:**
1. **screens/checkin/CheckInScreen.tsx**
2. **screens/checkin/CheckInHistoryScreen.tsx**
3. **components/checkin/RatingSystem.tsx**
4. **components/checkin/ContextCapture.tsx**
5. **components/checkin/PhotoUpload.tsx**
6. **services/checkins.ts**

**Features to Implement:**
- Advanced rating system (overall + aspect ratings)
- Bangkok-specific context tags (indoor/outdoor, BTS proximity, mall/street)
- Multiple photo upload with compression
- Rich context capture (weather, companion, meal type, transportation)
- Check-in editing with change tracking
- Offline check-in queuing with conflict resolution

**Context Tags for Bangkok:**
```typescript
interface BangkokContext {
  environment: 'indoor' | 'outdoor' | 'mixed';
  location_type: 'mall' | 'street' | 'building' | 'market';
  bts_proximity: 'walking' | 'near' | 'far' | 'none';
  air_conditioning: boolean;
  noise_level: 'quiet' | 'moderate' | 'loud';
  price_tier: 'street' | 'casual' | 'mid' | 'upscale' | 'luxury';
}
```

---

### ✅ Task 7: Maps Integration
**Priority:** MEDIUM | **Estimated Time:** 5-6 hours

Implement Google Maps functionality:

**Files to Create:**
1. **screens/maps/MapScreen.tsx**
2. **components/maps/CustomMarker.tsx**
3. **components/maps/PlaceCluster.tsx**
4. **services/maps.ts**

**Features:**
- Custom markers for different place types and check-ins
- BTS/MRT station overlay markers
- Place clustering for dense areas
- "Check in from Map" functionality
- Directions integration

---

## Phase 3: Smart Recommendations

### ✅ Task 8: Intelligent Recommendation Engine with MCP
**Priority:** HIGH | **Estimated Time:** 10-12 hours

Build sophisticated recommendation system using MCP for data analysis:

**Files to Create:**
1. **services/recommendations.ts** - Core recommendation logic
2. **screens/recommendations/DecideForMeScreen.tsx**
3. **components/recommendations/RecommendationCard.tsx**
4. **utils/recommendationAlgorithms.ts**

**Recommendation Logic to Implement:**
```typescript
interface RecommendationContext {
  location: Location;
  timeOfDay: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'late';
  weather: WeatherCondition;
  companion?: 'solo' | 'partner' | 'friends' | 'business';
  mood?: 'adventurous' | 'comfort' | 'healthy' | 'indulgent';
  transportation: 'walking' | 'bts' | 'taxi' | 'car';
}

export class RecommendationEngine {
  // Rule-based recommendations (MVP)
  async getRuleBasedRecommendations(context: RecommendationContext): Promise<Recommendation[]>
  
  // Bangkok-specific logic
  async getBangkokContextualRecommendations(context: RecommendationContext): Promise<Recommendation[]>
  
  // Learning from feedback
  async trackRecommendationFeedback(recommendationId: string, feedback: FeedbackType): Promise<void>
}
```

**"Decide for Me" Modes:**
- Quick decision (instant suggestion)
- Browse mode (3-5 curated options)
- Discovery mode (new places based on preferences)

---

### ✅ Task 9: Feature Flag & Analytics System
**Priority:** MEDIUM | **Estimated Time:** 4-5 hours

Implement feature flags and analytics using MCP:

**Files to Create:**
1. **services/featureFlags.ts**
2. **services/analytics.ts**
3. **utils/abTesting.ts**

**Feature Flags:**
- Recommendation algorithm versions
- UI variations and new features
- Social features rollout preparation

---

## Phase 4: List Management

### ✅ Task 10: Smart Lists System with MCP Analytics
**Priority:** HIGH | **Estimated Time:** 6-8 hours

Create intelligent list management using MCP for complex operations:

**Files to Create:**
1. **screens/lists/ListsScreen.tsx**
2. **screens/lists/ListDetailScreen.tsx**
3. **screens/lists/CreateListScreen.tsx**
4. **components/lists/ListCard.tsx**
5. **services/lists.ts**

**Features:**
- Smart auto-categorization using check-in data
- List sharing with granular permissions
- Bulk operations across multiple lists
- List analytics and insights
- Export in multiple formats

---

### ✅ Task 11: Enhanced Offline System with MCP Sync
**Priority:** MEDIUM | **Estimated Time:** 6-7 hours

Build robust offline functionality with intelligent sync:

**Files to Create:**
1. **services/offline.ts**
2. **services/sync.ts**
3. **utils/sqlite.ts**

**Features:**
- Comprehensive SQLite local database
- Incremental sync for large datasets
- Conflict resolution with user preferences
- Offline recommendation engine using cached data

---

## Phase 5: Bangkok Intelligence & Performance

### ✅ Task 12: Advanced Bangkok Context with MCP
**Priority:** HIGH | **Estimated Time:** 8-10 hours

Implement comprehensive Bangkok intelligence:

**Files to Create:**
1. **services/bangkokIntelligence.ts**
2. **data/btsStations.ts**
3. **utils/bangkokContext.ts**

**Features:**
- BTS/MRT station network with real-time data
- Traffic pattern analysis and predictions
- Monsoon season adaptation algorithms
- Thai cultural event awareness
- Local price point calibration

---

### ✅ Task 13: Performance Optimization with MCP
**Priority:** MEDIUM | **Estimated Time:** 4-6 hours

Optimize app performance using MCP for efficient data operations:

**Areas to Optimize:**
- Query result caching with intelligent invalidation
- Progressive image loading and compression
- Bundle size and memory usage optimization
- Database query performance tracking

---

## Phase 6: Future Features

### ✅ Task 14: Social Features Foundation with MCP
**Priority:** LOW | **Estimated Time:** 8-10 hours

Prepare robust social architecture (for future implementation):

**Files to Create:**
1. **services/social.ts**
2. **screens/social/DiscoverScreen.tsx**
3. **components/social/UserCard.tsx**

**Features:**
- Friend/follower system with privacy controls
- Public list discovery and following
- Social proof in recommendations
- Notification system

---

### ✅ Task 15: ML Recommendation Engine
**Priority:** LOW | **Estimated Time:** 12-15 hours

Upgrade to machine learning recommendations:

**Features:**
- Collaborative filtering algorithm
- User preference learning from patterns
- A/B testing between algorithms
- Natural language processing for reviews

---

## Development Priority Schedule

### Week 1-2: Foundation
- [ ] Task 1: Project Initialization
- [ ] Task 2: Supabase Backend Setup
- [ ] Task 3: Authentication with Social Login
- [ ] Task 4: User Profile System

### Week 3-4: Core Features
- [ ] Task 5: Google Places Integration
- [ ] Task 6: Check-in System
- [ ] Task 7: Maps Integration

### Week 5-6: Intelligence
- [ ] Task 8: Recommendation Engine
- [ ] Task 9: Feature Flags & Analytics

### Week 7-8: Management
- [ ] Task 10: Smart Lists System
- [ ] Task 11: Offline System

### Week 9-10: Bangkok & Polish
- [ ] Task 12: Bangkok Intelligence
- [ ] Task 13: Performance Optimization

### Future: Advanced Features
- [ ] Task 14: Social Features Foundation
- [ ] Task 15: ML Recommendation Engine

---

## Key Commands for Cursor with Supabase MCP

### Database Operations
```bash
# Use Supabase MCP to create tables
@supabase create table users with columns...

# Query data efficiently
@supabase select from check_ins where user_id = ? order by timestamp desc

# Analyze user patterns
@supabase analyze user check-in patterns for recommendations
```

### Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Type check
npm run type-check
```

---

## Notes for Cursor Development

1. **Use Supabase MCP** for all database operations - it will help with efficient queries and schema management
2. **Implement feature flags early** - this allows for easy A/B testing of recommendation algorithms
3. **Bangkok context is crucial** - always consider BTS/MRT proximity, weather, and local preferences
4. **Start simple with recommendations** - rule-based initially, upgrade to ML later
5. **Design for offline-first** - Bangkok's connectivity can be inconsistent
6. **Social features architecture** - build the foundation early even if features come later

---

*This task list is designed to be used with Cursor AI and Supabase MCP for efficient development of the Placemarks app.*