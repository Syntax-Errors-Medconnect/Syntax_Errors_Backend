const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const config = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const oauthRoutes = require('./routes/oauth.routes');
const passport = require('./config/passport');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();

// CORS configuration
app.use(
    cors({
        origin: config.frontendUrl,
        credentials: true, // Allow cookies
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Body parser middleware
app.use(express.json({ limit: '10kb' })); // Limit body size for security
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser middleware
app.use(cookieParser());

// Session middleware (required for Passport)
app.use(
    session({
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: config.isProduction,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (config.isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
    });
});

// API routes
app.use('/api/auth', authRoutes);
const visitRoutes = require('./routes/visit.routes');
const aiRoutes = require('./routes/ai.routes');

// ... (other imports)

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api', visitRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
