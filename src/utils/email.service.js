const nodemailer = require("nodemailer");

// Set up Brevo as the transport for Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

/**
 * Email service for sending appointment notifications
 */

/**
 * Generate HTML email template for doctor
 */
const getDoctorEmailTemplate = (appointmentDetails) => {
    const { patientName, appointmentDate, message } = appointmentDetails;
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .appointment-card {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .detail-row {
            margin: 10px 0;
        }
        .label {
            font-weight: 600;
            color: #667eea;
            display: inline-block;
            width: 120px;
        }
        .value {
            color: #333;
        }
        .message-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🩺 New Appointment Confirmed</h1>
        </div>
        <div class="content">
            <p>Dear Doctor,</p>
            <p>You have successfully accepted an appointment request. Here are the details:</p>
            
            <div class="appointment-card">
                <div class="detail-row">
                    <span class="label">Patient Name:</span>
                    <span class="value">${patientName}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Appointment Date:</span>
                    <span class="value">${formattedDate}</span>
                </div>
            </div>

            ${message ? `
            <div class="message-box">
                <strong>Patient's Message:</strong>
                <p style="margin: 10px 0 0 0;">${message}</p>
            </div>
            ` : ''}

            <p>Please ensure you're available at the scheduled time. You can now create visit summaries for this patient.</p>
            
            <p style="margin-top: 30px;">
                <strong>Next Steps:</strong>
            </p>
            <ul>
                <li>Review patient's medical history if available</li>
                <li>Prepare necessary documentation</li>
                <li>Create visit summary after the appointment</li>
            </ul>
        </div>
        <div class="footer">
            <p>This is an automated message from Clinical Visit Management System</p>
            <p>Please do not reply to this email</p>
        </div>
    </div>
</body>
</html>
    `;
};

/**
 * Generate HTML email template for patient
 */
const getPatientEmailTemplate = (appointmentDetails) => {
    const { doctorName, appointmentDate, message } = appointmentDetails;
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .success-badge {
            background: #d1fae5;
            color: #065f46;
            padding: 10px 20px;
            border-radius: 20px;
            display: inline-block;
            margin: 10px 0;
            font-weight: 600;
        }
        .appointment-card {
            background: #f8f9fa;
            border-left: 4px solid #10b981;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .detail-row {
            margin: 10px 0;
        }
        .label {
            font-weight: 600;
            color: #10b981;
            display: inline-block;
            width: 120px;
        }
        .value {
            color: #333;
        }
        .info-box {
            background: #e0f2fe;
            border-left: 4px solid #0284c7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Appointment Confirmed!</h1>
        </div>
        <div class="content">
            <div style="text-align: center;">
                <span class="success-badge">Your appointment has been accepted</span>
            </div>
            
            <p>Dear Patient,</p>
            <p>Great news! Your appointment request has been accepted by the doctor.</p>
            
            <div class="appointment-card">
                <div class="detail-row">
                    <span class="label">Doctor Name:</span>
                    <span class="value">Dr. ${doctorName}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Appointment Date:</span>
                    <span class="value">${formattedDate}</span>
                </div>
            </div>

            ${message ? `
            <div class="info-box">
                <strong>Your Message to Doctor:</strong>
                <p style="margin: 10px 0 0 0;">${message}</p>
            </div>
            ` : ''}

            <p style="margin-top: 30px;">
                <strong>Important Reminders:</strong>
            </p>
            <ul>
                <li>Please arrive 10 minutes before your scheduled time</li>
                <li>Bring any relevant medical documents or test results</li>
                <li>Prepare a list of questions or concerns you'd like to discuss</li>
                <li>If you need to reschedule, please contact us as soon as possible</li>
            </ul>

            <p>You can view your appointment details and visit history by logging into your account.</p>
        </div>
        <div class="footer">
            <p>This is an automated message from Clinical Visit Management System</p>
            <p>Please do not reply to this email</p>
        </div>
    </div>
</body>
</html>
    `;
};

/**
 * Generate HTML email template for doctor account creation
 */
const getDoctorAccountCreationEmailTemplate = (doctorEmail, tempPassword) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .welcome-badge {
            background: #ddd6fe;
            color: #5b21b6;
            padding: 10px 20px;
            border-radius: 20px;
            display: inline-block;
            margin: 10px 0;
            font-weight: 600;
        }
        .credentials-card {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .credential-row {
            margin: 15px 0;
        }
        .label {
            font-weight: 600;
            color: #667eea;
            display: block;
            margin-bottom: 5px;
        }
        .value {
            background: #ffffff;
            padding: 10px;
            border: 1px solid #e5e7eb;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #1f2937;
            word-break: break-all;
        }
        .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .warning-box strong {
            color: #92400e;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
        .steps-list {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .steps-list li {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to Clinical Visit Management System</h1>
        </div>
        <div class="content">
            <div style="text-align: center;">
                <span class="welcome-badge">Your Doctor Account Has Been Created</span>
            </div>
            
            <p>Dear Doctor,</p>
            <p>Welcome aboard! Your account has been successfully created by the system administrator. You can now access the Clinical Visit Management System to manage patient appointments, create visit summaries, and provide quality healthcare services.</p>
            
            <div class="credentials-card">
                <h3 style="margin-top: 0; color: #667eea;">Your Login Credentials</h3>
                <div class="credential-row">
                    <span class="label">Email Address:</span>
                    <div class="value">${doctorEmail}</div>
                </div>
                <div class="credential-row">
                    <span class="label">Temporary Password:</span>
                    <div class="value">${tempPassword}</div>
                </div>
            </div>

            <div class="warning-box">
                <strong>🔐 Security Notice:</strong>
                <p style="margin: 10px 0 0 0;">This is a temporary password. For security reasons, please change it immediately after your first login.</p>
            </div>

            <div class="steps-list">
                <strong>Getting Started - Next Steps:</strong>
                <ol>
                    <li><strong>Login:</strong> Use the credentials above to access your account</li>
                    <li><strong>Change Password:</strong> Navigate to your profile settings and update your password</li>
                    <li><strong>Complete Profile:</strong> Add your professional details and profile picture</li>
                    <li><strong>Review Dashboard:</strong> Familiarize yourself with the appointment management features</li>
                    <li><strong>Accept Appointments:</strong> Start accepting patient appointment requests</li>
                </ol>
            </div>

            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Login to Your Account</a>
            </div>

            <p style="margin-top: 30px;">
                <strong>What You Can Do:</strong>
            </p>
            <ul>
                <li>Accept and manage patient appointments</li>
                <li>Create and view clinical visit summaries</li>
                <li>Access patient medical histories (for assigned patients)</li>
                <li>Use AI-powered tools to retrieve information from patient records</li>
            </ul>

            <p>If you have any questions or need assistance, please contact the system administrator.</p>
        </div>
        <div class="footer">
            <p>This is an automated message from Clinical Visit Management System</p>
            <p>Please do not reply to this email</p>
            <p style="margin-top: 10px; color: #9ca3af;">Keep your credentials secure and do not share them with anyone</p>
        </div>
    </div>
</body>
</html>
    `;
};

/**
 * Send appointment accepted notification to both doctor and patient
 * @param {string} doctorEmail - Doctor's email address
 * @param {string} patientEmail - Patient's email address
 * @param {object} appointmentDetails - Appointment details
 * @returns {Promise<object>} - Email sending results
 */
const sendAppointmentAcceptedEmail = async (doctorEmail, patientEmail, appointmentDetails) => {
    // If transporter is not configured, log to console
    if (!transporter) {
        console.log('📧 Email would be sent (not configured):');
        console.log(`   To Doctor: ${doctorEmail}`);
        console.log(`   To Patient: ${patientEmail}`);
        console.log(`   Appointment: ${appointmentDetails.patientName} with Dr. ${appointmentDetails.doctorName}`);
        return {
            success: false,
            message: 'Email not configured',
        };
    }

    const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'Clinical Visit System';

    try {
        // Send email to doctor
        const mailOptions = {
            from: process.env.DEFAULT_FROM_EMAIL,
            to: doctorEmail,
            subject: `New Appointment Confirmed - ${appointmentDetails.patientName}`,
            html: getDoctorEmailTemplate(appointmentDetails),
        };
        
        const doctorEmailResult = await transporter.sendMail(mailOptions);

        console.log('✅ Email sent to doctor:', doctorEmail);

        // Send email to patient
        const patientEmail = {
            from: process.env.DEFAULT_FROM_EMAIL,
            to: patientEmail,
            subject: `Appointment Confirmed with Dr. ${appointmentDetails.doctorName}`,
            html: getPatientEmailTemplate(appointmentDetails),
        };

        const patientEmailResult = await transporter.sendMail(patientEmail);

        console.log('✅ Email sent to patient:', patientEmail);

        return {
            success: true,
            doctorEmailId: doctorEmailResult.messageId,
            patientEmailId: patientEmailResult.messageId,
        };
    } catch (error) {
        console.error('❌ Failed to send appointment emails:', error.message);
        throw error;
    }
};

const sendCreateDoctorAccountEmail = async (doctorEmail, tempPassword) => {
    // If transporter is not configured, log to console
    if (!transporter) {
        console.log('📧 Email would be sent (not configured):')
        console.log(`   To Doctor: ${doctorEmail}`)
        return {
            success: false,
            message: 'Email not configured',
        };
    }

    try {
        const mailOptions = {
            from: process.env.DEFAULT_FROM_EMAIL,
            to: doctorEmail,
            subject: 'Your Doctor Account Has Been Created - Login Credentials',
            html: getDoctorAccountCreationEmailTemplate(doctorEmail, tempPassword),
        };

        const doctorEmailResult = await transporter.sendMail(mailOptions);

        console.log('✅ Email sent to doctor:', doctorEmail);

        return {
            success: true,
            emailId: doctorEmailResult.messageId,
        };
    } catch (error) {
        console.error('❌ Failed to send doctor account creation email:', error.message);
        throw error;
    }
};

module.exports = {
    sendAppointmentAcceptedEmail,
    sendCreateDoctorAccountEmail,
};
