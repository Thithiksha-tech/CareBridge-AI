const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', appointmentController.getAppointments);
router.get('/doctor-requests', appointmentController.getDoctorRequests);
router.get('/check-conflict', appointmentController.checkConflict);
router.post('/', appointmentController.createAppointment);
router.post('/request', appointmentController.requestAppointment);
router.post('/:id/doctor-respond', appointmentController.doctorRespond);
router.put('/:id', appointmentController.updateAppointment);
router.delete('/:id', appointmentController.deleteAppointment);
router.post('/:id/send-email', appointmentController.sendAppointmentEmail);
router.post('/:id/email', appointmentController.sendAppointmentEmail);

module.exports = router;
