const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/status', settingsController.getSettingsStatus);
router.get('/email', settingsController.getEmailSettings);
router.post('/email', settingsController.updateEmailSettings);
router.post('/email/test', settingsController.testSmtp);
router.get('/ai', settingsController.getAiSettings);
router.post('/ai', settingsController.updateAiSettings);
router.post('/api-key', settingsController.updateAiSettings);
router.get('/email-logs', settingsController.getEmailLogs);

module.exports = router;
