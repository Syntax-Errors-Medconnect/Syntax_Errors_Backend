const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate an access token for a user
 * @param {Object} payload - User data to encode (usually { userId, email })
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpiry,
        issuer: 'auth-api',
        audience: 'auth-client',
    });
};

/**
 * Generate a refresh token for a user
 * @param {Object} payload - User data to encode (usually { userId })
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiry,
        issuer: 'auth-api',
        audience: 'auth-client',
    });
};

const generateForgotPasswordToken = (payload) => {
    return jwt.sign(payload, config.jwt.forgotPasswordSecret, {
        expiresIn: config.jwt.forgotPasswordExpiry,
        issuer: 'auth-api',
        audience: 'auth-client'
    });
}

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokenPair = (user) => {
    const accessToken = generateAccessToken({
        userId: user._id,
        email: user.email,
    });

    const refreshToken = generateRefreshToken({
        userId: user._id,
    });

    return { accessToken, refreshToken };
};

/**
 * Verify an access token
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
    return jwt.verify(token, config.jwt.accessSecret, {
        issuer: 'auth-api',
        audience: 'auth-client',
    });
};

/**
 * Verify a refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
    return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'auth-api',
        audience: 'auth-client',
    });
};

const forgotPasswordToken = (token) => {
    return jwt.verify(token, config.jwt.forgotPasswordSecret, {
        issuer: 'auth-api',
        audience: 'auth-client',
    });
}

/**
 * Decode a token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null if invalid
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    generateForgotPasswordToken,
    forgotPasswordToken,
};
