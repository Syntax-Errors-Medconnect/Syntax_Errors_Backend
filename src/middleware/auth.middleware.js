const { verifyAccessToken, forgotPasswordToken } = require('../utils/jwt.utils');
const User = require('../models/user.model');

/**
 * Authentication middleware
 * Verifies JWT access token from HTTP-only cookie
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from cookie
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
                code: 'NO_TOKEN2',
            });
        }

        // Verify token
        const decoded = verifyAccessToken(accessToken);

        // Get user from database (without password)
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found.',
                code: 'USER_NOT_FOUND',
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is deactivated.',
                code: 'ACCOUNT_DEACTIVATED',
            });
        }

        // Attach user to request object
        req.user = user;
        req.userId = decoded.userId;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Access token expired.',
                code: 'TOKEN_EXPIRED',
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token.',
                code: 'INVALID_TOKEN',
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.',
            code: 'AUTH_ERROR',
        });
    }
};

/**
 * Optional authentication middleware
 * If token is present and valid, attaches user to request
 * If token is missing or invalid, continues without error
 */
const optionalAuth = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (accessToken) {
            const decoded = verifyAccessToken(accessToken);
            const user = await User.findById(decoded.userId);

            if (user && user.isActive) {
                req.user = user;
                req.userId = decoded.userId;
            }
        }

        next();
    } catch (error) {
        // Continue even if token is invalid
        next();
    }
};

const authenticateForgotPassword = async (req, res, next) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
                code: 'NO_TOKEN1',
            });
        }

        const decoded = forgotPasswordToken(token);

        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found.',
                code: 'USER_NOT_FOUND',
            });
        }
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is deactivated.',
                code: 'ACCOUNT_DEACTIVATED',
            });
        }

        req.user = user;
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.',
            code: 'AUTH_ERROR',
        });
    }
};

module.exports = {
    authenticate,
    optionalAuth,
    authenticateForgotPassword,
};
