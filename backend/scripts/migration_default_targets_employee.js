const { query } = require('../config/db');
require('dotenv').config({ path: '../.env' });

async function migrate() {
  try {
    console.log("Starting default_targets employee support migration...");

    // 1. Add employee_id column referencing users
    await query(`
      ALTER TABLE default_targets 
      ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES users(id) ON DELETE CASCADE;
    `);
    console.log("Added employee_id column to default_targets table if not exists.");

    // 2. Create unique index for employee-specific default targets
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_default_targets_employee_business_name 
      ON default_targets (employee_id, business_id, target_name) 
      WHERE employee_id IS NOT NULL;
    `);
    console.log("Created unique index idx_default_targets_employee_business_name.");

    // 3. Create unique index for business-wide default targets (where employee_id is NULL)
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_default_targets_business_name 
      ON default_targets (business_id, target_name) 
      WHERE employee_id IS NULL;
    `);
    console.log("Created unique index idx_default_targets_business_name.");

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
