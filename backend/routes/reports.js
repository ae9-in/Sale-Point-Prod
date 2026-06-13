const express = require('express');
const router = express.Router();
const { submitReport, getReports, getReportDetails } = require('../controllers/reportController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.post('/', submitReport);
router.get('/', getReports);
router.get('/mine', getReports);
router.get('/:id', getReportDetails);

module.exports = router;
