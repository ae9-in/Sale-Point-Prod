const { query } = require('../config/db');
require('dotenv').config();

const migrationSql = `
-- Create breaks table
CREATE TABLE IF NOT EXISTS breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  break_type VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  emergency_status VARCHAR(20) DEFAULT 'idle' CHECK (emergency_status IN ('idle', 'pending', 'approved', 'denied')),
  reason TEXT,
  estimated_duration INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_breaks_employee ON breaks(employee_id);
CREATE INDEX IF NOT EXISTS idx_breaks_started_at ON breaks(started_at);
CREATE INDEX IF NOT EXISTS idx_breaks_emergency_status ON breaks(emergency_status);
`;

async function runMigration() {
  try {
    console.log("Running migration for breaks support...");
    await query(migrationSql);
    console.log("Breaks migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Breaks migration failed:", err);
    process.exit(1);
  }
}

runMigration();
