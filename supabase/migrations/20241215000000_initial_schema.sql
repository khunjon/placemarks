-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create indexes for better performance
CREATE INDEX idx_places_coordinates ON places USING GIST (coordinates);
CREATE INDEX idx_places_google_place_id ON places (google_place_id);
CREATE INDEX idx_check_ins_user_id ON check_ins (user_id);
CREATE INDEX idx_check_ins_place_id ON check_ins (place_id);
CREATE INDEX idx_check_ins_timestamp ON check_ins (timestamp DESC);
CREATE INDEX idx_lists_user_id ON lists (user_id);
CREATE INDEX idx_list_places_list_id ON list_places (list_id);
CREATE INDEX idx_recommendation_requests_user_id ON recommendation_requests (user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Check-ins policies
CREATE POLICY "Users can view own check-ins" ON check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check-ins" ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own check-ins" ON check_ins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own check-ins" ON check_ins FOR DELETE USING (auth.uid() = user_id);

-- Lists policies (with future social sharing support)
CREATE POLICY "Users can view own lists" ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON lists FOR DELETE USING (auth.uid() = user_id);

-- List places policies
CREATE POLICY "Users can view own list places" ON list_places FOR SELECT USING (
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_places.list_id AND lists.user_id = auth.uid())
);
CREATE POLICY "Users can insert own list places" ON list_places FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_places.list_id AND lists.user_id = auth.uid())
);
CREATE POLICY "Users can delete own list places" ON list_places FOR DELETE USING (
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_places.list_id AND lists.user_id = auth.uid())
);

-- Recommendation requests policies
CREATE POLICY "Users can view own recommendations" ON recommendation_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON recommendation_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON recommendation_requests FOR UPDATE USING (auth.uid() = user_id);

-- Places table is public for reading (no RLS needed for places as they're shared)
-- But we might want to add policies later for user-contributed places

-- Functions for common operations
CREATE OR REPLACE FUNCTION get_user_check_ins_with_places(user_uuid UUID)
RETURNS TABLE (
  check_in_id UUID,
  place_id UUID,
  place_name TEXT,
  place_address TEXT,
  rating INTEGER,
  notes TEXT,
  photos TEXT[],
  "timestamp" TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    p.id,
    p.name,
    p.address,
    ci.rating,
    ci.notes,
    ci.photos,
    ci."timestamp"
  FROM check_ins ci
  JOIN places p ON ci.place_id = p.id
  WHERE ci.user_id = user_uuid
  ORDER BY ci."timestamp" DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search places by location (Bangkok-focused)
CREATE OR REPLACE FUNCTION search_places_near_location(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  place_id UUID,
  name TEXT,
  address TEXT,
  place_type TEXT,
  price_level INTEGER,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.address,
    p.place_type,
    p.price_level,
    ST_Distance(
      ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
      ST_GeogFromText('POINT(' || ST_X(p.coordinates) || ' ' || ST_Y(p.coordinates) || ')')
    ) as distance_meters
  FROM places p
  WHERE ST_DWithin(
    ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
    ST_GeogFromText('POINT(' || ST_X(p.coordinates) || ' ' || ST_Y(p.coordinates) || ')'),
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql; 