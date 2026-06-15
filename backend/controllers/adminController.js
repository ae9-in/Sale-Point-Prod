const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { hashPassword } = require('../utils/hashPassword');

const getUsers = async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at, u.location_id, l.name as location_name FROM users u LEFT JOIN locations l ON u.location_id = l.id WHERE u.role = $1';
    const params = ['EMPLOYEE'];

    if (status) {
      sql += ' AND u.status = $2';
      params.push(status);
    }
    sql += ' ORDER BY u.created_at DESC';

    const result = await query(sql, params);

    // Also get business assignment counts for each user
    const users = await Promise.all(result.rows.map(async (u) => {
      const bizRes = await query('SELECT COUNT(*) FROM employee_businesses WHERE employee_id = $1', [u.id]);
      return { ...u, assignedBusinesses: parseInt(bizRes.rows[0].count, 10) };
    }));

    return successResponse(res, users, 'Users fetched');
  } catch (err) {
    next(err);
  }
};

const approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('UPDATE users SET status = $1 WHERE id = $2 RETURNING id, status', ['APPROVED', id]);
    if (result.rows.length === 0) return errorResponse(res, 'User not found', 404);
    return successResponse(res, result.rows[0], 'User approved');
  } catch (err) {
    next(err);
  }
};

const rejectUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('UPDATE users SET status = $1 WHERE id = $2 RETURNING id, status', ['REJECTED', id]);
    if (result.rows.length === 0) return errorResponse(res, 'User not found', 404);
    return successResponse(res, result.rows[0], 'User rejected');
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, locationId } = req.body;
    if (!locationId) return errorResponse(res, 'Location is required', 400);
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return errorResponse(res, 'Email exists', 400);

    const hashed = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (name, email, phone, password, role, status, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, status, location_id',
      [name, email, phone, hashed, 'EMPLOYEE', 'APPROVED', locationId]
    );
    return successResponse(res, result.rows[0], 'Employee created successfully');
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return errorResponse(res, 'User not found', 404);
    return successResponse(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
};

const updateUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const hashed = await hashPassword(password);
    const result = await query(
      'UPDATE users SET password = $1 WHERE id = $2 AND role = $3 RETURNING id, name, email',
      [hashed, id, 'EMPLOYEE']
    );
    if (result.rows.length === 0) return errorResponse(res, 'User not found', 404);
    return successResponse(res, result.rows[0], 'Password updated');
  } catch (err) {
    next(err);
  }
};

const assignBusiness = async (req, res, next) => {
  try {
    const { employeeId, businessId } = req.body;
    await query('INSERT INTO employee_businesses (employee_id, business_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [employeeId, businessId]);
    return successResponse(res, null, 'Employee assigned to business');
  } catch (err) {
    next(err);
  }
};

const unassignBusiness = async (req, res, next) => {
  try {
    const { employeeId, businessId } = req.params;
    await query('DELETE FROM employee_businesses WHERE employee_id = $1 AND business_id = $2', [employeeId, businessId]);
    return successResponse(res, null, 'Employee unassigned from business');
  } catch (err) {
    next(err);
  }
};

const getEmployeeBusinesses = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT b.* FROM businesses b
      JOIN employee_businesses eb ON b.id = eb.business_id
      WHERE eb.employee_id = $1
    `;
    const result = await query(sql, [id]);

    // Fetch timings and activity types for each business
    const businesses = await Promise.all(result.rows.map(async (b) => {
      const timings = await query('SELECT * FROM business_timings WHERE business_id = $1 ORDER BY timing_name ASC', [b.id]);
      const activities = await query('SELECT * FROM activity_types WHERE business_id = $1', [b.id]);
      return { ...b, timings: timings.rows, activityTypes: activities.rows };
    }));

    return successResponse(res, businesses, 'Assigned businesses fetched');
  } catch (err) {
    next(err);
  }
};

const getBusinessEmployees = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT u.id, u.name, u.email, u.phone, u.status, eb.assigned_at
      FROM users u
      JOIN employee_businesses eb ON u.id = eb.employee_id
      WHERE eb.business_id = $1
      ORDER BY u.name ASC
    `;
    const result = await query(sql, [id]);
    return successResponse(res, result.rows, 'Assigned employees fetched');
  } catch (err) {
    next(err);
  }
};

const updateUserLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { locationId } = req.body;
    if (!locationId) return errorResponse(res, 'Location ID is required', 400);

    const result = await query(
      'UPDATE users SET location_id = $1 WHERE id = $2 RETURNING id, location_id',
      [locationId, id]
    );
    if (result.rows.length === 0) return errorResponse(res, 'User not found', 404);

    // Fetch updated user location info
    const joinedResult = await query(
      'SELECT u.id, u.name, u.location_id, l.name as location_name FROM users u LEFT JOIN locations l ON u.location_id = l.id WHERE u.id = $1',
      [id]
    );

    return successResponse(res, joinedResult.rows[0], 'User location updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  approveUser,
  rejectUser,
  createUser,
  deleteUser,
  updateUserPassword,
  assignBusiness,
  unassignBusiness,
  getEmployeeBusinesses,
  getBusinessEmployees,
  updateUserLocation
};
