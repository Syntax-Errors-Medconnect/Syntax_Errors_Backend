const mongoose = require('mongoose');

const videoCallSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            required: [true, 'Appointment ID is required'],
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Doctor ID is required'],
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Patient ID is required'],
        },
        channelName: {
            type: String,
            required: [true, 'Channel name is required'],
            unique: true,
        },
        status: {
            type: String,
            enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
            default: 'scheduled',
        },
        startTime: {
            type: Date,
            default: null,
        },
        endTime: {
            type: Date,
            default: null,
        },
        duration: {
            type: Number, // in seconds
            default: 0,
        },
        recordingUrl: {
            type: String,
            default: null,
        },
        transcriptionUrl: {
            type: String,
            default: null,
        },
        // Agora-specific fields for recording
        agoraResourceId: {
            type: String,
            default: null,
        },
        agoraSid: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster retrieval
videoCallSchema.index({ appointmentId: 1 });
videoCallSchema.index({ doctorId: 1, createdAt: -1 });
videoCallSchema.index({ patientId: 1, createdAt: -1 });
videoCallSchema.index({ channelName: 1 });

const VideoCall = mongoose.model('VideoCall', videoCallSchema);

module.exports = VideoCall;
