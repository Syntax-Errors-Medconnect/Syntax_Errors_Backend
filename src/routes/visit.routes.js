const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
    createVisitSummary,
    getDoctorPatients,
    getPatientVisits,
    getVisitSummaryById,
} = require('../controllers/visit.controller');

// All routes require authentication
router.use(authenticate);

// Doctor only routes
router.post(
    '/',
    authorize('doctor'),
    createVisitSummary
);

router.get(
    '/doctor/patients',
    authorize('doctor'),
    getDoctorPatients
);

// Patient only routes
router.get(
    '/patient/visits',
    authorize('patient'),
    getPatientVisits
);

// Shared routes (Access control inside controller)
router.get(
    '/:id',
    getVisitSummaryById
);

module.exports = router;
