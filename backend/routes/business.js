const express = require('express');
const router = express.Router();
const {
  getBusinesses, createBusiness, updateBusiness, deleteBusiness,
  getTimings, createTiming, updateTiming, deleteTiming,
  getActivityTypes, createActivityType, deleteActivityType,
  getFields, createField, updateField, deleteField
} = require('../controllers/businessController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { businessValidation, timingValidation, activityTypeValidation, fieldValidation } = require('../validations/businessValidations');

router.use(authenticate);

// GET routes (accessible to any authenticated user)
router.get('/', getBusinesses);
router.get('/:id/timings', getTimings);
router.get('/:id/activity-types', getActivityTypes);
router.get('/:id/activity-types/:typeId/fields', getFields);

// Modifying routes (restricted to SUPER_ADMIN)
router.post('/', authorize('SUPER_ADMIN'), businessValidation, validate, createBusiness);
router.put('/:id', authorize('SUPER_ADMIN'), businessValidation, validate, updateBusiness);
router.delete('/:id', authorize('SUPER_ADMIN'), deleteBusiness);

router.post('/:id/timings', authorize('SUPER_ADMIN'), timingValidation, validate, createTiming);
router.put('/:id/timings/:timingId', authorize('SUPER_ADMIN'), timingValidation, validate, updateTiming);
router.delete('/:id/timings/:timingId', authorize('SUPER_ADMIN'), deleteTiming);

router.post('/:id/activity-types', authorize('SUPER_ADMIN'), activityTypeValidation, validate, createActivityType);
router.delete('/:id/activity-types/:typeId', authorize('SUPER_ADMIN'), deleteActivityType);

router.post('/:id/activity-types/:typeId/fields', authorize('SUPER_ADMIN'), fieldValidation, validate, createField);
router.put('/:id/activity-types/:typeId/fields/:fieldId', authorize('SUPER_ADMIN'), fieldValidation, validate, updateField);
router.delete('/:id/activity-types/:typeId/fields/:fieldId', authorize('SUPER_ADMIN'), deleteField);

module.exports = router;
