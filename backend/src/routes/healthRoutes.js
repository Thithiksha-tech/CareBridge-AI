const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Vitals, blood reports, sugar reports & day routine streak
router.get('/logs', healthController.getHealthLogs);
router.post('/logs', healthController.createHealthLog);
router.post('/analyze-vitals', healthController.analyzeVitals);
router.post('/emergency', healthController.triggerEmergency);

// Caretaker medication stock & pill adherence monitoring
router.get('/medication-stock', healthController.getMedicationStock);
router.post('/medication-stock/:id', healthController.updateMedicationStock);

module.exports = router;
