const User = require('../models/user.model');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt.utils');
const config = require('../config/env');

/**
 * Cookie options for tokens
 */
const getAccessCookieOptions = () => ({
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
});

const getRefreshCookieOptions = () => ({
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
});

/**
 * Set authentication cookies
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, getAccessCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
};

/**
 * Clear authentication cookies
 */
const clearAuthCookies = (res) => {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password',
                code: 'MISSING_FIELDS',
            });
        }

        // Validate role
        if (!role || !['doctor', 'patient'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid role (doctor or patient)',
                code: 'INVALID_ROLE',
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
                code: 'USER_EXISTS',
            });
        }

        // Create new user with role
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role,
        });

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair(user);

        // Store refresh token in database
        await user.addRefreshToken(refreshToken);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set cookies
        setAuthCookies(res, accessToken, refreshToken);

        // Send response
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: user.toJSON(),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
                code: 'MISSING_FIELDS',
            });
        }

        // Find user with password
        const user = await User.findByEmailWithPassword(email.toLowerCase());
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS',
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated',
                code: 'ACCOUNT_DEACTIVATED',
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS',
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair(user);

        // Store refresh token in database
        await user.addRefreshToken(refreshToken);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set cookies
        setAuthCookies(res, accessToken, refreshToken);

        // Send response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toJSON(),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        // Remove refresh token from database if it exists
        if (refreshToken && req.user) {
            await req.user.removeRefreshToken(refreshToken);
        }

        // Clear cookies
        clearAuthCookies(res);

        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public (requires refresh token cookie)
 */
const refreshTokenHandler = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token not found',
                code: 'NO_REFRESH_TOKEN',
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (error) {
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN',
            });
        }

        // Find user and verify refresh token exists in database
        const user = await User.findById(decoded.userId);
        if (!user) {
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
            });
        }

        // Check if refresh token exists in user's tokens
        const tokenExists = user.refreshTokens.some((rt) => rt.token === refreshToken);
        if (!tokenExists) {
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: 'Refresh token revoked',
                code: 'TOKEN_REVOKED',
            });
        }

        // Check if account is active
        if (!user.isActive) {
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated',
                code: 'ACCOUNT_DEACTIVATED',
            });
        }

        // Remove old refresh token
        await user.removeRefreshToken(refreshToken);

        // Generate new token pair (token rotation)
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            generateTokenPair(user);

        // Store new refresh token
        await user.addRefreshToken(newRefreshToken);

        // Set new cookies
        setAuthCookies(res, newAccessToken, newRefreshToken);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                user: req.user.toJSON(),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Logout from all devices
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
const logoutAll = async (req, res, next) => {
    try {
        // Clear all refresh tokens from database
        await req.user.clearAllRefreshTokens();

        // Clear cookies
        clearAuthCookies(res);

        res.status(200).json({
            success: true,
            message: 'Logged out from all devices',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    refreshToken: refreshTokenHandler,
    getMe,
    logoutAll,
};
