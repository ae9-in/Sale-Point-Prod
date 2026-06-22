const { query } = require('../config/db');

async function migrate() {
  try {
    console.log("Starting default_targets migration...");

    const sql = `
      CREATE TABLE IF NOT EXISTS default_targets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        target_name VARCHAR(150) NOT NULL,
        target_value INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query(sql);
    console.log("Migration successful: default_targets table created.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
