const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', reminderController.listReminders);
router.get('/grouped', reminderController.getGroupedReminders);
router.post('/', reminderController.createReminder);
router.post('/send-email', reminderController.sendEmailAlert);
router.post('/test-email', reminderController.testEmail);
router.post('/:id/send', reminderController.sendReminderEmail);
router.patch('/:id', reminderController.updateReminder);
router.patch('/:id/status', reminderController.updateReminderStatus);
router.patch('/:id/toggle', reminderController.toggleReminderStatus);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;
