const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Patient ID is required'],
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Doctor ID is required'],
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
        },
        requestedDate: {
            type: Date,
            required: [true, 'Requested date is required'],
        },
        message: {
            type: String,
            maxlength: [500, 'Message cannot exceed 500 characters'],
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster retrieval
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ requestedDate: -1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
