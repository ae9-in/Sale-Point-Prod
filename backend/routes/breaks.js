const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/breakController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// Protect all break routes
router.use(authenticate);

// Employee routes
router.post('/start', startBreak);
router.post('/emergency/request', requestEmergencyBreak);
router.post('/emergency/start', startEmergencyBreak);
router.post('/end', endBreak);
router.get('/active', getActiveBreak);
router.get('/history/today', getTodayHistory);
router.post('/overage-alert', sendOverageAlertEmail);

// Admin-only routes
router.use(authorize('SUPER_ADMIN'));
router.get('/admin/active', getAdminActiveBreaks);
router.get('/admin/requests', getAdminPendingRequests);
router.get('/admin/history', getAdminTodayHistory);
router.patch('/admin/decide/:id', adminDecideEmergency);

module.exports = router;
