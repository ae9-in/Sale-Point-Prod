const express = require('express');
const router = express.Router();
const { getLocations, createLocation } = require('../controllers/locationController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// Public route: Allow any prospective user to see locations during registration
router.get('/', getLocations);

// Admin-only route: Create new locations
router.post('/', authenticate, authorize('SUPER_ADMIN'), createLocation);

module.exports = router;
