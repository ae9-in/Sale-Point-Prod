const express = require('express');
const router = express.Router();
const { 
  getUsers, approveUser, rejectUser, createUser, deleteUser,
  updateUserPassword, assignBusiness, unassignBusiness, getEmployeeBusinesses,
  getBusinessEmployees, updateUserLocation, updateEmployeeTimings
} = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Protect all admin routes
router.use(authenticate);

// Allow employee to get their own assigned businesses, or admin to get any
router.get('/employees/:id/businesses', (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN' || req.user.id === req.params.id) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Forbidden' });
}, getEmployeeBusinesses);

router.use(authorize('SUPER_ADMIN'));

router.get('/users', getUsers);
router.patch('/users/:id/approve', approveUser);
router.patch('/users/:id/reject', rejectUser);
router.delete('/users/:id', deleteUser);
router.get('/businesses/:id/employees', getBusinessEmployees);
router.patch('/users/:id/password', [
  body('password').isLength({ min: 6 })
], validate, updateUserPassword);
router.patch('/users/:id/location', updateUserLocation);

router.post('/users', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], validate, createUser);

router.post('/assign', [
  body('employeeId').isUUID(),
  body('businessId').isUUID()
], validate, assignBusiness);

router.delete('/assign/:employeeId/:businessId', unassignBusiness);
router.put('/employees/:employeeId/businesses/:businessId/timings', updateEmployeeTimings);

module.exports = router;
