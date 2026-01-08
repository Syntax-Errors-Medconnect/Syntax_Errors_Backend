# MedConnect Backend API

A production-ready healthcare management backend built with Node.js, Express, and MongoDB. This RESTful API powers a comprehensive medical appointment system with features including authentication, video consultations, AI-powered clinical summaries, and real-time chat.

## 🚀 Features

### Core Functionality
- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Google OAuth 2.0 integration
  - Role-based access control (Admin, Doctor, Patient)
  - Secure password hashing with bcrypt

- **User Management**
  - Multi-role user system (Admin, Doctor, Patient)
  - Admin dashboard for doctor management
  - Profile management with specializations

- **Appointment System**
  - Patient-initiated appointment booking
  - Doctor appointment acceptance/rejection
  - Email notifications for appointment updates
  - Status tracking (pending, accepted, rejected, completed)

- **Video Consultations**
  - Agora RTC integration for video calls
  - Dynamic token generation for secure calls
  - Call history and duration tracking
  - Appointment-linked video sessions

- **Clinical Visit Summaries**
  - Doctor-created visit summaries
  - Patient medical history tracking
  - Structured clinical data storage
  - Visit timeline per patient

- **AI-Powered Features**
  - GROQ AI integration for intelligent summaries
  - Clinical data retrieval and analysis
  - Natural language processing for medical records

- **Real-time Chat**
  - Session-based messaging system
  - Doctor-patient communication
  - Message history and persistence
  - Session management

## 📋 Prerequisites

- **Node.js** >= 14.0.0
- **MongoDB** >= 4.4
- **npm** or **yarn**
- **Gmail account** (for email notifications)
- **Agora account** (for video calls)
- **GROQ API key** (for AI features)
- **Google OAuth credentials** (for OAuth login)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd b2b-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory. Copy the contents from `.env.example`:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration values. See [Environment Variables](#-environment-variables) section for details.

### 4. Start the server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## 🔐 Environment Variables

### Server Configuration
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `5000` |

### Database Configuration
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/medconnect_db` |

### JWT Configuration
| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_ACCESS_SECRET` | Secret for access tokens (min 32 chars) | `your_secure_access_secret_key` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars) | `your_secure_refresh_secret_key` |
| `JWT_ACCESS_EXPIRY` | Access token expiration | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiration | `7d` |

### Frontend Configuration
| Variable | Description | Example |
|----------|-------------|---------|
| `FRONTEND_URL` | Frontend application URL for CORS | `http://localhost:3000` |
| `COOKIE_DOMAIN` | Cookie domain | `localhost` |

### Google OAuth Configuration
| Variable | Description | How to Get |
|----------|-------------|------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | `http://localhost:5000/api/oauth/google/callback` |

### GROQ AI Configuration
| Variable | Description | How to Get |
|----------|-------------|------------|
| `GROQ_API_KEY` | GROQ AI API key | [GROQ Console](https://console.groq.com/) |

### Email Configuration (Gmail SMTP)
| Variable | Description | Example |
|----------|-------------|---------|
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_SECURE` | Use TLS | `false` |
| `EMAIL_USER` | Gmail address | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | Gmail app password | Get from Gmail settings |
| `EMAIL_FROM_NAME` | Sender name | `MedConnect` |
| `EMAIL_FROM_ADDRESS` | Sender email | `your-email@gmail.com` |

**Note:** For Gmail, you need to generate an [App Password](https://support.google.com/accounts/answer/185833).

### Agora Video Configuration
| Variable | Description | How to Get |
|----------|-------------|------------|
| `AGORA_APP_ID` | Agora application ID | [Agora Console](https://console.agora.io/) |
| `AGORA_APP_CERTIFICATE` | Agora app certificate | Agora Console |

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "patient"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Google OAuth
```http
GET /api/oauth/google
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

### Appointment Endpoints

#### Create Appointment (Patient)
```http
POST /api/appointments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "doctorId": "doctor_id",
  "date": "2024-01-15",
  "time": "10:00",
  "reason": "Regular checkup"
}
```

#### Get Doctor's Appointments
```http
GET /api/appointments/doctor
Authorization: Bearer <access_token>
```

#### Accept Appointment (Doctor)
```http
PUT /api/appointments/:id/accept
Authorization: Bearer <access_token>
```

### Visit Summary Endpoints

#### Create Visit Summary (Doctor)
```http
POST /api/visit-summary
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "patientId": "patient_id",
  "symptoms": "Fever, headache",
  "diagnosis": "Common cold",
  "prescriptions": ["Rest", "Hydration"],
  "notes": "Follow up in 1 week"
}
```

#### Get Patient's Visits
```http
GET /api/patient/visits
Authorization: Bearer <access_token>
```

### Video Call Endpoints

#### Generate Token
```http
POST /api/video-calls/generate-token
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "channelName": "appointment_123",
  "role": "publisher"
}
```

### Chat Endpoints

#### Create Chat Session
```http
POST /api/chat/sessions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "participantId": "user_id"
}
```

#### Send Message
```http
POST /api/chat/sessions/:sessionId/messages
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": "Hello, Doctor!"
}
```

### Admin Endpoints

#### Create Doctor (Admin Only)
```http
POST /api/admin/doctors
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Dr. Smith",
  "email": "dr.smith@example.com",
  "password": "securePassword123",
  "specialization": "Cardiology"
}
```

## 🗂️ Project Structure

```
b2b-backend/
├── src/
│   ├── app.js                 # Application entry point
│   ├── config/                # Configuration files
│   │   ├── db.js              # MongoDB connection
│   │   ├── env.js             # Environment variables
│   │   └── passport.js        # Passport OAuth configuration
│   ├── controllers/           # Request handlers
│   │   ├── auth.controller.js
│   │   ├── appointment.controller.js
│   │   ├── visit.controller.js
│   │   ├── chat.controller.js
│   │   └── ...
│   ├── models/                # Mongoose schemas
│   │   ├── user.model.js
│   │   ├── appointment.model.js
│   │   ├── visitSummary.model.js
│   │   ├── chatSession.model.js
│   │   └── ...
│   ├── routes/                # API routes
│   │   ├── auth.routes.js
│   │   ├── appointment.routes.js
│   │   ├── visit.routes.js
│   │   └── ...
│   ├── middleware/            # Custom middleware
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── services/              # Business logic
│   └── utils/                 # Helper functions
├── .env                       # Environment variables (git-ignored)
├── .env.example              # Environment template
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **HTTP-only Cookies**: Prevent XSS attacks
- **CORS Protection**: Configured allowed origins
- **Rate Limiting**: Request throttling (recommended for production)
- **Input Validation**: Request data sanitization
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.

## 🚀 Deployment

### Production Checklist

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Use strong, unique secrets for JWT
   - Configure production MongoDB URI
   - Update `FRONTEND_URL` to production domain
   - Set secure cookie domain

2. **Database**
   - Use MongoDB Atlas or hosted MongoDB
   - Enable authentication
   - Set up backups
   - Create indexes for performance

3. **Security**
   - Enable HTTPS
   - Set secure cookie flags
   - Implement rate limiting
   - Configure CORS for production domains
   - Use environment-specific secrets

4. **Monitoring**
   - Set up logging (Winston, Morgan)
   - Monitor server health
   - Track API usage
   - Set up error tracking (Sentry)

### Deployment Platforms

- **Heroku**: Add `Procfile` with `web: node src/app.js`
- **Railway**: Auto-detects Node.js apps
- **DigitalOcean**: Use App Platform or Droplets
- **AWS**: EC2, Elastic Beanstalk, or Lambda
- **Render**: Direct deployment from Git

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Health check
curl http://localhost:5000/health
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check `MONGODB_URI` is correct
- Verify network connectivity
- Check MongoDB credentials

### OAuth Not Working
- Verify Google credentials
- Check callback URL matches Google Console
- Ensure `FRONTEND_URL` is correct

### Email Not Sending
- Use Gmail App Password (not regular password)
- Enable "Less secure app access" if needed
- Check SMTP settings

### Video Calls Failing
- Verify Agora credentials
- Check App ID and Certificate
- Ensure token generation is working

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For questions or issues, please open an issue in the repository or contact the development team.

---

**Built with ❤️ for modern healthcare**
