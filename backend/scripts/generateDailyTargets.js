const { query } = require('../config/db');

/**
 * Generates daily targets for all employees based on default targets.
 * This should be run daily (e.g. at midnight).
 */
const generateDailyTargets = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Starting daily target generation...`);

    // 1. Fetch all default targets
    const defaultTargetsRes = await query('SELECT * FROM default_targets');
    const defaultTargets = defaultTargetsRes.rows;

    if (defaultTargets.length === 0) {
      console.log('No default targets found. Skipping generation.');
      return;
    }

    // 2. Fetch all active employees and their assigned businesses
    const employeesRes = await query(`
      SELECT eb.employee_id, eb.business_id
      FROM employee_businesses eb
      JOIN users u ON eb.employee_id = u.id
      WHERE u.status = 'APPROVED'
    `);
    const employeeBusinesses = employeesRes.rows;

    const today = new Date().toISOString().split('T')[0];
    let insertedCount = 0;

    // 3. For each employee-business pair, determine applicable default targets
    for (const eb of employeeBusinesses) {
      for (const dt of defaultTargets) {
        // If default target is global (business_id is null) OR matches the specific business
        if (!dt.business_id || dt.business_id === eb.business_id) {
          
          // Upsert the target for today (if not already manually edited or inserted)
          // We use ON CONFLICT DO NOTHING to avoid overwriting targets that were 
          // manually modified for the day, but wait, the conflict is on 
          // (employee_id, business_id, target_name, start_date, end_date)
          // We can just INSERT ... ON CONFLICT DO NOTHING so we don't override manual edits
          const insertSql = `
            INSERT INTO targets (employee_id, business_id, target_name, target_value, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (employee_id, business_id, target_name, start_date, end_date) DO NOTHING
          `;
          const res = await query(insertSql, [
            eb.employee_id, 
            eb.business_id, 
            dt.target_name, 
            dt.target_value, 
            today, 
            today
          ]);
          
          if (res.rowCount > 0) {
            insertedCount++;
          }
        }
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
