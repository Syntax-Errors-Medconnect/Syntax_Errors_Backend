const nodemailer = require('nodemailer');
const config = require('./env');

/**
 * Email transporter configuration
 * Uses Gmail SMTP by default
 */
const createTransporter = () => {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('⚠️  Email not configured. Emails will be logged to console only.');
        return null;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        // Verify connection configuration
        transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Email configuration error:', error.message);
            } else {
                console.log('✅ Email server is ready to send messages');
            }
        });

        return transporter;
    } catch (error) {
        console.error('❌ Failed to create email transporter:', error.message);
        return null;
    }
};

const transporter = createTransporter();

module.exports = transporter;
