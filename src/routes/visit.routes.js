const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
    createVisitSummary,
    getDoctorPatients,
    getPatientVisits,
    getVisitSummaryById,
    getDoctorVisits,
    getDoctors,
    assignDoctor,
} = require('../controllers/visit.controller');

// All routes require authentication
router.use(authenticate);

// ============================================
// DOCTOR ROUTES
// ============================================

/**
 * @route   POST /api/visit-summary
 * @desc    Create a new visit summary (Doctor only)
 * @access  Doctor
 */
router.post(
    '/visit-summary',
    authorize('doctor'),
    createVisitSummary
);

/**
 * @route   GET /api/doctor/patients
 * @desc    Get list of patients assigned to this doctor
 * @access  Doctor
 */
router.get(
    '/doctor/patients',
    authorize('doctor'),
    getDoctorPatients
);

/**
 * @route   GET /api/doctor/visits
 * @desc    Get all visit summaries created by this doctor
 * @access  Doctor
 */
router.get(
    '/doctor/visits',
    authorize('doctor'),
    getDoctorVisits
);

// ============================================
// PATIENT ROUTES
// ============================================

/**
 * @route   GET /api/patient/visits
 * @desc    Get patient's own visit summaries
 * @access  Patient
 */
router.get(
    '/patient/visits',
    authorize('patient'),
    getPatientVisits
);

/**
 * @route   GET /api/doctors
 * @desc    Get list of all doctors (for scheduling)
 * @access  Patient
 */
router.get(
    '/doctors',
    authorize('patient'),
    getDoctors
);

/**
 * @route   POST /api/patient/assign-doctor
 * @desc    Assign patient to a doctor (schedule appointment)
 * @access  Patient
 */
router.post(
    '/patient/assign-doctor',
    authorize('patient'),
    assignDoctor
);

// ============================================
// SHARED ROUTES
// ============================================

/**
 * @route   GET /api/visit-summary/:id
 * @desc    Get a specific visit summary (doctor who created OR owning patient)
 * @access  Doctor or Patient (with ownership check)
 */
router.get(
    '/visit-summary/:id',
    getVisitSummaryById
);

module.exports = router;
