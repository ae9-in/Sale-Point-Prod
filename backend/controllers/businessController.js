const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Businesses
const getBusinesses = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM businesses ORDER BY created_at DESC');
    return successResponse(res, result.rows, 'Businesses fetched');
  } catch (err) { next(err); }
};

const createBusiness = async (req, res, next) => {
  try {
    const { businessName, description, active } = req.body;
    const result = await query(
      'INSERT INTO businesses (business_name, description, active) VALUES ($1, $2, $3) RETURNING *',
      [businessName, description, active ?? true]
    );
    return successResponse(res, result.rows[0], 'Business created', 201);
  } catch (err) { next(err); }
};

const updateBusiness = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { businessName, description, active } = req.body;
    const result = await query(
      'UPDATE businesses SET business_name = $1, description = $2, active = $3 WHERE id = $4 RETURNING *',
      [businessName, description, active, id]
    );
    if (result.rows.length === 0) return errorResponse(res, 'Business not found', 404);
    return successResponse(res, result.rows[0], 'Business updated');
  } catch (err) { next(err); }
};

const deleteBusiness = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM businesses WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return errorResponse(res, 'Business not found', 404);
    return successResponse(res, null, 'Business deleted');
  } catch (err) { next(err); }
};

// Timings
const getTimings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM business_timings WHERE business_id = $1 ORDER BY created_at ASC', [id]);
    return successResponse(res, result.rows, 'Timings fetched');
  } catch (err) { next(err); }
};

const createTiming = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { timingName } = req.body;
    const result = await query('INSERT INTO business_timings (business_id, timing_name) VALUES ($1, $2) RETURNING *', [id, timingName]);
    return successResponse(res, result.rows[0], 'Timing created', 201);
  } catch (err) { next(err); }
};

const updateTiming = async (req, res, next) => {
  try {
    const { timingId } = req.params;
    const { timingName } = req.body;
    const result = await query(
      'UPDATE business_timings SET timing_name = $1 WHERE id = $2 RETURNING *',
      [timingName, timingId]
    );
    if (result.rows.length === 0) return errorResponse(res, 'Timing not found', 404);
    return successResponse(res, result.rows[0], 'Timing updated');
  } catch (err) { next(err); }
};

const deleteTiming = async (req, res, next) => {
  try {
    const { timingId } = req.params;
    const result = await query('DELETE FROM business_timings WHERE id = $1 RETURNING id', [timingId]);
    if (result.rows.length === 0) return errorResponse(res, 'Timing not found', 404);
    return successResponse(res, null, 'Timing deleted');
  } catch (err) { next(err); }
};

// Activity Types
const getActivityTypes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM activity_types WHERE business_id = $1', [id]);
    return successResponse(res, result.rows, 'Activity types fetched');
  } catch (err) { next(err); }
};

const createActivityType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await query('INSERT INTO activity_types (business_id, name) VALUES ($1, $2) RETURNING *', [id, name]);
    return successResponse(res, result.rows[0], 'Activity type created', 201);
  } catch (err) { next(err); }
};

const deleteActivityType = async (req, res, next) => {
  try {
    const { typeId } = req.params;
    const result = await query('DELETE FROM activity_types WHERE id = $1 RETURNING id', [typeId]);
    if (result.rows.length === 0) return errorResponse(res, 'Activity type not found', 404);
    return successResponse(res, null, 'Activity type deleted');
  } catch (err) { next(err); }
};

// Fields
const getFields = async (req, res, next) => {
  try {
    const { typeId } = req.params;
    const result = await query('SELECT * FROM form_fields WHERE activity_type_id = $1 ORDER BY display_order ASC', [typeId]);
    return successResponse(res, result.rows, 'Fields fetched');
  } catch (err) { next(err); }
};

const createField = async (req, res, next) => {
  try {
    const { typeId } = req.params;
    const { fieldName, fieldType, required, displayOrder } = req.body;
    const result = await query(
      'INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [typeId, fieldName, fieldType, required ?? false, displayOrder ?? 0]
    );
    return successResponse(res, result.rows[0], 'Field created', 201);
  } catch (err) { next(err); }
};

const updateField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const { fieldName, fieldType, required, displayOrder } = req.body;
    const result = await query(
      'UPDATE form_fields SET field_name = $1, field_type = $2, required = $3, display_order = $4 WHERE id = $5 RETURNING *',
      [fieldName, fieldType, required, displayOrder, fieldId]
    );
    if (result.rows.length === 0) return errorResponse(res, 'Field not found', 404);
    return successResponse(res, result.rows[0], 'Field updated');
  } catch (err) { next(err); }
};

const deleteField = async (req, res, next) => {
  try {
    const { fieldId } = req.params;
    const result = await query('DELETE FROM form_fields WHERE id = $1 RETURNING id', [fieldId]);
    if (result.rows.length === 0) return errorResponse(res, 'Field not found', 404);
    return successResponse(res, null, 'Field deleted');
  } catch (err) { next(err); }
};

module.exports = {
  getBusinesses, createBusiness, updateBusiness, deleteBusiness,
  getTimings, createTiming, updateTiming, deleteTiming,
  getActivityTypes, createActivityType, deleteActivityType,
  getFields, createField, updateField, deleteField
};
