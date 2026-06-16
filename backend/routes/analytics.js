const express = require('express');
const router = express.Router();
const { getOverview, getLeaderboard, getPerformance, getSubmissionStatus } = require('../controllers/analyticsController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get('/performance', getPerformance);

router.use(authorize('SUPER_ADMIN'));

router.get('/overview', getOverview);
router.get('/leaderboard', getLeaderboard);
router.get('/submission-status', getSubmissionStatus);

module.exports = router;
