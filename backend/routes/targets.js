const express = require('express');
const router = express.Router();
const { getTargets, createTarget, createBusinessTarget, updateTarget, deleteTarget, getTargetSummary, getBulkTargets, bulkUpsertTargets } = require('../controllers/targetController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

// Admin & Employee can view targets and summaries
router.get('/', getTargets);
router.get('/employee/:id/summary', getTargetSummary);
router.get('/business/:businessId', getBulkTargets);

// Only admin can modify targets
router.post('/', authorize('SUPER_ADMIN'), createTarget);
router.post('/bulk', authorize('SUPER_ADMIN'), bulkUpsertTargets);
router.post('/business', authorize('SUPER_ADMIN'), createBusinessTarget);
router.put('/:id', authorize('SUPER_ADMIN'), updateTarget);
router.delete('/:id', authorize('SUPER_ADMIN'), deleteTarget);

module.exports = router;
