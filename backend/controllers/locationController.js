const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getLocations = async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, created_at FROM locations ORDER BY name ASC');
    return successResponse(res, result.rows, 'Locations fetched successfully');
  } catch (err) {
    next(err);
  }
};

const createLocation = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return errorResponse(res, 'Location name is required', 400);
    }
    
    const trimmedName = name.trim();
    
    // Check if location exists
    const existing = await query('SELECT id FROM locations WHERE LOWER(name) = LOWER($1)', [trimmedName]);
    if (existing.rows.length > 0) {
      return errorResponse(res, 'Location already exists', 400);
    }

    const result = await query(
      'INSERT INTO locations (name) VALUES ($1) RETURNING id, name, created_at',
      [trimmedName]
    );

    return successResponse(res, result.rows[0], 'Location created successfully', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLocations,
  createLocation
};
