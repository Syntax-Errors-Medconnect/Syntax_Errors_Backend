const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Patient ID is required'],
        },
        title: {
            type: String,
            default: 'New Chat',
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster retrieval
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ patientId: 1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

module.exports = ChatSession;
