const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const { sendCreateDoctorAccountEmail } = require('../utils/email.service');

/**
 * @desc    Create a new doctor (Admin only)
 * @route   POST /api/admin/doctors
 * @access  Admin only
 */
const createDoctor = async (req, res) => {
    try {
        const { name, email, password, specialization } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required',
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists',
            });
        }

        // Create doctor
        const doctor = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role: 'doctor',
            specialization: specialization || null,
            authProvider: 'local',
        });

        await sendCreateDoctorAccountEmail(doctor.email, password);

        res.status(201).json({
            success: true,
            message: 'Doctor created successfully',
            data: {
                doctor: {
                    _id: doctor._id,
                    name: doctor.name,
                    email: doctor.email,
                    role: doctor.role,
                    specialization: doctor.specialization,
                    createdAt: doctor.createdAt,
                },
            },
        });
    } catch (error) {
        console.error('Create doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create doctor',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all doctors (Admin only)
 * @route   GET /api/admin/doctors
 * @access  Admin only
 */
const getAllDoctors = async (req, res) => {
    try {
        const doctors = await User.find({ role: 'doctor' })
            .select('name email specialization createdAt isActive')
            .sort({ createdAt: -1 });

        // Get patient count for each doctor
        const doctorsWithDetails = await Promise.all(
            doctors.map(async (doctor) => {
                const patientCount = await User.countDocuments({
                    role: 'patient',
                    assignedDoctor: doctor._id,
                });

                return {
                    _id: doctor._id,
                    name: doctor.name,
                    email: doctor.email,
                    specialization: doctor.specialization,
                    patientCount,
                    isActive: doctor.isActive,
                    createdAt: doctor.createdAt,
                };
            })
        );

        res.status(200).json({
            success: true,
            data: {
                doctors: doctorsWithDetails,
                total: doctorsWithDetails.length,
            },
        });
    } catch (error) {
        console.error('Get all doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctors',
        });
    }
};

/**
 * @desc    Delete a doctor (Admin only)
 * @route   DELETE /api/admin/doctors/:id
 * @access  Admin only
 */
const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const doctor = await User.findById(id);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found',
            });
        }

        if (doctor.role !== 'doctor') {
            return res.status(400).json({
                success: false,
                message: 'User is not a doctor',
            });
        }

        // Remove doctor assignment from patients
        await User.updateMany(
            { assignedDoctor: id },
            { $set: { assignedDoctor: null } }
        );

        await User.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Doctor deleted successfully',
        });
    } catch (error) {
        console.error('Delete doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete doctor',
        });
    }
};

/**
 * @desc    Update doctor specialization (Admin only)
 * @route   PUT /api/admin/doctors/:id
 * @access  Admin only
 */
const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, specialization } = req.body;

        const doctor = await User.findById(id);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found',
            });
        }

        if (doctor.role !== 'doctor') {
            return res.status(400).json({
                success: false,
                message: 'User is not a doctor',
            });
        }

        if (name) doctor.name = name;
        if (specialization !== undefined) doctor.specialization = specialization;

        await doctor.save();

        res.status(200).json({
            success: true,
            message: 'Doctor updated successfully',
            data: {
                doctor: {
                    _id: doctor._id,
                    name: doctor.name,
                    email: doctor.email,
                    specialization: doctor.specialization,
                },
            },
        });
    } catch (error) {
        console.error('Update doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update doctor',
        });
    }
};

module.exports = {
    createDoctor,
    getAllDoctors,
    deleteDoctor,
    updateDoctor,
};
