const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const config = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const oauthRoutes = require('./routes/oauth.routes');
const visitRoutes = require('./routes/visit.routes');
const aiRoutes = require('./routes/ai.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const passport = require('./config/passport');
const { errorHandler, notFound } = require('./middleware/error.middleware');
const connectDB = require('./config/db');

const app = express();

// CORS configuration
app.use(
    cors({
        origin: true,
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

// ====================================
// API ROUTES
// ====================================

// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);

// Clinical Visit Summary routes (matches spec exactly)
// POST /api/visit-summary - Create visit (doctor only)
// GET /api/doctor/patients - List patients (doctor only)
// GET /api/patient/visits - List own visits (patient only)
// GET /api/visit-summary/:id - Get specific visit
app.use('/api', visitRoutes);

// AI routes
// POST /api/ai/retrieve-summary - AI retrieval (doctor only)
app.use('/api/ai', aiRoutes);

// Appointment routes
// POST /api/appointments - Create appointment (patient)
// GET /api/appointments/doctor - Doctor's appointments
// GET /api/appointments/patient - Patient's appointments
// PUT /api/appointments/:id/accept - Accept appointment (doctor)
// PUT /api/appointments/:id/reject - Reject appointment (doctor)
app.use('/api/appointments', appointmentRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

connectDB();

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}
        Port: ${config.port}
        Health: http://localhost:${config.port}/health
        API Base: http://localhost:${config.port}/api`);
});
