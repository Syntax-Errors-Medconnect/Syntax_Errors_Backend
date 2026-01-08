const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
    createAppointment,
    getDoctorAppointments,
    getPatientAppointments,
    acceptAppointment,
    rejectAppointment,
    getPendingCount,
} = require('../controllers/appointment.controller');

// All routes require authentication
router.use(authenticate);

// ============================================
// PATIENT ROUTES
// ============================================

/**
 * @route   POST /api/appointments
 * @desc    Create a new appointment request (Patient only)
 * @access  Patient
 */
router.post(
    '/',
    authorize('patient'),
    createAppointment
);

/**
 * @route   GET /api/patient/appointments
 * @desc    Get patient's own appointments
 * @access  Patient
 */
router.get(
    '/patient',
    authorize('patient'),
    getPatientAppointments
);

// ============================================
// DOCTOR ROUTES
// ============================================

/**
 * @route   GET /api/appointments/doctor
 * @desc    Get all appointments for this doctor
 * @access  Doctor
 */
router.get(
    '/doctor',
    authorize('doctor'),
    getDoctorAppointments
);

/**
 * @route   GET /api/appointments/doctor/count
 * @desc    Get pending appointment count for badge
 * @access  Doctor
 */
router.get(
    '/doctor/count',
    authorize('doctor'),
    getPendingCount
);

/**
 * @route   PUT /api/appointments/:id/accept
 * @desc    Accept an appointment
 * @access  Doctor
 */
router.put(
    '/:id/accept',
    authorize('doctor'),
    acceptAppointment
);

/**
 * @route   PUT /api/appointments/:id/reject
 * @desc    Reject an appointment
 * @access  Doctor
 */
router.put(
    '/:id/reject',
    authorize('doctor'),
    rejectAppointment
);

module.exports = router;
