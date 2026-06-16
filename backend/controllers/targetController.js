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
    const { id } = req.params; // employeeId
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

module.exports = { getTargets, createTarget, createBusinessTarget, updateTarget, deleteTarget, getTargetSummary };
