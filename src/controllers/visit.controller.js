const VisitSummary = require('../models/visitSummary.model');
const User = require('../models/user.model');

/**
 * @desc    Create a new visit summary
 * @route   POST /api/visit-summary
 * @access  Doctor only
 */
const createVisitSummary = async (req, res) => {
    try {
        const { patientId, visitDate, summaryText } = req.body;

        // Validation
        if (!patientId || !summaryText) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and summary text are required',
            });
        }

        // Verify patient exists
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found',
            });
        }

        // Verify target user is a patient
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

        // Populate for response
        await visitSummary.populate('patientId', 'name email');
        await visitSummary.populate('doctorId', 'name email');

        res.status(201).json({
            success: true,
            message: 'Visit summary created successfully',
            data: {
                visit: {
                    _id: visitSummary._id,
                    patientId: visitSummary.patientId._id,
                    patientName: visitSummary.patientId.name,
                    doctorId: visitSummary.doctorId._id,
                    doctorName: visitSummary.doctorId.name,
                    visitDate: visitSummary.visitDate,
                    summary: visitSummary.summaryText,
                    createdAt: visitSummary.createdAt,
                    updatedAt: visitSummary.updatedAt,
                },
            },
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
 * @desc    Get patients assigned to this doctor
 * @route   GET /api/doctor/patients
 * @access  Doctor only
 */
const getDoctorPatients = async (req, res) => {
    try {
        // Get patients assigned to this doctor
        const patients = await User.find({
            role: 'patient',
            assignedDoctor: req.userId,
        }).select('name email');

        // Get visit counts for each patient (from this doctor)
        const patientsWithVisitInfo = await Promise.all(
            patients.map(async (patient) => {
                const visits = await VisitSummary.find({
                    patientId: patient._id,
                    doctorId: req.userId,
                }).sort({ visitDate: -1 });

                return {
                    _id: patient._id,
                    name: patient.name,
                    email: patient.email,
                    totalVisits: visits.length,
                    lastVisit: visits.length > 0 ? visits[0].visitDate : null,
                };
            })
        );

        res.status(200).json({
            success: true,
            data: {
                patients: patientsWithVisitInfo,
                total: patientsWithVisitInfo.length,
            },
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
 * @desc    Get patient's own visit summaries
 * @route   GET /api/patient/visits
 * @access  Patient only
 */
const getPatientVisits = async (req, res) => {
    try {
        const visits = await VisitSummary.find({ patientId: req.userId })
            .populate('doctorId', 'name email')
            .populate('patientId', 'name email')
            .sort({ visitDate: -1 });

        const formattedVisits = visits.map((visit) => ({
            _id: visit._id,
            patientId: visit.patientId._id,
            patientName: visit.patientId.name,
            doctorId: visit.doctorId._id,
            doctorName: visit.doctorId.name,
            visitDate: visit.visitDate,
            summary: visit.summaryText,
            createdAt: visit.createdAt,
            updatedAt: visit.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: {
                visits: formattedVisits,
                total: formattedVisits.length,
            },
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
 * @desc    Get a specific visit summary by ID
 * @route   GET /api/visit-summary/:id
 * @access  Doctor who created it OR Patient who owns it
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

        // Access Check: Doctor who created OR patient who owns
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
            data: {
                visit: {
                    _id: visit._id,
                    patientId: visit.patientId._id,
                    patientName: visit.patientId.name,
                    doctorId: visit.doctorId._id,
                    doctorName: visit.doctorId.name,
                    visitDate: visit.visitDate,
                    summary: visit.summaryText,
                    createdAt: visit.createdAt,
                    updatedAt: visit.updatedAt,
                },
            },
        });
    } catch (error) {
        console.error('Get visit details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch visit details',
        });
    }
};

/**
 * @desc    Get all visit summaries created by the doctor
 * @route   GET /api/doctor/visits
 * @access  Doctor only
 */
const getDoctorVisits = async (req, res) => {
    try {
        const visits = await VisitSummary.find({ doctorId: req.userId })
            .populate('patientId', 'name email')
            .populate('doctorId', 'name email')
            .sort({ visitDate: -1 });

        const formattedVisits = visits.map((visit) => ({
            _id: visit._id,
            patientId: visit.patientId._id,
            patientName: visit.patientId.name,
            doctorId: visit.doctorId._id,
            doctorName: visit.doctorId.name,
            visitDate: visit.visitDate,
            summary: visit.summaryText,
            createdAt: visit.createdAt,
            updatedAt: visit.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: {
                visits: formattedVisits,
                total: formattedVisits.length,
            },
        });
    } catch (error) {
        console.error('Get doctor visits error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch visit summaries',
        });
    }
};

/**
 * @desc    Get all doctors in the system
 * @route   GET /api/doctors
 * @access  Patient only
 */
const getDoctors = async (req, res) => {
    try {
        const doctors = await User.find({ role: 'doctor' })
            .select('name email profilePicture');

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
                    profilePicture: doctor.profilePicture,
                    patientCount,
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
        console.error('Get doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctors',
        });
    }
};

/**
 * @desc    Assign patient to a doctor (schedule appointment)
 * @route   POST /api/patient/assign-doctor
 * @access  Patient only
 */
const assignDoctor = async (req, res) => {
    try {
        const { doctorId } = req.body;

        if (!doctorId) {
            return res.status(400).json({
                success: false,
                message: 'Doctor ID is required',
            });
        }

        // Verify doctor exists
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found',
            });
        }

        // Assign doctor to patient
        const patient = await User.findByIdAndUpdate(
            req.userId,
            { assignedDoctor: doctorId },
            { new: true }
        ).populate('assignedDoctor', 'name email');

        res.status(200).json({
            success: true,
            message: 'Successfully scheduled with doctor',
            data: {
                doctor: {
                    _id: patient.assignedDoctor._id,
                    name: patient.assignedDoctor.name,
                    email: patient.assignedDoctor.email,
                },
            },
        });
    } catch (error) {
        console.error('Assign doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign doctor',
        });
    }
};

module.exports = {
    createVisitSummary,
    getDoctorPatients,
    getPatientVisits,
    getVisitSummaryById,
    getDoctorVisits,
    getDoctors,
    assignDoctor,
};
