const VideoCall = require('../models/videoCall.model');
const Appointment = require('../models/appointment.model');
const { generateAgoraToken, generateChannelName } = require('../services/agora.service');

/**
 * @desc    Generate Agora token for video call
 * @route   POST /api/video-calls/generate-token
 * @access  Doctor or Patient (authenticated)
 */
const generateToken = async (req, res) => {
    try {
        const { appointmentId } = req.body;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                message: 'Appointment ID is required',
            });
        }

        // Verify appointment exists and user is part of it
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Check if user is doctor or patient in this appointment
        const isDoctor = appointment.doctorId.toString() === req.userId;
        const isPatient = appointment.patientId.toString() === req.userId;

        if (!isDoctor && !isPatient) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not part of this appointment.',
            });
        }

        // Check if appointment is accepted
        if (appointment.status !== 'accepted') {
            return res.status(400).json({
                success: false,
                message: 'Appointment must be accepted before starting a video call',
            });
        }

        // Find or create video call session
        let videoCall = await VideoCall.findOne({ appointmentId });

        if (!videoCall) {
            const channelName = generateChannelName(appointmentId);
            videoCall = await VideoCall.create({
                appointmentId,
                doctorId: appointment.doctorId,
                patientId: appointment.patientId,
                channelName,
                status: 'scheduled',
            });
        }

        // Generate token for this user (use 0 for auto-generated UID)
        const token = generateAgoraToken(videoCall.channelName, 0);

        res.status(200).json({
            success: true,
            data: {
                token,
                channelName: videoCall.channelName,
                appId: process.env.AGORA_APP_ID,
                uid: 0, // Let Agora auto-generate unique UID
                videoCallId: videoCall._id,
            },
        });
    } catch (error) {
        console.error('Generate token error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate video call token',
        });
    }
};

/**
 * @desc    Start video call (update status to ongoing)
 * @route   POST /api/video-calls/start
 * @access  Doctor or Patient
 */
const startCall = async (req, res) => {
    try {
        const { videoCallId } = req.body;

        const videoCall = await VideoCall.findById(videoCallId);
        if (!videoCall) {
            return res.status(404).json({
                success: false,
                message: 'Video call not found',
            });
        }

        // Verify user is part of the call
        const isDoctor = videoCall.doctorId.toString() === req.userId;
        const isPatient = videoCall.patientId.toString() === req.userId;

        if (!isDoctor && !isPatient) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }

        // Update status to ongoing if not already
        if (videoCall.status === 'scheduled') {
            videoCall.status = 'ongoing';
            videoCall.startTime = new Date();
            await videoCall.save();
        }

        res.status(200).json({
            success: true,
            message: 'Video call started',
            data: { videoCall },
        });
    } catch (error) {
        console.error('Start call error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start video call',
        });
    }
};

/**
 * @desc    End video call
 * @route   PUT /api/video-calls/:id/end
 * @access  Doctor or Patient
 */
const endCall = async (req, res) => {
    try {
        const { id } = req.params;

        const videoCall = await VideoCall.findById(id);
        if (!videoCall) {
            return res.status(404).json({
                success: false,
                message: 'Video call not found',
            });
        }

        // Verify user is part of the call
        const isDoctor = videoCall.doctorId.toString() === req.userId;
        const isPatient = videoCall.patientId.toString() === req.userId;

        if (!isDoctor && !isPatient) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }

        // Update status to completed
        videoCall.status = 'completed';
        videoCall.endTime = new Date();

        // Calculate duration if start time exists
        if (videoCall.startTime) {
            const durationMs = videoCall.endTime - videoCall.startTime;
            videoCall.duration = Math.floor(durationMs / 1000); // Convert to seconds
        }

        await videoCall.save();

        res.status(200).json({
            success: true,
            message: 'Video call ended',
            data: {
                videoCall: {
                    _id: videoCall._id,
                    status: videoCall.status,
                    duration: videoCall.duration,
                    startTime: videoCall.startTime,
                    endTime: videoCall.endTime,
                },
            },
        });
    } catch (error) {
        console.error('End call error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end video call',
        });
    }
};

/**
 * @desc    Get video call by appointment ID
 * @route   GET /api/video-calls/appointment/:appointmentId
 * @access  Doctor or Patient
 */
const getCallByAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const videoCall = await VideoCall.findOne({ appointmentId })
            .populate('doctorId', 'name email')
            .populate('patientId', 'name email');

        if (!videoCall) {
            return res.status(404).json({
                success: false,
                message: 'No video call found for this appointment',
            });
        }

        // Verify user is part of the call
        const isDoctor = videoCall.doctorId._id.toString() === req.userId;
        const isPatient = videoCall.patientId._id.toString() === req.userId;

        if (!isDoctor && !isPatient) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }

        res.status(200).json({
            success: true,
            data: { videoCall },
        });
    } catch (error) {
        console.error('Get call by appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch video call',
        });
    }
};

/**
 * @desc    Get user's video call history
 * @route   GET /api/video-calls/history
 * @access  Doctor or Patient
 */
const getCallHistory = async (req, res) => {
    try {
        const query = {
            $or: [{ doctorId: req.userId }, { patientId: req.userId }],
        };

        const videoCalls = await VideoCall.find(query)
            .populate('doctorId', 'name email')
            .populate('patientId', 'name email')
            .populate('appointmentId', 'requestedDate message')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            data: {
                videoCalls,
                total: videoCalls.length,
            },
        });
    } catch (error) {
        console.error('Get call history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch call history',
        });
    }
};

module.exports = {
    generateToken,
    startCall,
    endCall,
    getCallByAppointment,
    getCallHistory,
};
