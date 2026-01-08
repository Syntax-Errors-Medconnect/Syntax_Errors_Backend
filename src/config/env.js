require('dotenv').config();

module.exports = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_db',
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
        forgotPasswordSecret: process.env.JWT_FORGOT_PASSWORD_SECRET,
        forgotPasswordExpiry: process.env.JWT_FORGOT_PASSWORD_EXPIRY || '1h',
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/oauth/google/callback',
    },
    sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    isProduction: process.env.NODE_ENV === 'production',
};
