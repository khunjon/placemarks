-- Add columns for different photo sizes to user_place_photos table
ALTER TABLE public.user_place_photos
ADD COLUMN thumbnail_url TEXT,
ADD COLUMN display_url TEXT,
ADD COLUMN original_width INTEGER,
ADD COLUMN original_height INTEGER,
ADD COLUMN file_size_bytes INTEGER;

-- Add comment to explain the columns
COMMENT ON COLUMN public.user_place_photos.thumbnail_url IS '200x200px thumbnail version of the photo';
COMMENT ON COLUMN public.user_place_photos.display_url IS '800x800px display version of the photo';
COMMENT ON COLUMN public.user_place_photos.photo_url IS 'Original full-resolution photo URL';
COMMENT ON COLUMN public.user_place_photos.original_width IS 'Width of the original photo in pixels';
COMMENT ON COLUMN public.user_place_photos.original_height IS 'Height of the original photo in pixels';
COMMENT ON COLUMN public.user_place_photos.file_size_bytes IS 'File size of the original photo in bytes';

-- Create an index on google_place_id for faster photo lookups
CREATE INDEX IF NOT EXISTS idx_user_place_photos_google_place_id ON public.user_place_photos(google_place_id);

-- Create an index on user_id for faster user photo queries
CREATE INDEX IF NOT EXISTS idx_user_place_photos_user_id ON public.user_place_photos(user_id);