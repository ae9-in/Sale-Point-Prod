const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getDefaultTargets = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT dt.*, b.business_name 
      FROM default_targets dt
      LEFT JOIN businesses b ON dt.business_id = b.id
      WHERE dt.employee_id IS NULL
      ORDER BY dt.created_at DESC
    `);
    return successResponse(res, result.rows, 'Default targets fetched');
  } catch (err) { next(err); }
};

const createDefaultTarget = async (req, res, next) => {
  try {
    const { businessId, targetName, targetValue } = req.body;
    
    // businessId can be null for "All Businesses"
    const parsedBusinessId = businessId || null;

    const result = await query(
      'INSERT INTO default_targets (business_id, target_name, target_value) VALUES ($1, $2, $3) RETURNING *',
      [parsedBusinessId, targetName, targetValue]
    );
    return successResponse(res, result.rows[0], 'Default target created', 201);
  } catch (err) { next(err); }
};

const updateDefaultTarget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { businessId, targetName, targetValue } = req.body;
    
    const parsedBusinessId = businessId || null;

    const result = await query(
      'UPDATE default_targets SET business_id = $1, target_name = $2, target_value = $3 WHERE id = $4 RETURNING *',
      [parsedBusinessId, targetName, targetValue, id]
    );

    if (result.rows.length === 0) return errorResponse(res, 'Default target not found', 404);
    return successResponse(res, result.rows[0], 'Default target updated');
  } catch (err) { next(err); }
};

const deleteDefaultTarget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM default_targets WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) return errorResponse(res, 'Default target not found', 404);
    return successResponse(res, null, 'Default target deleted');
  } catch (err) { next(err); }
};

module.exports = {
  getDefaultTargets,
  createDefaultTarget,
  updateDefaultTarget,
  deleteDefaultTarget
};
