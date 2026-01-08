const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
    generateToken,
    startCall,
    endCall,
    getCallByAppointment,
    getCallHistory,
} = require('../controllers/videoCall.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/video-calls/generate-token
 * @desc    Generate Agora token for video call
 * @access  Doctor or Patient (must be part of appointment)
 */
router.post('/generate-token', generateToken);

/**
 * @route   POST /api/video-calls/start
 * @desc    Start video call (update status to ongoing)
 * @access  Doctor or Patient
 */
router.post('/start', startCall);

/**
 * @route   PUT /api/video-calls/:id/end
 * @desc    End video call
 * @access  Doctor or Patient
 */
router.put('/:id/end', endCall);

/**
 * @route   GET /api/video-calls/appointment/:appointmentId
 * @desc    Get video call by appointment ID
 * @access  Doctor or Patient
 */
router.get('/appointment/:appointmentId', getCallByAppointment);

/**
 * @route   GET /api/video-calls/history
 * @desc    Get user's video call history
 * @access  Doctor or Patient
 */
router.get('/history', getCallHistory);

module.exports = router;
