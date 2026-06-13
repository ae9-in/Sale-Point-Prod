const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createDoubt, getDoubts, resolveDoubt } = require('../controllers/doubtController');

const router = express.Router();

router.use(authenticate);

router.get('/', getDoubts);
router.post('/', [
  body('businessId').isUUID(),
  body('question').trim().notEmpty()
], validate, createDoubt);
router.patch('/:id/resolve', authorize('SUPER_ADMIN'), resolveDoubt);

module.exports = router;
