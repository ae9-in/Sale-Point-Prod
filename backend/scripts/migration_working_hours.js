const { query } = require('../config/db');
require('dotenv').config({ path: '../.env' });

async function migrate() {
  try {
    console.log('Starting migration for working hours...');
    
    // Add shift_start to users table
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '09:30:00';
    `);
    console.log('Added shift_start column to users if not exists.');

    // Add shift_end to users table
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '19:00:00';
    `);
    console.log('Added shift_end column to users if not exists.');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
