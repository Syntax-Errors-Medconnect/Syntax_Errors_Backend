const mongoose = require('mongoose');

const visitSummarySchema = new mongoose.Schema(
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
        patientName: {
            type: String,
            required: [true, 'Patient name is required'],
        },
        visitDate: {
            type: Date,
            required: [true, 'Visit date is required'],
            default: Date.now,
        },
        visitTime: {
            type: String,
            default: '',
        },
        reason: {
            type: String,
            required: [true, 'Reason for visit is required'],
            minlength: [5, 'Reason must be at least 5 characters'],
        },
        diagnosis: {
            type: String,
            default: '',
        },
        solution: {
            type: String,
            required: [true, 'Solution/treatment is required'],
            minlength: [5, 'Solution must be at least 5 characters'],
        },
        medicinePrescribed: {
            type: String,
            default: '',
        },
        fullSummary: {
            type: String,
            required: [true, 'Full summary is required'],
            minlength: [10, 'Summary must be at least 10 characters'],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster retrieval
visitSummarySchema.index({ patientId: 1, visitDate: -1 });
visitSummarySchema.index({ doctorId: 1 });

const VisitSummary = mongoose.model('VisitSummary', visitSummarySchema);

module.exports = VisitSummary;
