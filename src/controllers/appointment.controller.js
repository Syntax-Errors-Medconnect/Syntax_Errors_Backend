const Appointment = require('../models/appointment.model');
const User = require('../models/user.model');
const { sendAppointmentAcceptedEmail } = require('../utils/email.service');

/**
 * @desc    Create a new appointment request
 * @route   POST /api/appointments
 * @access  Patient only
 */
const createAppointment = async (req, res) => {
    try {
        const { doctorId, requestedDate, requestedTime, message } = req.body;

        // Validation
        if (!doctorId || !requestedDate) {
            return res.status(400).json({
                success: false,
                message: 'Doctor ID and requested date are required',
            });
        }
        new Date().toISOString().split('T')[0]
        // Verify doctor exists
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found',
            });
        }

        // Check for existing pending appointment with same doctor
        const existingAppointment = await Appointment.findOne({
            patientId: req.userId,
            doctorId,
            status: 'pending',
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending appointment with this doctor',
            });
        }

        const appointment = await Appointment.create({
            patientId: req.userId,
            doctorId,
            requestedDate,
            requestedTime: requestedTime || '',
            message: message || '',
        });

        // Populate for response
        await appointment.populate('doctorId', 'name email');
        await appointment.populate('patientId', 'name email');

        res.status(201).json({
            success: true,
            message: 'Appointment request created successfully',
            data: {
                appointment: {
                    _id: appointment._id,
                    patientId: appointment.patientId._id,
                    patientName: appointment.patientId.name,
                    doctorId: appointment.doctorId._id,
                    doctorName: appointment.doctorId.name,
                    status: appointment.status,
                    requestedDate: appointment.requestedDate,
                    requestedTime: appointment.requestedTime,
                    message: appointment.message,
                    createdAt: appointment.createdAt,
                },
            },
        });
    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create appointment request',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all pending appointments for doctor
 * @route   GET /api/doctor/appointments
 * @access  Doctor only
 */
const getDoctorAppointments = async (req, res) => {
    try {
        const { status } = req.query;

        const query = { doctorId: req.userId };
        if (status) {
            query.status = status;
        }

        const appointments = await Appointment.find(query)
            .populate('patientId', 'name email')
            .populate('doctorId', 'name email')
            .sort({ createdAt: -1 });

        const formattedAppointments = appointments
            .filter((apt) => apt.doctorId && apt.patientId) // Filter out appointments with deleted users
            .map((apt) => ({
                _id: apt._id,
                patientId: apt.patientId._id,
                patientName: apt.patientId.name,
                patientEmail: apt.patientId.email,
                doctorId: apt.doctorId._id,
                doctorName: apt.doctorId.name,
                status: apt.status,
                requestedDate: apt.requestedDate,
                requestedTime: apt.requestedTime || '',
                message: apt.message,
                createdAt: apt.createdAt,
            }));

        // Count pending for badge
        const pendingCount = await Appointment.countDocuments({
            doctorId: req.userId,
            status: 'pending',
        });

        res.status(200).json({
            success: true,
            data: {
                appointments: formattedAppointments,
                total: formattedAppointments.length,
                pendingCount,
            },
        });
    } catch (error) {
        console.error('Get doctor appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
        });
    }
};

/**
 * @desc    Get patient's own appointments
 * @route   GET /api/patient/appointments
 * @access  Patient only
 */
const getPatientAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ patientId: req.userId })
            .populate('doctorId', 'name email')
            .populate('patientId', 'name email')
            .sort({ createdAt: -1 });

        const formattedAppointments = appointments
            .filter((apt) => apt.doctorId && apt.patientId) // Filter out appointments with deleted users
            .map((apt) => ({
                _id: apt._id,
                patientId: apt.patientId._id,
                patientName: apt.patientId.name,
                doctorId: apt.doctorId._id,
                doctorName: apt.doctorId.name,
                status: apt.status,
                requestedDate: apt.requestedDate,
                requestedTime: apt.requestedTime || '',
                message: apt.message,
                createdAt: apt.createdAt,
            }));

        res.status(200).json({
            success: true,
            data: {
                appointments: formattedAppointments,
                total: formattedAppointments.length,
            },
        });
    } catch (error) {
        console.error('Get patient appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
        });
    }
};


/**
 * @desc    Accept an appointment
 * @route   PUT /api/appointments/:id/accept
 * @access  Doctor only
 */
const acceptAppointment = async (req, res) => {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Verify this doctor owns the appointment
        if (appointment.doctorId.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This appointment is not for you.',
            });
        }

        // Check if already processed
        if (appointment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Appointment already ${appointment.status}`,
            });
        }

        // Update status to accepted
        appointment.status = 'accepted';
        await appointment.save();

        // Assign patient to this doctor
        await User.findByIdAndUpdate(appointment.patientId, {
            assignedDoctor: req.userId,
        });

        await appointment.populate('patientId', 'name email');
        await appointment.populate('doctorId', 'name email');

        // Send email notifications to both doctor and patient
        try {
            await sendAppointmentAcceptedEmail(
                appointment.doctorId.email,
                appointment.patientId.email,
                {
                    doctorName: appointment.doctorId.name,
                    patientName: appointment.patientId.name,
                    appointmentDate: appointment.requestedDate,
                    message: appointment.message,
                }
            );
            console.log('✅ Appointment confirmation emails sent successfully');
        } catch (emailError) {
            // Log error but don't fail the request
            console.error('⚠️  Failed to send appointment emails:', emailError.message);
            // Continue with the response - email failure shouldn't block appointment acceptance
        }

        res.status(200).json({
            success: true,
            message: 'Appointment accepted successfully',
            data: {
                appointment: {
                    _id: appointment._id,
                    patientId: appointment.patientId._id,
                    patientName: appointment.patientId.name,
                    doctorId: appointment.doctorId._id,
                    doctorName: appointment.doctorId.name,
                    status: appointment.status,
                    requestedDate: appointment.requestedDate,
                },
            },
        });
    } catch (error) {
        console.error('Accept appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept appointment',
        });
    }
};

/**
 * @desc    Reject an appointment
 * @route   PUT /api/appointments/:id/reject
 * @access  Doctor only
 */
const rejectAppointment = async (req, res) => {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Verify this doctor owns the appointment
        if (appointment.doctorId.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This appointment is not for you.',
            });
        }

        // Check if already processed
        if (appointment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Appointment already ${appointment.status}`,
            });
        }

        // Update status to rejected
        appointment.status = 'rejected';
        await appointment.save();

        res.status(200).json({
            success: true,
            message: 'Appointment rejected',
            data: {
                appointment: {
                    _id: appointment._id,
                    status: appointment.status,
                },
            },
        });
    } catch (error) {
        console.error('Reject appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject appointment',
        });
    }
};

/**
 * @desc    Get pending appointment count for doctor (for badge)
 * @route   GET /api/doctor/appointments/count
 * @access  Doctor only
 */
const getPendingCount = async (req, res) => {
    try {
        const count = await Appointment.countDocuments({
            doctorId: req.userId,
            status: 'pending',
        });

        res.status(200).json({
            success: true,
            data: { count },
        });
    } catch (error) {
        console.error('Get pending count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending count',
        });
    }
};

module.exports = {
    createAppointment,
    getDoctorAppointments,
    getPatientAppointments,
    acceptAppointment,
    rejectAppointment,
    getPendingCount,
};
