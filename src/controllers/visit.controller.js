const VisitSummary = require('../models/visitSummary.model');
const User = require('../models/user.model');

/**
 * Create a new visit summary (Doctor only)
 */
const createVisitSummary = async (req, res) => {
    try {
        const { patientId, visitDate, summaryText } = req.body;

        // Verify patient exists
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found',
            });
        }

        // Verify patient role (optional, but good for data integrity)
        if (patient.role !== 'patient') {
            return res.status(400).json({
                success: false,
                message: 'Target user is not a patient',
            });
        }

        const visitSummary = await VisitSummary.create({
            patientId,
            doctorId: req.userId,
            visitDate: visitDate || Date.now(),
            summaryText,
        });

        res.status(201).json({
            success: true,
            message: 'Visit summary created successfully',
            data: visitSummary,
        });
    } catch (error) {
        console.error('Create visit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create visit summary',
            error: error.message,
        });
    }
};

/**
 * Get all patients for a doctor (Unique list based on visited patients)
 * Note: In a real system, you might have a generic User query, 
 * but for this specific scope, we list patients the doctor has seen (or all patients if needed, but per requirements: "list unique patients attended")
 */
const getDoctorPatients = async (req, res) => {
    try {
        // Find all visits by this doctor, distinct patientIds
        const patientIds = await VisitSummary.find({ doctorId: req.userId }).distinct('patientId');

        // Fetch user details for these patients
        const patients = await User.find({
            _id: { $in: patientIds },
            role: 'patient',
        }).select('name email profilePicture');

        res.status(200).json({
            success: true,
            data: patients,
        });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patients',
        });
    }
};

/**
 * Get visits for the authenticated patient
 */
const getPatientVisits = async (req, res) => {
    try {
        const visits = await VisitSummary.find({ patientId: req.userId })
            .populate('doctorId', 'name email')
            .sort({ visitDate: -1 });

        res.status(200).json({
            success: true,
            data: visits,
        });
    } catch (error) {
        console.error('Get patient visits error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch visit history',
        });
    }
};

/**
 * Get a specific visit summary details
 * Access: Doctor who created it OR Patient who owns it
 */
const getVisitSummaryById = async (req, res) => {
    try {
        const { id } = req.params;
        const visit = await VisitSummary.findById(id)
            .populate('doctorId', 'name email')
            .populate('patientId', 'name email');

        if (!visit) {
            return res.status(404).json({
                success: false,
                message: 'Visit summary not found',
            });
        }

        // Access Check
        const isDoctor = req.user.role === 'doctor';
        const isOwnerDoctor = isDoctor && visit.doctorId._id.toString() === req.userId;
        const isOwnerPatient = !isDoctor && visit.patientId._id.toString() === req.userId;

        if (!isOwnerDoctor && !isOwnerPatient) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have permission to view this record.',
            });
        }

        res.status(200).json({
            success: true,
            data: visit,
        });
    } catch (error) {
        console.error('Get visit details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch visit details',
        });
    }
};

module.exports = {
    createVisitSummary,
    getDoctorPatients,
    getPatientVisits,
    getVisitSummaryById,
};
