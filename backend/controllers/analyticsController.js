const { query } = require('../config/db');
const { successResponse } = require('../utils/apiResponse');

const buildDateWhere = (params, filters = {}) => {
  const conditions = [];
  let paramIndex = params.length + 1;
  const { date, fromDate, toDate, month, year, week } = filters;

  if (date) {
    conditions.push(`er.report_date = $${paramIndex++}`);
    params.push(date);
  }
  if (fromDate) {
    conditions.push(`er.report_date >= $${paramIndex++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push(`er.report_date <= $${paramIndex++}`);
    params.push(toDate);
  }
  if (month) {
    conditions.push(`EXTRACT(MONTH FROM er.report_date) = $${paramIndex++}`);
    params.push(Number(month));
  }
  if (year) {
    conditions.push(`EXTRACT(YEAR FROM er.report_date) = $${paramIndex++}`);
    params.push(Number(year));
  }
  if (week) {
    conditions.push(`EXTRACT(WEEK FROM er.report_date) = $${paramIndex++}`);
    params.push(Number(week));
  }

  return { conditions, paramIndex };
};

const getOverview = async (req, res, next) => {
  try {
    const { locationId } = req.query;
    let empSql = "SELECT COUNT(*) FROM users WHERE role = 'EMPLOYEE'";
    let bizSql = "SELECT COUNT(*) FROM businesses";
    let pendSql = "SELECT COUNT(*) FROM users WHERE status = 'PENDING'";
    let repSql = "SELECT COUNT(*) FROM employee_reports er JOIN users u ON er.employee_id = u.id WHERE er.report_date = CURRENT_DATE";
    let callsSql = `
      SELECT SUM(CAST(ra.value AS INTEGER)) as total_calls
      FROM report_answers ra
      JOIN form_fields ff ON ra.field_id = ff.id
      JOIN employee_reports er ON ra.report_id = er.id
      JOIN users u ON er.employee_id = u.id
      WHERE ff.field_type = 'number' AND ff.field_name ILIKE '%call%'
      AND er.report_date = CURRENT_DATE
      AND ra.value ~ '^[0-9]+$'
    `;

    const params = [];
    if (locationId) {
      empSql += " AND location_id = $1";
      bizSql = "SELECT COUNT(DISTINCT eb.business_id) FROM employee_businesses eb JOIN users u ON eb.employee_id = u.id WHERE u.location_id = $1";
      pendSql += " AND location_id = $1";
      repSql += " AND u.location_id = $1";
      callsSql += " AND u.location_id = $1";
      params.push(locationId);
    }

    const [empRes, bizRes, pendRes, repRes, callsRes] = await Promise.all([
      query(empSql, params),
      query(bizSql, params),
      query(pendSql, params),
      query(repSql, params),
      query(callsSql, params)
    ]);

    return successResponse(res, {
      totalEmployees: parseInt(empRes.rows[0].count, 10),
      totalBusinesses: parseInt(bizRes.rows[0].count, 10),
      pendingApprovals: parseInt(pendRes.rows[0].count, 10),
      reportsToday: parseInt(repRes.rows[0].count, 10),
      totalCallsToday: parseInt(callsRes.rows[0].total_calls || 0, 10)
    }, 'Overview fetched');
  } catch (err) { next(err); }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const { locationId } = req.query;
    let sql = `
      SELECT u.id, u.name, SUM(CASE WHEN ff.field_name ILIKE '%positive leads%' AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::integer ELSE 0 END) as score
      FROM users u
      JOIN employee_reports er ON u.id = er.employee_id
      JOIN report_answers ra ON er.id = ra.report_id
      JOIN form_fields ff ON ra.field_id = ff.id
      WHERE ff.field_type = 'number'
    `;
    const params = [];
    if (locationId) {
      sql += " AND u.location_id = $1";
      params.push(locationId);
    }
    sql += `
      GROUP BY u.id, u.name
      ORDER BY score DESC
      LIMIT 10
    `;
    const result = await query(sql, params);
    return successResponse(res, result.rows, 'Leaderboard fetched');
  } catch (err) { next(err); }
};

const getPerformance = async (req, res, next) => {
  try {
    const {
      employeeId,
      businessId,
      date,
      fromDate,
      toDate,
      month,
      year,
      week,
      locationId,
      activityType,
      sortBy = 'report_date',
      sortDir = 'desc'
    } = req.query;

    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (req.user.role === 'EMPLOYEE') {
      conditions.push(`er.employee_id = $${paramIndex++}`);
      params.push(req.user.id);
    } else if (employeeId) {
      conditions.push(`er.employee_id = $${paramIndex++}`);
      params.push(employeeId);
    }

    if (businessId) {
      conditions.push(`er.business_id = $${paramIndex++}`);
      params.push(businessId);
    }

    if (locationId) {
      conditions.push(`u.location_id = $${paramIndex++}`);
      params.push(locationId);
    }

    if (activityType) {
      if (activityType === 'Callings') {
        conditions.push(`at.name ILIKE '%calling%'`);
      } else if (activityType === 'Fields') {
        conditions.push(`(at.name ILIKE '%field%' OR at.name ILIKE '%visit%')`);
      } else {
        conditions.push(`at.name = $${paramIndex++}`);
        params.push(activityType);
      }
    }

    const dateWhere = buildDateWhere(params, { date, fromDate, toDate, month, year, week });
    conditions.push(...dateWhere.conditions);
    paramIndex = dateWhere.paramIndex;

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortMap = {
      employee: 'employee_name',
      business: 'business_name',
      reports: 'report_count',
      score: 'numeric_total',
      report_date: 'last_report_date'
    };
    const sortColumn = sortMap[sortBy] || sortMap.report_date;
    const direction = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const summarySql = `
      SELECT
        u.id AS employee_id,
        u.name AS employee_name,
        b.id AS business_id,
        b.business_name,
        COUNT(DISTINCT er.id)::int AS report_count,
        COALESCE(SUM(CASE WHEN ff.field_name ILIKE '%positive leads%' AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS numeric_total,
        COALESCE(SUM(CASE WHEN (ff.field_name ILIKE '%dial%' OR ff.field_name ILIKE '%calls made%' OR ff.field_name ILIKE '%total calls%' OR (ff.field_name ILIKE '%calls%' AND ff.field_name NOT ILIKE '%answer%' AND ff.field_name NOT ILIKE '%positive%' AND ff.field_name NOT ILIKE '%negative%' AND ff.field_name NOT ILIKE '%conversion%')) AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS dialled_total,
        COALESCE(SUM(CASE WHEN ff.field_name ILIKE '%answer%' AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS answered_total,
        COALESCE(SUM(CASE WHEN (ff.field_name ILIKE '%visit%' OR ff.field_name ILIKE '%field visit%' OR ff.field_name ILIKE '%number of visits%') AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS visits_total,
        COALESCE(SUM(CASE WHEN ff.field_name ILIKE '%conversion%' AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS conversions_total,
        MIN(er.report_date) AS first_report_date,
        MAX(er.report_date) AS last_report_date
      FROM employee_reports er
      JOIN users u ON er.employee_id = u.id
      JOIN businesses b ON er.business_id = b.id
      JOIN activity_types at ON er.activity_type_id = at.id
      LEFT JOIN report_answers ra ON er.id = ra.report_id
      LEFT JOIN form_fields ff ON ra.field_id = ff.id
      ${where}
      GROUP BY u.id, u.name, b.id, b.business_name
      ORDER BY ${sortColumn} ${direction}
    `;

    const detailSql = `
      SELECT
        er.id,
        er.report_date,
        er.created_at,
        u.id AS employee_id,
        u.name AS employee_name,
        b.id AS business_id,
        b.business_name,
        bt.timing_name,
        at.name AS activity_name,
        COALESCE(SUM(CASE WHEN ff.field_name ILIKE '%positive leads%' AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS numeric_total,
        COALESCE(SUM(CASE WHEN (ff.field_name ILIKE '%dial%' OR ff.field_name ILIKE '%calls made%' OR ff.field_name ILIKE '%total calls%' OR (ff.field_name ILIKE '%calls%' AND ff.field_name NOT ILIKE '%answer%' AND ff.field_name NOT ILIKE '%positive%' AND ff.field_name NOT ILIKE '%negative%' AND ff.field_name NOT ILIKE '%conversion%')) AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS dialled_total,
        COALESCE(SUM(CASE WHEN ff.field_name ILIKE '%answer%' AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS answered_total,
        COALESCE(SUM(CASE WHEN (ff.field_name ILIKE '%visit%' OR ff.field_name ILIKE '%field visit%' OR ff.field_name ILIKE '%number of visits%') AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS visits_total,
        COALESCE(SUM(CASE WHEN ff.field_name ILIKE '%conversion%' AND ra.value ~ '^[0-9]+(\\.[0-9]+)?$' THEN ra.value::numeric ELSE 0 END), 0)::float AS conversions_total,
        COALESCE(
          json_agg(
            json_build_object(
              'fieldName', ff.field_name,
              'fieldType', ff.field_type,
              'value', ra.value
            )
            ORDER BY ff.display_order
          ) FILTER (WHERE ff.id IS NOT NULL),
          '[]'
        ) AS answers
      FROM employee_reports er
      JOIN users u ON er.employee_id = u.id
      JOIN businesses b ON er.business_id = b.id
      JOIN business_timings bt ON er.timing_id = bt.id
      JOIN activity_types at ON er.activity_type_id = at.id
      LEFT JOIN report_answers ra ON er.id = ra.report_id
      LEFT JOIN form_fields ff ON ra.field_id = ff.id
      ${where}
      GROUP BY er.id, u.id, u.name, b.id, b.business_name, bt.timing_name, at.name
      ORDER BY er.report_date DESC, er.created_at DESC
    `;

    const [summaryRes, detailsRes] = await Promise.all([
      query(summarySql, params),
      query(detailSql, params)
    ]);

    return successResponse(res, {
      summary: summaryRes.rows,
      details: detailsRes.rows
    }, 'Performance analytics fetched');
  } catch (err) {
    next(err);
  }
};

const getSubmissionStatus = async (req, res, next) => {
  try {
    const { businessId, employeeId, date, fromDate, toDate, locationId } = req.query;
    if (!businessId) {
      return res.status(400).json({ success: false, error: 'Business ID is required' });
    }

    const getLocalDateString = (d = new Date()) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const targetDate = date || getLocalDateString();
    const startStr = fromDate || targetDate;
    const endStr = toDate || targetDate;

    const startD = new Date(startStr);
    const endD = new Date(endStr);
    const dates = [];
    
    // limit to 31 days to prevent abuse
    let curr = new Date(startD);
    let count = 0;
    while(curr <= endD && count < 31) {
      dates.push(getLocalDateString(curr));
      curr.setDate(curr.getDate() + 1);
      count++;
    }

    // 1. Fetch all active employees assigned to this business
    let employeeSql = `
      SELECT u.id, u.name, u.email, u.phone, u.location_id
      FROM users u
      JOIN employee_businesses eb ON u.id = eb.employee_id
      WHERE eb.business_id = $1 AND u.role = 'EMPLOYEE' AND u.status = 'APPROVED'
    `;
    const employeeParams = [businessId];
    let empParamIdx = 2;
    if (locationId) {
      employeeSql += ` AND u.location_id = $${empParamIdx++}`;
      employeeParams.push(locationId);
    }
    if (employeeId) {
      employeeSql += ` AND u.id = $${empParamIdx++}`;
      employeeParams.push(employeeId);
    }
    employeeSql += ` ORDER BY u.name ASC`;
    const employeesRes = await query(employeeSql, employeeParams);

    // 2. Fetch all timings for this business
    const timingsRes = await query(
      `SELECT id, timing_name FROM business_timings WHERE business_id = $1 ORDER BY created_at ASC`,
      [businessId]
    );

    // 3. Fetch all reports for this business within dates
    let reportSql = `
      SELECT er.id, er.employee_id, er.timing_id, er.created_at, er.report_date
      FROM employee_reports er
      JOIN users u ON er.employee_id = u.id
      WHERE er.business_id = $1 AND er.report_date >= $2 AND er.report_date <= $3
    `;
    const reportParams = [businessId, startStr, endStr];
    let repParamIdx = 4;
    if (locationId) {
      reportSql += ` AND u.location_id = $${repParamIdx++}`;
      reportParams.push(locationId);
    }
    if (employeeId) {
      reportSql += ` AND er.employee_id = $${repParamIdx++}`;
      reportParams.push(employeeId);
    }
    const reportsRes = await query(reportSql, reportParams);

    // Helper to parse time slot (e.g. "11:00 AM")
    const parseTimingString = (str) => {
      const [time, ampm] = str.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return { hours: h, minutes: m };
    };

    // Sort timings chronologically in JS
    const sortedTimings = [...timingsRes.rows].sort((a, b) => {
      const ta = parseTimingString(a.timing_name);
      const tb = parseTimingString(b.timing_name);
      return (ta.hours * 60 + ta.minutes) - (tb.hours * 60 + tb.minutes);
    });

    const now = new Date();

    // Map submissions for easy lookup: employeeId -> reportDate -> timingId -> report
    const submissionMap = {};
    for (const rep of reportsRes.rows) {
      if (!submissionMap[rep.employee_id]) submissionMap[rep.employee_id] = {};
      const rDate = getLocalDateString(new Date(rep.report_date));
      if (!submissionMap[rep.employee_id][rDate]) submissionMap[rep.employee_id][rDate] = {};
      submissionMap[rep.employee_id][rDate][rep.timing_id] = rep;
    }

    // Fetch custom timings enablement for all employees in this business
    const customTimingsEnabledRes = await query(
      'SELECT employee_id, custom_timings_enabled FROM employee_businesses WHERE business_id = $1',
      [businessId]
    );
    const customTimingsEnabledMap = {};
    customTimingsEnabledRes.rows.forEach(r => {
      customTimingsEnabledMap[r.employee_id] = r.custom_timings_enabled;
    });

    // Fetch all custom timings entries for this business
    const customTimingsRes = await query(
      'SELECT employee_id, timing_id FROM employee_custom_timings WHERE business_id = $1',
      [businessId]
    );
    const employeeActiveTimingsMap = {};
    customTimingsRes.rows.forEach(r => {
      if (!employeeActiveTimingsMap[r.employee_id]) {
        employeeActiveTimingsMap[r.employee_id] = new Set();
      }
      employeeActiveTimingsMap[r.employee_id].add(r.timing_id);
    });

    // Prepare status matrix: flat list of (Employee, Date)
    const matrix = [];

    for (const emp of employeesRes.rows) {
      const customTimingsEnabled = customTimingsEnabledMap[emp.id] || false;
      const activeTimings = employeeActiveTimingsMap[emp.id] || new Set();

      for (const dStr of dates) {
        let submittedSlots = 0;
        let totalSlots = 0;

        const rowTimings = sortedTimings.map(t => {
          const isApplicable = !customTimingsEnabled || activeTimings.has(t.id);
          const submission = submissionMap[emp.id]?.[dStr]?.[t.id];

          if (!isApplicable) {
            return {
              timingId: t.id,
              timingName: t.timing_name,
              status: 'NOT_APPLICABLE',
              submittedAt: null
            };
          }

          totalSlots++;

          let status = 'PENDING'; // default
          let submittedAt = null;

          const { hours, minutes } = parseTimingString(t.timing_name);
          const [yr, mo, dy] = dStr.split('-').map(Number);
          const dueTime = new Date(yr, mo - 1, dy, hours, minutes, 0, 0);

          if (submission) {
            submittedAt = submission.created_at; // Date object
            const submittedDate = new Date(submittedAt);
            if (submittedDate <= dueTime) {
              status = 'ON_TIME';
            } else {
              status = 'LATE';
            }
            submittedSlots++;
          } else {
            // If no submission, check if timing has crossed
            if (now > dueTime) {
              status = 'MISSING';
            } else {
              status = 'PENDING';
            }
          }

          return {
            timingId: t.id,
            timingName: t.timing_name,
            status,
            submittedAt
          };
        });

        matrix.push({
          employeeId: emp.id,
          employeeName: emp.name,
          date: dStr,
          submittedSlots,
          totalSlots,
          timings: rowTimings
        });
      }
    }

    return successResponse(res, {
      timings: sortedTimings,
      matrix
    }, 'Submission status fetched successfully');

  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getLeaderboard, getPerformance, getSubmissionStatus };
