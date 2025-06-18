-- Create Google Places cache table for storing fetched Google Places data
-- This reduces API calls by caching Google Places responses locally

CREATE TABLE google_places_cache (
  -- Google Places identifiers
  google_place_id TEXT PRIMARY KEY,
  
  -- Basic place information
  name TEXT,
  formatted_address TEXT,
  geometry JSONB, -- Contains lat/lng and viewport
  types TEXT[], -- Array of place types (restaurant, establishment, etc.)
  
  -- Ratings and pricing
  rating DECIMAL(3,2), -- Google rating (0.00 to 5.00)
  user_ratings_total INTEGER, -- Number of reviews
  price_level INTEGER, -- 0-4 price level
  
  -- Contact information
  formatted_phone_number TEXT,
  international_phone_number TEXT,
  website TEXT,
  
  -- Hours and availability
  opening_hours JSONB, -- Full opening hours data
  current_opening_hours JSONB, -- Current period opening hours
  
  -- Photos and media
  photos JSONB, -- Array of photo references and metadata
  
  -- Reviews (limited to avoid large data)
  reviews JSONB, -- Recent reviews (limited to 5 most recent)
  
  -- Additional metadata
  business_status TEXT, -- OPERATIONAL, CLOSED_TEMPORARILY, etc.
  place_id TEXT, -- Alternative place_id format
  plus_code JSONB, -- Plus code information
  
  -- Cache management fields
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  
  -- Data completeness tracking
  has_basic_data BOOLEAN DEFAULT FALSE, -- name, address, geometry
  has_contact_data BOOLEAN DEFAULT FALSE, -- phone, website
  has_hours_data BOOLEAN DEFAULT FALSE, -- opening hours
  has_photos_data BOOLEAN DEFAULT FALSE, -- photos
  has_reviews_data BOOLEAN DEFAULT FALSE, -- reviews
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_google_places_cache_expires_at ON google_places_cache(expires_at);
CREATE INDEX idx_google_places_cache_last_accessed ON google_places_cache(last_accessed);
CREATE INDEX idx_google_places_cache_access_count ON google_places_cache(access_count DESC);
CREATE INDEX idx_google_places_cache_rating ON google_places_cache(rating DESC) WHERE rating IS NOT NULL;

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_places_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_google_places_cache_updated_at
  BEFORE UPDATE ON google_places_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_google_places_cache_updated_at();

-- Create function to update access tracking
CREATE OR REPLACE FUNCTION update_google_places_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) policies
ALTER TABLE google_places_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cached Google Places data
CREATE POLICY "Allow authenticated users to read Google Places cache"
  ON google_places_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert/update cached Google Places data
CREATE POLICY "Allow authenticated users to write Google Places cache"
  ON google_places_cache
  FOR ALL
  TO authenticated
  USING (true);

-- Create a view for easy access to non-expired cache entries
CREATE VIEW google_places_cache_valid AS
SELECT *
FROM google_places_cache
WHERE expires_at > NOW();

-- Grant access to the view
GRANT SELECT ON google_places_cache_valid TO authenticated; 