const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatSession',
            required: [true, 'Session ID is required'],
        },
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: [true, 'Role is required'],
        },
        content: {
            type: String,
            required: [true, 'Content is required'],
            maxlength: [10000, 'Message cannot exceed 10000 characters'],
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster message retrieval by session
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
