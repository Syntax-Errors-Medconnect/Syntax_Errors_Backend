const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
    getAvailablePatients,
    createSession,
    getSessions,
    getMessages,
    sendMessage,
    deleteSession,
} = require('../controllers/chat.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/chat/patients
 * @desc    Get available patients for chat (doctor only)
 * @access  Doctor only
 */
router.get('/patients', (req, res, next) => {
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ success: false, message: 'Access denied. Doctors only.' });
    }
    next();
}, getAvailablePatients);

/**
 * @route   POST /api/chat/sessions
 * @desc    Create a new chat session
 * @access  Authenticated
 */
router.post('/sessions', createSession);

/**
 * @route   GET /api/chat/sessions
 * @desc    Get user's chat sessions
 * @access  Authenticated
 */
router.get('/sessions', getSessions);

/**
 * @route   GET /api/chat/sessions/:sessionId/messages
 * @desc    Get messages for a session
 * @access  Authenticated
 */
router.get('/sessions/:sessionId/messages', getMessages);

/**
 * @route   POST /api/chat/sessions/:sessionId/messages
 * @desc    Send a message and get AI response
 * @access  Authenticated
 */
router.post('/sessions/:sessionId/messages', sendMessage);

/**
 * @route   DELETE /api/chat/sessions/:sessionId
 * @desc    Delete a chat session
 * @access  Authenticated
 */
router.delete('/sessions/:sessionId', deleteSession);

module.exports = router;
