const VisitSummary = require('../models/visitSummary.model');
const User = require('../models/user.model');

/**
 * @desc    Create a new patient report
 * @route   POST /api/visit-summary
 * @access  Doctor only
 */
const createVisitSummary = async (req, res) => {
    try {
        const {
            patientId,
            patientName,
            visitDate,
            visitTime,
            reason,
            diagnosis,
            solution,
            medicinePrescribed,
            fullSummary
        } = req.body;

        // Validation
        if (!patientId || !patientName || !reason || !solution || !fullSummary) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID, patient name, reason, solution, and full summary are required',
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
            patientName,
            visitDate: visitDate || Date.now(),
            visitTime: visitTime || '',
            reason,
            diagnosis: diagnosis || '',
            solution,
            medicinePrescribed: medicinePrescribed || '',
            fullSummary,
        });

        // Populate for response
        await visitSummary.populate('patientId', 'name email');
        await visitSummary.populate('doctorId', 'name email');

        res.status(201).json({
            success: true,
            message: 'Patient report created successfully',
            data: {
                visit: {
                    _id: visitSummary._id,
                    patientId: visitSummary.patientId._id,
                    patientName: visitSummary.patientName,
                    doctorId: visitSummary.doctorId._id,
                    doctorName: visitSummary.doctorId.name,
                    visitDate: visitSummary.visitDate,
                    visitTime: visitSummary.visitTime,
                    reason: visitSummary.reason,
                    diagnosis: visitSummary.diagnosis,
                    solution: visitSummary.solution,
                    medicinePrescribed: visitSummary.medicinePrescribed,
                    fullSummary: visitSummary.fullSummary,
                    createdAt: visitSummary.createdAt,
                    updatedAt: visitSummary.updatedAt,
                },
            },
        });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create patient report',
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
        const doctorId = req.userId;

        // Get patients from visits
        const visitedPatientIds = await VisitSummary.distinct('patientId', { doctorId });

        // Get patients from accepted appointments
        const Appointment = require('../models/appointment.model');
        const appointmentPatientIds = await Appointment.distinct('patientId', {
            doctorId,
            status: 'accepted',
        });

        // Get patients with assignedDoctor
        const assignedPatients = await User.find({
            role: 'patient',
            assignedDoctor: doctorId,
        }).select('_id');
        const assignedPatientIds = assignedPatients.map(p => p._id.toString());

        // Combine and deduplicate all patient IDs
        const allPatientIds = [...new Set([
            ...visitedPatientIds.map(id => id.toString()),
            ...appointmentPatientIds.map(id => id.toString()),
            ...assignedPatientIds,
        ])];

        // Fetch patient details
        const patients = await User.find({
            _id: { $in: allPatientIds },
            role: 'patient',
        }).select('name email');

        // Get visit counts for each patient (from this doctor)
        const patientsWithVisitInfo = await Promise.all(
            patients.map(async (patient) => {
                const visits = await VisitSummary.find({
                    patientId: patient._id,
                    doctorId: doctorId,
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
            patientName: visit.patientName,
            doctorId: visit.doctorId._id,
            doctorName: visit.doctorId.name,
            visitDate: visit.visitDate,
            visitTime: visit.visitTime,
            reason: visit.reason,
            diagnosis: visit.diagnosis,
            solution: visit.solution,
            medicinePrescribed: visit.medicinePrescribed,
            fullSummary: visit.fullSummary,
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
                message: 'Report not found',
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
                    patientName: visit.patientName,
                    doctorId: visit.doctorId._id,
                    doctorName: visit.doctorId.name,
                    visitDate: visit.visitDate,
                    visitTime: visit.visitTime,
                    reason: visit.reason,
                    diagnosis: visit.diagnosis,
                    solution: visit.solution,
                    medicinePrescribed: visit.medicinePrescribed,
                    fullSummary: visit.fullSummary,
                    createdAt: visit.createdAt,
                    updatedAt: visit.updatedAt,
                },
            },
        });
    } catch (error) {
        console.error('Get visit details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report details',
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
            patientName: visit.patientName,
            doctorId: visit.doctorId._id,
            doctorName: visit.doctorId.name,
            visitDate: visit.visitDate,
            visitTime: visit.visitTime,
            reason: visit.reason,
            diagnosis: visit.diagnosis,
            solution: visit.solution,
            medicinePrescribed: visit.medicinePrescribed,
            fullSummary: visit.fullSummary,
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
            message: 'Failed to fetch reports',
        });
    }
};

/**
 * @desc    Get visits for a specific patient (doctor only)
 * @route   GET /api/doctor/patients/:patientId/visits
 * @access  Doctor only
 */
const getPatientVisitsById = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Verify patient exists
        const patient = await User.findById(patientId);
        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({
                success: false,
                message: 'Patient not found',
            });
        }

        // Check if doctor has access to this patient (assigned, has visits, or has accepted appointment)
        const isAssigned = patient.assignedDoctor && patient.assignedDoctor.toString() === req.userId;
        const hasVisits = await VisitSummary.exists({ patientId, doctorId: req.userId });
        const Appointment = require('../models/appointment.model');
        const hasAppointment = await Appointment.exists({ patientId, doctorId: req.userId, status: 'accepted' });

        if (!isAssigned && !hasVisits && !hasAppointment) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have access to this patient.',
            });
        }

        const visits = await VisitSummary.find({
            patientId: patientId,
            doctorId: req.userId,
        })
            .populate('patientId', 'name email')
            .populate('doctorId', 'name email')
            .sort({ visitDate: -1 });

        const formattedVisits = visits.map((visit) => ({
            _id: visit._id,
            patientId: visit.patientId._id,
            patientName: visit.patientName,
            doctorId: visit.doctorId._id,
            doctorName: visit.doctorId.name,
            visitDate: visit.visitDate,
            visitTime: visit.visitTime,
            reason: visit.reason,
            diagnosis: visit.diagnosis,
            solution: visit.solution,
            medicinePrescribed: visit.medicinePrescribed,
            fullSummary: visit.fullSummary,
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
        console.error('Get patient visits by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient reports',
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
        console.log('Fetching doctors for patient:', req.userId);
        const doctors = await User.find({ role: 'doctor' })
            .select('name email profilePicture specialization');

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
                    specialization: doctor.specialization,
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
    getPatientVisitsById,
    getVisitSummaryById,
    getDoctorVisits,
    getDoctors,
    assignDoctor,
};
