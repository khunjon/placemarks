-- Create editorial_places table for admin-curated content
CREATE TABLE editorial_places (
    google_place_id TEXT PRIMARY KEY,
    custom_description TEXT,
    featured_image_url TEXT,
    pro_tips TEXT,
    editorial_notes TEXT,
    is_featured BOOLEAN DEFAULT false,
    admin_tags TEXT[],
    priority_score INTEGER DEFAULT 0,
    city_context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Foreign key constraint to google_places_cache
    CONSTRAINT fk_editorial_places_google_place_id 
        FOREIGN KEY (google_place_id) 
        REFERENCES google_places_cache(google_place_id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_editorial_places_is_featured ON editorial_places(is_featured);
CREATE INDEX idx_editorial_places_priority_score ON editorial_places(priority_score DESC);
CREATE INDEX idx_editorial_places_admin_tags ON editorial_places USING GIN(admin_tags);
CREATE INDEX idx_editorial_places_city_context ON editorial_places USING GIN(city_context);
CREATE INDEX idx_editorial_places_created_at ON editorial_places(created_at DESC);
CREATE INDEX idx_editorial_places_updated_at ON editorial_places(updated_at DESC);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_editorial_places_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_editorial_places_updated_at
    BEFORE UPDATE ON editorial_places
    FOR EACH ROW
    EXECUTE FUNCTION update_editorial_places_updated_at();

-- Enable Row Level Security
ALTER TABLE editorial_places ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin-only access
-- Only authenticated users with admin role can read
CREATE POLICY "Admin read access for editorial_places" ON editorial_places
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND preferences->>'role' = 'admin'
        )
    );

-- Only authenticated users with admin role can insert
CREATE POLICY "Admin insert access for editorial_places" ON editorial_places
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND preferences->>'role' = 'admin'
        )
    );

-- Only authenticated users with admin role can update
CREATE POLICY "Admin update access for editorial_places" ON editorial_places
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND preferences->>'role' = 'admin'
        )
    ) WITH CHECK (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND preferences->>'role' = 'admin'
        )
    );

-- Only authenticated users with admin role can delete
CREATE POLICY "Admin delete access for editorial_places" ON editorial_places
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND preferences->>'role' = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON editorial_places TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;