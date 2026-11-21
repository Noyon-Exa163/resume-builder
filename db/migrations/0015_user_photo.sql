-- Uploaded profile photo (Account page avatar picker), stored as a small
-- client-downscaled JPEG data URL. Null = use the generated blobatar.
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_data_url text;
