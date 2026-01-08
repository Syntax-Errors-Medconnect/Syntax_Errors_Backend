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
        visitDate: {
            type: Date,
            required: [true, 'Visit date is required'],
            default: Date.now,
        },
        summaryText: {
            type: String,
            required: [true, 'Summary text is required'],
            minlength: [10, 'Summary must be at least 10 characters'],
        },
        pdfUrl: {
            type: String,
            default: null,
            validate: {
                validator: function (v) {
                    return !v || v.startsWith('https://res.cloudinary.com') || v.startsWith('https://cloudinary.com');
                },
                message: 'PDF must be hosted on Cloudinary'
            }
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
