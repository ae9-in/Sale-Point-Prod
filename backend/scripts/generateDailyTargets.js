const { query } = require('../config/db');

/**
 * Generates daily targets for all employees based on default targets.
 * This should be run daily (e.g. at midnight).
 */
const generateDailyTargets = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Starting daily target generation...`);

    // 1. Fetch resolved default targets using an optimized precedence query:
    // Employee Override (employee_id IS NOT NULL) > Business Default (business_id IS NOT NULL) > Global Default
    const resolvedDefaultsRes = await query(`
      WITH resolved_defaults AS (
        SELECT 
          eb.employee_id,
          eb.business_id,
          dt.target_name,
          dt.target_value,
          ROW_NUMBER() OVER (
            PARTITION BY eb.employee_id, eb.business_id, dt.target_name
            ORDER BY 
              CASE 
                WHEN dt.employee_id IS NOT NULL THEN 1
                WHEN dt.business_id IS NOT NULL THEN 2
                ELSE 3
              END ASC
          ) as rn
        FROM employee_businesses eb
        JOIN users u ON eb.employee_id = u.id
        CROSS JOIN default_targets dt
        WHERE u.status = 'APPROVED'
          AND (
            (dt.employee_id = eb.employee_id AND dt.business_id = eb.business_id)
            OR (dt.employee_id IS NULL AND dt.business_id = eb.business_id)
            OR (dt.employee_id IS NULL AND dt.business_id IS NULL)
          )
      )
      SELECT employee_id, business_id, target_name, target_value
      FROM resolved_defaults
      WHERE rn = 1
    `);
    const resolvedDefaults = resolvedDefaultsRes.rows;

    if (resolvedDefaults.length === 0) {
      console.log('No applicable default targets resolved. Skipping generation.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    let insertedCount = 0;

    // 2. Insert resolved targets for today, avoiding overwriting manual edits (ON CONFLICT DO NOTHING)
    for (const dt of resolvedDefaults) {
      const insertSql = `
        INSERT INTO targets (employee_id, business_id, target_name, target_value, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (employee_id, business_id, target_name, start_date, end_date) DO NOTHING
      `;
      const res = await query(insertSql, [
        dt.employee_id, 
        dt.business_id, 
        dt.target_name, 
        dt.target_value, 
        today, 
        today
      ]);
      
      if (res.rowCount > 0) {
        insertedCount++;
      }
    }

    console.log(`[${new Date().toISOString()}] Daily target generation complete. Inserted ${insertedCount} new targets.`);
  } catch (err) {
    console.error('Error generating daily targets:', err);
  }
};

// Allow running directly from command line
if (require.main === module) {
  generateDailyTargets().then(() => process.exit(0));
}

module.exports = generateDailyTargets;
