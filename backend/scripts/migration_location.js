const { query } = require('../config/db');
require('dotenv').config();

const migrationSql = `
-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial values
INSERT INTO locations (name) VALUES ('Bangalore') ON CONFLICT (name) DO NOTHING;
INSERT INTO locations (name) VALUES ('Kochi') ON CONFLICT (name) DO NOTHING;
INSERT INTO locations (name) VALUES ('Chennai') ON CONFLICT (name) DO NOTHING;
INSERT INTO locations (name) VALUES ('Hyderabad') ON CONFLICT (name) DO NOTHING;

-- Alter users table to add location_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Update all present users to 'Bangalore'
UPDATE users SET location_id = (SELECT id FROM locations WHERE name = 'Bangalore') WHERE location_id IS NULL;
`;

async function runMigration() {
  try {
    console.log("Running migration for locations support...");
    await query(migrationSql);
    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
