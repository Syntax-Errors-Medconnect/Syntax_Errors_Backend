const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
    createDoctor,
    getAllDoctors,
    deleteDoctor,
    updateDoctor,
} = require('../controllers/admin.controller');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   POST /api/admin/doctors
 * @desc    Create a new doctor
 * @access  Admin only
 */
router.post('/doctors', createDoctor);

/**
 * @route   GET /api/admin/doctors
 * @desc    Get all doctors
 * @access  Admin only
 */
router.get('/doctors', getAllDoctors);

/**
 * @route   PUT /api/admin/doctors/:id
 * @desc    Update a doctor
 * @access  Admin only
 */
router.put('/doctors/:id', updateDoctor);

/**
 * @route   DELETE /api/admin/doctors/:id
 * @desc    Delete a doctor
 * @access  Admin only
 */
router.delete('/doctors/:id', deleteDoctor);

module.exports = router;
