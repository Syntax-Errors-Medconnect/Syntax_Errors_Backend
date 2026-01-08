const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { googleCallback, oauthFailure } = require('../controllers/oauth.controller');

/**
 * @route   GET /api/oauth/google
 * @desc    Initiate Google OAuth with role selection
 * @access  Public
 * @query   role - 'doctor' or 'patient' (required)
 */
router.get('/google', (req, res, next) => {
    const { role } = req.query;

    // Validate role
    if (!role || !['doctor', 'patient'].includes(role)) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?error=role_required`);
    }

    // Pass role through OAuth state parameter
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: role, // Pass role as state
    })(req, res, next);
});

/**
 * @route   GET /api/oauth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/api/oauth/failure',
        session: false, // We're using JWT, not sessions
    }),
    googleCallback
);

/**
 * @route   GET /api/oauth/failure
 * @desc    OAuth failure redirect
 * @access  Public
 */
router.get('/failure', oauthFailure);

module.exports = router;
