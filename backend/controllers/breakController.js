const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { sendEmail } = require('../utils/mailer');

// 1. Start a Scheduled or Emergency Break
const startBreak = async (req, res, next) => {
  try {
    const employeeId = req.user.id;
    const { breakType, reason, estimatedDuration } = req.body;

    if (!breakType) {
      return errorResponse(res, 'Break type is required', 400);
    }

    // Check if employee already has an active break
    const activeCheck = await query(
      'SELECT id FROM breaks WHERE employee_id = $1 AND ended_at IS NULL LIMIT 1',
      [employeeId]
    );
    if (activeCheck.rows.length > 0) {
      return errorResponse(res, 'A break is already in progress', 400);
    }

    // Check if this scheduled break has already been completed today (only for scheduled ones)
    if (breakType !== 'Emergency Break') {
      const completedCheck = await query(
        'SELECT id FROM breaks WHERE employee_id = $1 AND break_type = $2 AND started_at::date = CURRENT_DATE LIMIT 1',
        [employeeId, breakType]
      );
      if (completedCheck.rows.length > 0) {
        return errorResponse(res, 'This break slot has already been completed today', 400);
      }
    }

    // Create the break record
    let result;
    if (breakType === 'Emergency Break') {
      // Emergency break starts immediately with emergency_status = 'approved' and status = 'Active'
      result = await query(
        'INSERT INTO breaks (employee_id, break_type, status, emergency_status, reason, estimated_duration, started_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
        [employeeId, breakType, 'Active', 'approved', reason || 'Emergency break taken', estimatedDuration || 15]
      );
    } else {
      result = await query(
        'INSERT INTO breaks (employee_id, break_type, status, emergency_status, started_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        [employeeId, breakType, 'Active', 'idle']
      );
    }

    return successResponse(res, result.rows[0], 'Break started successfully');
  } catch (err) {
    next(err);
  }
};

// 2. Request Emergency Break (Stub - legacy compatibility)
const requestEmergencyBreak = async (req, res, next) => {
  return startBreak(req, res, next);
};

// 3. Start Approved Emergency Break (Stub - legacy compatibility)
const startEmergencyBreak = async (req, res, next) => {
  try {
    const employeeId = req.user.id;
    const check = await query(
      'SELECT * FROM breaks WHERE employee_id = $1 AND ended_at IS NULL LIMIT 1',
      [employeeId]
    );
    if (check.rows.length > 0) {
      return successResponse(res, check.rows[0], 'Break already active');
    }
    return errorResponse(res, 'No active emergency break request', 404);
  } catch (err) {
    next(err);
  }
};

// 4. End Active Break
const endBreak = async (req, res, next) => {
  try {
    const employeeId = req.user.id;

    // Find the active break
    const activeRes = await query(
      'SELECT * FROM breaks WHERE employee_id = $1 AND ended_at IS NULL LIMIT 1',
      [employeeId]
    );

    if (activeRes.rows.length === 0) {
      return errorResponse(res, 'No active break found', 404);
    }

    const activeBreak = activeRes.rows[0];
    const durationSeconds = Math.max(0, Math.floor((Date.now() - new Date(activeBreak.started_at)) / 1000));
    
    // Determine limit
    let allowedMinutes = 0;
    if (activeBreak.break_type === 'Morning Break') allowedMinutes = 15;
    else if (activeBreak.break_type === 'Afternoon Break') allowedMinutes = 45;
    else if (activeBreak.break_type === 'Evening Break') allowedMinutes = 15;

    let status = 'On Time';
    let notes = '';

    if (allowedMinutes > 0) {
      const allowedSeconds = allowedMinutes * 60;
      if (durationSeconds > allowedSeconds) {
        const overMinutes = Math.ceil((durationSeconds - allowedSeconds) / 60);
        status = `Overtime +${overMinutes}m`;
        notes = 'Overage alert sent';
      }
    }

    // Update the break record
    const result = await query(
      'UPDATE breaks SET ended_at = NOW(), duration_seconds = $1, status = $2, notes = $3 WHERE id = $4 RETURNING *',
      [durationSeconds, status, notes, activeBreak.id]
    );

    return successResponse(res, result.rows[0], 'Break ended successfully');
  } catch (err) {
    next(err);
  }
};

// 5. Get Active Break
const getActiveBreak = async (req, res, next) => {
  try {
    const employeeId = req.user.id;
    const result = await query(
      'SELECT * FROM breaks WHERE employee_id = $1 AND ended_at IS NULL LIMIT 1',
      [employeeId]
    );
    
    return successResponse(res, result.rows[0] || null, 'Active break fetched');
  } catch (err) {
    next(err);
  }
};

// 6. Get Today's Completed History for Employee
const getTodayHistory = async (req, res, next) => {
  try {
    const employeeId = req.user.id;
    const result = await query(
      'SELECT * FROM breaks WHERE employee_id = $1 AND started_at::date = CURRENT_DATE AND ended_at IS NOT NULL ORDER BY started_at DESC',
      [employeeId]
    );

    const formatted = result.rows.map(r => ({
      id: r.id,
      type: r.break_type,
      startedAt: new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      endedAt: new Date(r.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      durationSeconds: r.duration_seconds,
      status: r.status,
      notes: r.notes
    }));

    return successResponse(res, formatted, 'Today\'s break history fetched');
  } catch (err) {
    next(err);
  }
};

// ================= ADMIN CONTROLLERS =================

// 7. Get All Active Breaks (Admin View)
const getAdminActiveBreaks = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*, u.name as employee_name, u.email as employee_email 
       FROM breaks b 
       JOIN users u ON b.employee_id = u.id 
       WHERE b.ended_at IS NULL
       ORDER BY b.started_at DESC`
    );
    return successResponse(res, result.rows, 'Active breaks fetched');
  } catch (err) {
    next(err);
  }
};

// 8. Get All Pending Emergency Requests (Admin View - Stub)
const getAdminPendingRequests = async (req, res, next) => {
  return successResponse(res, [], 'Pending emergency requests fetched');
};

// 9. Get Today's Completed Breaks across all employees (Admin View)
const getAdminTodayHistory = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*, u.name as employee_name, u.email as employee_email 
       FROM breaks b 
       JOIN users u ON b.employee_id = u.id 
       WHERE b.started_at::date = CURRENT_DATE AND b.ended_at IS NOT NULL
       ORDER BY b.ended_at DESC`
    );
    return successResponse(res, result.rows, 'Today\'s completed breaks fetched');
  } catch (err) {
    next(err);
  }
};

// 10. Admin Decide on Emergency Request (Stub)
const adminDecideEmergency = async (req, res, next) => {
  return successResponse(res, null, 'No approval required. Action stubbed.');
};

// 11. Send Overage Alert Email
const sendOverageAlertEmail = async (req, res, next) => {
  try {
    const employeeId = req.user.id;

    // Find active break
    const activeRes = await query(
      'SELECT * FROM breaks WHERE employee_id = $1 AND ended_at IS NULL LIMIT 1',
      [employeeId]
    );

    if (activeRes.rows.length === 0) {
      return errorResponse(res, 'No active break found to trigger overage', 404);
    }

    const activeBreak = activeRes.rows[0];

    // Check if overage alert was already sent for this break
    if (activeBreak.notes && activeBreak.notes.includes('Overage alert sent')) {
      return successResponse(res, null, 'Overage alert already processed');
    }

    // Determine allowed limits
    let allowedMinutes = 0;
    if (activeBreak.break_type === 'Morning Break') allowedMinutes = 15;
    else if (activeBreak.break_type === 'Afternoon Break') allowedMinutes = 45;
    else if (activeBreak.break_type === 'Evening Break') allowedMinutes = 15;

    // Fetch employee details
    const empRes = await query('SELECT name, email FROM users WHERE id = $1', [employeeId]);
    if (empRes.rows.length === 0) {
      return errorResponse(res, 'Employee not found', 404);
    }
    const employee = empRes.rows[0];

    // Calculate current duration
    const durationSeconds = Math.max(0, Math.floor((Date.now() - new Date(activeBreak.started_at)) / 1000));
    const durationMins = Math.ceil(durationSeconds / 60);

    // Update break status and notes in DB
    const overMinutes = Math.max(1, durationMins - allowedMinutes);
    await query(
      'UPDATE breaks SET status = $1, notes = $2 WHERE id = $3',
      [`Overtime +${overMinutes}m`, 'Overage alert sent', activeBreak.id]
    );

    // Send emails
    const adminEmail = process.env.ADMIN_EMAIL || 'hr.admin@aksharaenterprises.info';
    const subject = `[Sales Point] Break Overage Alert: ${employee.name} — ${activeBreak.break_type}`;
    const body = `
      <h3>Break Overage Alert</h3>
      <p>Employee <strong>${employee.name}</strong> (${employee.email}) has exceeded the break limit.</p>
      <ul>
        <li><strong>Break Type:</strong> ${activeBreak.break_type}</li>
        <li><strong>Allowed Limit:</strong> ${allowedMinutes} minutes</li>
        <li><strong>Current Duration:</strong> ${durationMins} minutes</li>
        <li><strong>Overage:</strong> ${overMinutes} minute(s)</li>
        <li><strong>Start Time:</strong> ${new Date(activeBreak.started_at).toLocaleString()}</li>
      </ul>
      <p>Please monitor employee activity accordingly.</p>
    `;

    // Send to admin
    await sendEmail({
      to: adminEmail,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, '')
    });

    // Send to employee
    await sendEmail({
      to: employee.email,
      subject: `Your ${activeBreak.break_type} exceeded the limit`,
      html: body,
      text: body.replace(/<[^>]*>/g, '')
    });

    return successResponse(res, null, 'Overage alert sent successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startBreak,
  requestEmergencyBreak,
  startEmergencyBreak,
  endBreak,
  getActiveBreak,
  getTodayHistory,
  getAdminActiveBreaks,
  getAdminPendingRequests,
  getAdminTodayHistory,
  adminDecideEmergency,
  sendOverageAlertEmail
};
