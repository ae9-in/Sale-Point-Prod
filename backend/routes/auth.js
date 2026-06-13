const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, me, updateProfile } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validations/authValidations');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
