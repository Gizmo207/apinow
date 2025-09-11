-- Add Firebase Admin SDK fields to database_connections table
ALTER TABLE database_connections 
ADD COLUMN service_account_key TEXT,
ADD COLUMN admin_api_key TEXT,
ADD COLUMN admin_auth_domain TEXT,
ADD COLUMN database_url TEXT,
ADD COLUMN storage_bucket TEXT;

-- Add comments for documentation
COMMENT ON COLUMN database_connections.service_account_key IS 'Firebase Admin SDK service account key JSON (encrypted)';
COMMENT ON COLUMN database_connections.admin_api_key IS 'Firebase Admin API key (encrypted)';
COMMENT ON COLUMN database_connections.admin_auth_domain IS 'Firebase Admin auth domain';
COMMENT ON COLUMN database_connections.database_url IS 'Firebase Realtime Database URL';
COMMENT ON COLUMN database_connections.storage_bucket IS 'Firebase Storage bucket URL';
