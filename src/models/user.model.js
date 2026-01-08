const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ],
        },
        password: {
            type: String,
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Don't include password in queries by default
            required: function () {
                // Password is required only for local auth
                return this.authProvider === 'local';
            },
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true, // Allows multiple null values
        },
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },
        profilePicture: {
            type: String,
        },
        role: {
            type: String,
            enum: ['doctor', 'patient', 'admin'],
            default: 'patient',
            required: true
        },
        specialization: {
            type: String,
            trim: true,
            default: null, // Only for doctors - e.g., 'Cardiology', 'Dermatology', etc.
        },
        assignedDoctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null, // Patients can assign themselves to a doctor
        },
        medicalHistory: [
            {
                eventId: {
                    type: String,
                    required: true,
                },
                condition: {
                    name: {
                        type: String,
                        required: [true, 'Condition name is required'],
                    },
                    type: {
                        type: String,
                        enum: ['Injury', 'Illness', 'Chronic', 'Allergy', 'Surgery', 'Other'],
                        required: true,
                    },
                    severity: {
                        type: String,
                        enum: ['Mild', 'Moderate', 'Severe', 'Critical'],
                        default: 'Moderate',
                    },
                    description: String,
                },
                diagnosedOn: {
                    type: Date,
                    required: [true, 'Diagnosis date is required'],
                },
                diagnosedBy: {
                    doctorId: String,
                    doctorName: String,
                    hospital: String,
                },
                affectedBodyPart: String,
                treatments: [
                    {
                        treatmentId: String,
                        type: {
                            type: String,
                            enum: ['Medication', 'Procedure', 'Therapy', 'Surgery', 'Other'],
                        },
                        details: mongoose.Schema.Types.Mixed,
                        startedOn: Date,
                        endedOn: Date,
                    },
                ],
                followUps: [
                    {
                        date: Date,
                        notes: String,
                        nextVisit: Date,
                    },
                ],
                status: {
                    type: String,
                    enum: ['Active', 'Recovered', 'Recovering', 'Monitoring'],
                    default: 'Active',
                },
                documents: [
                    {
                        type: {
                            type: String,
                            enum: ['X-Ray', 'MRI', 'CT Scan', 'Lab Report', 'Prescription', 'Other'],
                        },
                        url: String,
                    },
                ],
            },
        ],
        refreshTokens: [
            {
                token: {
                    type: String,
                    required: true,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                    expires: 60 * 60 * 24 * 7, // Auto-delete after 7 days (TTL index)
                },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
        toJSON: {
            transform: function (doc, ret) {
                delete ret.password;
                delete ret.refreshTokens;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Index for faster queries
userSchema.index({ email: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Generate salt with 12 rounds (industry standard)
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to add refresh token
userSchema.methods.addRefreshToken = function (token) {
    // Limit to 5 active refresh tokens per user (multi-device support)
    if (this.refreshTokens.length >= 5) {
        this.refreshTokens.shift(); // Remove oldest
    }
    this.refreshTokens.push({ token });
    return this.save();
};

// Instance method to remove refresh token
userSchema.methods.removeRefreshToken = function (token) {
    this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
    return this.save();
};

// Instance method to clear all refresh tokens (logout from all devices)
userSchema.methods.clearAllRefreshTokens = function () {
    this.refreshTokens = [];
    return this.save();
};

// Static method to find user by email with password
userSchema.statics.findByEmailWithPassword = function (email) {
    return this.findOne({ email }).select('+password');
};

const User = mongoose.model('User', userSchema);

module.exports = User;
