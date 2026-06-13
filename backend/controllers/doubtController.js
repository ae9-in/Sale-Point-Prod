const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const ensureDoubtsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS employee_doubts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      response TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);
};

const createDoubt = async (req, res, next) => {
  try {
    await ensureDoubtsTable();
    const { businessId, question } = req.body;
    const assigned = await query(
      'SELECT id FROM employee_businesses WHERE employee_id = $1 AND business_id = $2',
      [req.user.id, businessId]
    );
    if (assigned.rows.length === 0) return errorResponse(res, 'Not assigned to this business', 403);

    const result = await query(
      'INSERT INTO employee_doubts (employee_id, business_id, question) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, businessId, question]
    );
    return successResponse(res, result.rows[0], 'Query submitted', 201);
  } catch (err) {
    next(err);
  }
};

const getDoubts = async (req, res, next) => {
  try {
    await ensureDoubtsTable();
    const { businessId, employeeId, status } = req.query;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (req.user.role === 'EMPLOYEE') {
      conditions.push(`d.employee_id = $${paramIndex++}`);
      params.push(req.user.id);
    } else if (employeeId) {
      conditions.push(`d.employee_id = $${paramIndex++}`);
      params.push(employeeId);
    }

    if (businessId) {
      conditions.push(`d.business_id = $${paramIndex++}`);
      params.push(businessId);
    }

    if (status) {
      conditions.push(`d.status = $${paramIndex++}`);
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`
      SELECT d.*, u.name AS employee_name, b.business_name
      FROM employee_doubts d
      JOIN users u ON d.employee_id = u.id
      JOIN businesses b ON d.business_id = b.id
      ${where}
      ORDER BY d.created_at DESC
    `, params);

    return successResponse(res, result.rows, 'Queries fetched');
  } catch (err) {
    next(err);
  }
};

const resolveDoubt = async (req, res, next) => {
  try {
    await ensureDoubtsTable();
    const { id } = req.params;
    const { response } = req.body;
    const result = await query(
      "UPDATE employee_doubts SET response = $1, status = 'RESOLVED', resolved_at = NOW() WHERE id = $2 RETURNING *",
      [response || '', id]
    );
    if (result.rows.length === 0) return errorResponse(res, 'Query not found', 404);
    return successResponse(res, result.rows[0], 'Query resolved');
  } catch (err) {
    next(err);
  }
};

module.exports = { createDoubt, getDoubts, resolveDoubt };
