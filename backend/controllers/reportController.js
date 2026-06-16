const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const submitReport = async (req, res, next) => {
  try {
    const { businessId, timingId, activityTypeId, answers } = req.body;
    const employeeId = req.user.id;

    // Check if assigned to business
    const assignRes = await query('SELECT * FROM employee_businesses WHERE employee_id = $1 AND business_id = $2', [employeeId, businessId]);
    if (assignRes.rows.length === 0) return errorResponse(res, 'Not assigned to this business', 403);

    // Create report header
    const reportRes = await query(
      'INSERT INTO employee_reports (employee_id, business_id, timing_id, activity_type_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [employeeId, businessId, timingId, activityTypeId]
    );
    const reportId = reportRes.rows[0].id;

    // Insert answers
    for (const ans of answers) {
      await query(
        'INSERT INTO report_answers (report_id, field_id, value) VALUES ($1, $2, $3)',
        [reportId, ans.fieldId, ans.value]
      );
    }

    return successResponse(res, { reportId }, 'Report submitted successfully', 201);
  } catch (err) { next(err); }
};

const getReports = async (req, res, next) => {
  try {
    const { employeeId, businessId, date, locationId, activityType } = req.query;
    let sql = `
      SELECT er.*, u.name as employee_name, b.business_name, bt.timing_name, at.name as activity_name 
      FROM employee_reports er
      JOIN users u ON er.employee_id = u.id
      JOIN businesses b ON er.business_id = b.id
      JOIN business_timings bt ON er.timing_id = bt.id
      JOIN activity_types at ON er.activity_type_id = at.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (employeeId) {
      sql += ` AND er.employee_id = $${paramIndex++}`;
      params.push(employeeId);
    }
    if (businessId) {
      sql += ` AND er.business_id = $${paramIndex++}`;
      params.push(businessId);
    }
    if (date) {
      sql += ` AND er.report_date = $${paramIndex++}`;
      params.push(date);
    }
    if (locationId) {
      sql += ` AND u.location_id = $${paramIndex++}`;
      params.push(locationId);
    }
    if (activityType) {
      if (activityType === 'Callings') {
        sql += ` AND at.name ILIKE '%calling%'`;
      } else if (activityType === 'Fields') {
        sql += ` AND (at.name ILIKE '%field%' OR at.name ILIKE '%visit%')`;
      } else {
        sql += ` AND at.name = $${paramIndex++}`;
        params.push(activityType);
      }
    }

    if (req.user.role === 'EMPLOYEE') {
      sql += ` AND er.employee_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    sql += ' ORDER BY er.created_at DESC';

    const result = await query(sql, params);
    return successResponse(res, result.rows, 'Reports fetched');
  } catch (err) { next(err); }
};

const getReportDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (req.user.role === 'EMPLOYEE') {
      const checkRes = await query('SELECT employee_id FROM employee_reports WHERE id = $1', [id]);
      if (checkRes.rows.length === 0 || checkRes.rows[0].employee_id !== req.user.id) {
        return errorResponse(res, 'Forbidden', 403);
      }
    }

    const reportRes = await query(`
      SELECT er.*, u.name as employee_name, b.business_name, bt.timing_name, at.name as activity_name 
      FROM employee_reports er
      JOIN users u ON er.employee_id = u.id
      JOIN businesses b ON er.business_id = b.id
      JOIN business_timings bt ON er.timing_id = bt.id
      JOIN activity_types at ON er.activity_type_id = at.id
      WHERE er.id = $1
    `, [id]);

    if (reportRes.rows.length === 0) return errorResponse(res, 'Report not found', 404);

    const answersRes = await query(`
      SELECT ra.value, ff.field_name, ff.field_type
      FROM report_answers ra
      JOIN form_fields ff ON ra.field_id = ff.id
      WHERE ra.report_id = $1
      ORDER BY ff.display_order ASC
    `, [id]);

    const report = reportRes.rows[0];
    report.answers = answersRes.rows;

    return successResponse(res, report, 'Report details fetched');
  } catch (err) { next(err); }
};

module.exports = { submitReport, getReports, getReportDetails };
