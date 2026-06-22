const { query } = require('../config/db');
require('dotenv').config();

const runMigration = async () => {
  console.log('Running migration: add unique constraint to targets table...');
  try {
    await query(`
      ALTER TABLE targets 
      ADD CONSTRAINT targets_unique_employee_business_name_dates 
      UNIQUE (employee_id, business_id, target_name, start_date, end_date);
    `);
    console.log('Migration completed successfully.');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('Constraint already exists, skipping.');
    } else {
      console.error('Migration failed:', err.message);
      process.exit(1);
    }
  }
  process.exit(0);
};

runMigration();
