const User = require('../models/user.model');
const { v4: uuidv4 } = require('uuid');

const getMedicalHistory = async (req, res) => {
    try {
        const { patientId } = req.query;
        const userId = req.userId;
        const userRole = req.user.role;

        let targetUserId = userId;

        if (userRole === 'doctor' && patientId) {
            const patient = await User.findById(patientId);
            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: 'Patient not found',
                });
            }

            if (!patient.assignedDoctor || patient.assignedDoctor.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This patient is not assigned to you.',
                });
            }

            targetUserId = patientId;
        } else if (userRole === 'patient' && patientId && patientId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own medical history.',
            });
        }

        const user = await User.findById(targetUserId).select('medicalHistory name email');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.status(200).json({
            success: true,
            data: {
                patientId: user._id,
                patientName: user.name,
                medicalHistory: user.medicalHistory || [],
                total: user.medicalHistory?.length || 0,
            },
        });
    } catch (error) {
        console.error('Get medical history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medical history',
            error: error.message,
        });
    }
};

const addMedicalHistoryEvent = async (req, res) => {
    try {
        const { patientId, condition, diagnosedOn, diagnosedBy, affectedBodyPart, treatments, followUps, status, documents } = req.body;
        const userId = req.userId;
        const userRole = req.user.role;

        console.log(req.body);

        if (!condition || !diagnosedOn) {
            return res.status(400).json({
                success: false,
                message: 'Condition and diagnosis date are required',
            });
        }

        let targetPatientId = userId;

        if (userRole === 'doctor') {
            if (!patientId) {
                return res.status(400).json({
                    success: false,
                    message: 'Patient ID is required for doctors',
                });
            }

            const patient = await User.findById(patientId);
            if (!patient || patient.role !== 'patient') {
                return res.status(404).json({
                    success: false,
                    message: 'Patient not found',
                });
            }

            if (!patient.assignedDoctor || patient.assignedDoctor.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This patient is not assigned to you.',
                });
            }

            targetPatientId = patientId;
        } else if (userRole === 'patient') {
            if (patientId && patientId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only add to your own medical history.',
                });
            }
            targetPatientId = userId;
        }

        const patient = await User.findById(targetPatientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found',
            });
        }

        const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newEvent = {
            eventId,
            condition,
            diagnosedOn,
            diagnosedBy: diagnosedBy || (userRole === 'doctor' ? {
                doctorId: req.userId,
                doctorName: req.user.name,
            } : undefined),
            affectedBodyPart,
            treatments: treatments || [],
            followUps: followUps || [],
            status: status || 'Active',
            documents: documents || [],
        };

        console.log('New medical history event:', newEvent);

        patient.medicalHistory.push(newEvent);
        await patient.save();

        res.status(201).json({
            success: true,
            message: 'Medical history event added successfully',
            data: {
                event: newEvent,
            },
        });
    } catch (error) {
        console.error('Add medical history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add medical history event',
            error: error.message,
        });
    }
};

const updateMedicalHistoryEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { patientId, condition, diagnosedOn, diagnosedBy, affectedBodyPart, treatments, followUps, status, documents } = req.body;
        const userId = req.userId;
        const userRole = req.user.role;

        let targetPatientId = userId;

        if (userRole === 'doctor') {
            if (!patientId) {
                return res.status(400).json({
                    success: false,
                    message: 'Patient ID is required for doctors',
                });
            }

            const patient = await User.findById(patientId);
            if (!patient || patient.role !== 'patient') {
                return res.status(404).json({
                    success: false,
                    message: 'Patient not found',
                });
            }

            if (!patient.assignedDoctor || patient.assignedDoctor.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This patient is not assigned to you.',
                });
            }

            targetPatientId = patientId;
        } else if (userRole === 'patient') {
            if (patientId && patientId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only update your own medical history.',
                });
            }
            targetPatientId = userId;
        }

        const patient = await User.findById(targetPatientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found',
            });
        }

        const eventIndex = patient.medicalHistory.findIndex((event) => event.eventId === eventId);

        if (eventIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Medical history event not found',
            });
        }

        const existingEvent = patient.medicalHistory[eventIndex];
        patient.medicalHistory[eventIndex] = {
            ...existingEvent.toObject(),
            ...(condition && { condition }),
            ...(diagnosedOn && { diagnosedOn }),
            ...(diagnosedBy && { diagnosedBy }),
            ...(affectedBodyPart !== undefined && { affectedBodyPart }),
            ...(treatments && { treatments }),
            ...(followUps && { followUps }),
            ...(status && { status }),
            ...(documents && { documents }),
        };

        await patient.save();

        res.status(200).json({
            success: true,
            message: 'Medical history event updated successfully',
            data: {
                event: patient.medicalHistory[eventIndex],
            },
        });
    } catch (error) {
        console.error('Update medical history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update medical history event',
            error: error.message,
        });
    }
};

const deleteMedicalHistoryEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { patientId } = req.body;
        const userId = req.userId;
        const userRole = req.user.role;

        let targetPatientId = userId;

        if (userRole === 'doctor') {
            if (!patientId) {
                return res.status(400).json({
                    success: false,
                    message: 'Patient ID is required for doctors',
                });
            }

            const patient = await User.findById(patientId);
            if (!patient || patient.role !== 'patient') {
                return res.status(404).json({
                    success: false,
                    message: 'Patient not found',
                });
            }

            if (!patient.assignedDoctor || patient.assignedDoctor.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This patient is not assigned to you.',
                });
            }

            targetPatientId = patientId;
        } else if (userRole === 'patient') {
            if (patientId && patientId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only delete your own medical history.',
                });
            }
            targetPatientId = userId;
        }

        const patient = await User.findById(targetPatientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found',
            });
        }

        const eventIndex = patient.medicalHistory.findIndex((event) => event.eventId === eventId);

        if (eventIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Medical history event not found',
            });
        }

        patient.medicalHistory.splice(eventIndex, 1);
        await patient.save();

        res.status(200).json({
            success: true,
            message: 'Medical history event deleted successfully',
        });
    } catch (error) {
        console.error('Delete medical history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete medical history event',
            error: error.message,
        });
    }
};

const getMedicalHistoryEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { patientId } = req.query;
        const userId = req.userId;
        const userRole = req.user.role;

        let targetUserId = userId;

        if (userRole === 'doctor' && patientId) {
            const patient = await User.findById(patientId);
            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: 'Patient not found',
                });
            }

            if (!patient.assignedDoctor || patient.assignedDoctor.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This patient is not assigned to you.',
                });
            }

            targetUserId = patientId;
        }

        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const event = user.medicalHistory.find((e) => e.eventId === eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Medical history event not found',
            });
        }

        res.status(200).json({
            success: true,
            data: {
                event,
            },
        });
    } catch (error) {
        console.error('Get medical history event error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medical history event',
            error: error.message,
        });
    }
};

module.exports = {
    getMedicalHistory,
    addMedicalHistoryEvent,
    updateMedicalHistoryEvent,
    deleteMedicalHistoryEvent,
    getMedicalHistoryEvent,
};
