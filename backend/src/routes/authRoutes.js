const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.get('/network', authController.getRoleNetwork);

// Protected routes
router.get('/me', authenticateToken, authController.getMe);
router.get('/otp-status', authenticateToken, authController.getOtpStatus);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/test-email', authenticateToken, authController.sendTestReminder);

module.exports = router;
