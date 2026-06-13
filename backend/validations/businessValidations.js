const { body } = require('express-validator');

const businessValidation = [
  body('businessName').notEmpty().withMessage('Business name is required')
];

const timingValidation = [
  body('timingName').notEmpty().withMessage('Timing name is required')
];

const activityTypeValidation = [
  body('name').notEmpty().withMessage('Activity type name is required')
];

const fieldValidation = [
  body('fieldName').notEmpty().withMessage('Field name is required'),
  body('fieldType').isIn(['number', 'text', 'textarea', 'select', 'checkbox']).withMessage('Invalid field type')
];

module.exports = {
  businessValidation, timingValidation, activityTypeValidation, fieldValidation
};
