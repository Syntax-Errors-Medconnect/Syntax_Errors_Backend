const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { retrieveSummary } = require('../controllers/ai.controller');

// All routes require authentication
router.use(authenticate);

// Only doctors can use AI retrieval tools
router.post(
    '/retrieve-summary',
    authorize('doctor'),
    retrieveSummary
);

module.exports = router;
