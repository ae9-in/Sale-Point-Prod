const express = require('express');
const router = express.Router();
const { 
  getDefaultTargets, 
  createDefaultTarget, 
  updateDefaultTarget, 
  deleteDefaultTarget 
} = require('../controllers/defaultTargetController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

// All routes are admin only
router.get('/', getDefaultTargets);
router.post('/', createDefaultTarget);
router.put('/:id', updateDefaultTarget);
router.delete('/:id', deleteDefaultTarget);

module.exports = router;
