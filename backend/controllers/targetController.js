const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getTargets = async (req, res, next) => {
  try {
    const { employeeId, businessId } = req.query;
    let sql = 'SELECT * FROM targets WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (employeeId) {
      sql += ` AND employee_id = $${paramIndex++}`;
      params.push(employeeId);
    }
    if (businessId) {
      sql += ` AND business_id = $${paramIndex++}`;
      params.push(businessId);
    }
    
    if (req.user.role === 'EMPLOYEE') {
      sql += ` AND employee_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return successResponse(res, result.rows, 'Targets fetched');
  } catch (err) { next(err); }
};

const createTarget = async (req, res, next) => {
  try {
    const { employeeId, businessId, targetName, targetValue, startDate, endDate } = req.body;
    const result = await query(
      'INSERT INTO targets (employee_id, business_id, target_name, target_value, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [employeeId, businessId, targetName, targetValue, startDate, endDate]
    );
    return successResponse(res, result.rows[0], 'Target created', 201);
  } catch (err) { next(err); }
};

const createBusinessTarget = async (req, res, next) => {
  try {
    const { businessId, targetName, targetValue, startDate, endDate, employeeIds } = req.body;
    
    let targetEmployees = [];
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      targetEmployees = employeeIds;
    } else {
      const employeesRes = await query(
        'SELECT employee_id FROM employee_businesses WHERE business_id = $1',
        [businessId]
      );
      if (employeesRes.rows.length === 0) {
        return errorResponse(res, 'No employees assigned to this business', 400);
      }
      targetEmployees = employeesRes.rows.map(r => r.employee_id);
    }

    const createdTargets = [];
    for (const employeeId of targetEmployees) {
      const result = await query(
        'INSERT INTO targets (employee_id, business_id, target_name, target_value, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [employeeId, businessId, targetName, targetValue, startDate, endDate]
      );
      createdTargets.push(result.rows[0]);
    }

    return successResponse(res, createdTargets, 'Business target assigned successfully', 201);
  } catch (err) { next(err); }
};

const updateTarget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetName, targetValue, startDate, endDate } = req.body;
    const result = await query(
      'UPDATE targets SET target_name = $1, target_value = $2, start_date = $3, end_date = $4 WHERE id = $5 RETURNING *',
      [targetName, targetValue, startDate, endDate, id]
    );
    if (result.rows.length === 0) return errorResponse(res, 'Target not found', 404);
    return successResponse(res, result.rows[0], 'Target updated');
  } catch (err) { next(err); }
};

const deleteTarget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM targets WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return errorResponse(res, 'Target not found', 404);
    return successResponse(res, null, 'Target deleted');
  } catch (err) { next(err); }
};

const getTargetSummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'EMPLOYEE' && req.user.id !== id) {
      return errorResponse(res, 'Forbidden', 403);
    }
    
    const targetsRes = await query('SELECT * FROM targets WHERE employee_id = $1', [id]);
    const targets = targetsRes.rows;

    for (let t of targets) {
      const sql = `
        SELECT SUM(CAST(ra.value AS INTEGER)) as progress
        FROM report_answers ra
        JOIN form_fields ff ON ra.field_id = ff.id
        JOIN employee_reports er ON ra.report_id = er.id
        WHERE er.employee_id = $1 AND er.business_id = $2
        AND er.report_date >= $3 AND er.report_date <= $4
        AND ff.field_type = 'number'
        AND ra.value ~ '^[0-9]+$'
      `;
      const progRes = await query(sql, [id, t.business_id, t.start_date, t.end_date]);
      t.progress = parseInt(progRes.rows[0].progress || 0, 10);
    }

    return successResponse(res, targets, 'Target summary fetched');
  } catch (err) { next(err); }
};

/**
 * GET /targets/business/:businessId?startDate=&endDate=
 * Returns all employees for a business + their existing targets in that date range.
 */
const getBulkTargets = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;

    const employeesRes = await query(
      `SELECT u.id, u.name, u.email 
       FROM users u
       JOIN employee_businesses eb ON u.id = eb.employee_id
       WHERE eb.business_id = $1 AND u.status = 'APPROVED'
       ORDER BY u.name ASC`,
      [businessId]
    );

    let targetSql = `SELECT * FROM targets WHERE business_id = $1`;
    const targetParams = [businessId];
    if (startDate) {
      targetSql += ` AND start_date = $${targetParams.length + 1}`;
      targetParams.push(startDate);
    }
    if (endDate) {
      targetSql += ` AND end_date = $${targetParams.length + 1}`;
      targetParams.push(endDate);
    }
    targetSql += ` ORDER BY created_at ASC`;
    const targetsRes = await query(targetSql, targetParams);
    const targets = targetsRes.rows;

    for (let t of targets) {
      const progSql = `
        SELECT SUM(CAST(ra.value AS INTEGER)) as progress
        FROM report_answers ra
        JOIN form_fields ff ON ra.field_id = ff.id
        JOIN employee_reports er ON ra.report_id = er.id
        WHERE er.employee_id = $1 AND er.business_id = $2
        AND er.report_date >= $3 AND er.report_date <= $4
        AND ff.field_type = 'number'
        AND ra.value ~ '^[0-9]+$'
        AND ff.field_name ILIKE $5
      `;
      const progRes = await query(progSql, [t.employee_id, businessId, t.start_date, t.end_date, `%${t.target_name}%`]);
      t.progress = parseInt(progRes.rows[0]?.progress || 0, 10);
    }

    return successResponse(res, {
      employees: employeesRes.rows,
      targets
    }, 'Bulk targets fetched');
  } catch (err) { next(err); }
};

/**
 * POST /targets/bulk
 * Body: { entries: [{ employeeId, businessId, targetName, targetValue, startDate, endDate }] }
 * Upserts all targets. Uses ON CONFLICT to update if already exists.
 */
const bulkUpsertTargets = async (req, res, next) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return errorResponse(res, 'No entries provided', 400);
    }

    const results = [];
    for (const entry of entries) {
      const { employeeId, businessId, targetName, targetValue, startDate, endDate } = entry;
      if (!employeeId || !businessId || !targetName || targetValue === undefined || targetValue === null || targetValue === '' || !startDate || !endDate) {
        continue;
      }
      const val = parseInt(targetValue, 10);
      if (isNaN(val)) continue;

      const result = await query(
        `INSERT INTO targets (employee_id, business_id, target_name, target_value, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (employee_id, business_id, target_name, start_date, end_date)
         DO UPDATE SET target_value = EXCLUDED.target_value
         RETURNING *`,
        [employeeId, businessId, targetName, val, startDate, endDate]
      );
      results.push(result.rows[0]);
    }

    return successResponse(res, results, 'Targets saved successfully', 201);
  } catch (err) { next(err); }
};

module.exports = { getTargets, createTarget, createBusinessTarget, updateTarget, deleteTarget, getTargetSummary, getBulkTargets, bulkUpsertTargets };
