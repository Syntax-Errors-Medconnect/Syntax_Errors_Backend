const Groq = require('groq-sdk');
const ChatSession = require('../models/chatSession.model');
const ChatMessage = require('../models/chatMessage.model');
const VisitSummary = require('../models/visitSummary.model');
const Appointment = require('../models/appointment.model');
const User = require('../models/user.model');
const { extractMultiplePdfText } = require('../services/pdf.service');

// Initialize Groq
const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

/**
 * System prompt for PDF-based chat
 */
const SYSTEM_PROMPT = `You are a Clinical Report Assistant. Your task is to answer questions based ONLY on the provided medical report content.

STRICT RULES:
1. EXTRACTION ONLY: Only use information from the provided PDF text. Never use external medical knowledge.
2. NO MEDICAL ADVICE: If asked for diagnosis, treatment recommendations, or medical advice, respond: "I cannot provide medical advice. Please consult your healthcare provider."
3. MISSING INFO: If the information is not in the document, say: "This information is not in the provided report."
4. NO HALLUCINATION: Never invent or assume information not explicitly stated.
5. BE CONCISE: Give clear, direct answers. Cite relevant sections when possible.
6. PRIVACY: Do not reveal personal identification details unless specifically asked.`;

/**
 * @desc    Get available patients for chat (doctor only)
 * @route   GET /api/chat/patients
 * @access  Doctor only
 */
const getAvailablePatients = async (req, res) => {
    try {
        const doctorId = req.userId;

        // Get patients with visit history
        const visitedPatientIds = await VisitSummary.distinct('patientId', { doctorId });

        // Get patients with accepted appointments
        const appointmentPatientIds = await Appointment.distinct('patientId', {
            doctorId,
            status: 'accepted',
        });

        // Combine and deduplicate
        const allPatientIds = [...new Set([...visitedPatientIds.map(id => id.toString()), ...appointmentPatientIds.map(id => id.toString())])];

        // Fetch patient details
        const patients = await User.find({
            _id: { $in: allPatientIds },
            role: 'patient',
        }).select('name email');

        res.status(200).json({
            success: true,
            data: {
                patients: patients.map(p => ({
                    _id: p._id,
                    name: p.name,
                    email: p.email,
                })),
                total: patients.length,
            },
        });
    } catch (error) {
        console.error('Get available patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patients',
        });
    }
};

/**
 * @desc    Create a new chat session
 * @route   POST /api/chat/sessions
 * @access  Authenticated
 */
const createSession = async (req, res) => {
    try {
        const { patientId } = req.body;
        const userId = req.userId;
        const userRole = req.user.role;

        // For patients, they can only chat about their own reports
        let targetPatientId = patientId;
        if (userRole === 'patient') {
            targetPatientId = userId;
        }

        if (!targetPatientId) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required',
            });
        }

        // Verify patient exists
        const patient = await User.findById(targetPatientId);
        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({
                success: false,
                message: 'Patient not found',
            });
        }

        // For doctors, verify they have treated this patient or have accepted appointment
        if (userRole === 'doctor') {
            const hasVisits = await VisitSummary.exists({
                doctorId: userId,
                patientId: targetPatientId,
            });

            const hasAppointment = await Appointment.exists({
                doctorId: userId,
                patientId: targetPatientId,
                status: 'accepted',
            });

            if (!hasVisits && !hasAppointment) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only chat about patients you have treated or accepted appointments from',
                });
            }
        }

        // Create session
        const session = await ChatSession.create({
            userId,
            patientId: targetPatientId,
            title: `Chat about ${patient.name}'s reports`,
        });

        res.status(201).json({
            success: true,
            data: {
                session: {
                    _id: session._id,
                    patientId: session.patientId,
                    patientName: patient.name,
                    title: session.title,
                    createdAt: session.createdAt,
                },
            },
        });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create chat session',
            error: error.message,
        });
    }
};

/**
 * @desc    Get user's chat sessions
 * @route   GET /api/chat/sessions
 * @access  Authenticated
 */
const getSessions = async (req, res) => {
    try {
        const sessions = await ChatSession.find({ userId: req.userId })
            .populate('patientId', 'name email')
            .sort({ updatedAt: -1 });

        const formattedSessions = sessions.map(s => ({
            _id: s._id,
            patientId: s.patientId?._id,
            patientName: s.patientId?.name,
            title: s.title,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
        }));

        res.status(200).json({
            success: true,
            data: {
                sessions: formattedSessions,
                total: formattedSessions.length,
            },
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat sessions',
        });
    }
};

/**
 * @desc    Get messages for a session
 * @route   GET /api/chat/sessions/:sessionId/messages
 * @access  Authenticated
 */
const getMessages = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Verify session belongs to user
        const session = await ChatSession.findOne({
            _id: sessionId,
            userId: req.userId,
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        const messages = await ChatMessage.find({ sessionId })
            .sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            data: {
                messages: messages.map(m => ({
                    _id: m._id,
                    role: m.role,
                    content: m.content,
                    createdAt: m.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
        });
    }
};

/**
 * @desc    Send a message and get AI response
 * @route   POST /api/chat/sessions/:sessionId/messages
 * @access  Authenticated
 */
const sendMessage = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message is required',
            });
        }

        // Verify session belongs to user
        const session = await ChatSession.findOne({
            _id: sessionId,
            userId: req.userId,
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        // Save user message
        const userMessage = await ChatMessage.create({
            sessionId,
            role: 'user',
            content: message.trim(),
        });

        // Get patient's PDF reports
        const visits = await VisitSummary.find({
            patientId: session.patientId,
            pdfUrl: { $exists: true, $ne: null },
        }).select('pdfUrl visitDate summaryText');

        // Extract text from PDFs
        let pdfContext = '';
        const pdfUrls = visits.map(v => v.pdfUrl).filter(Boolean);

        if (pdfUrls.length > 0) {
            try {
                pdfContext = await extractMultiplePdfText(pdfUrls);
            } catch (err) {
                console.error('PDF extraction error:', err);
            }
        }

        // Also include visit summaries as context
        const summaryContext = visits.map(v =>
            `Visit Date: ${v.visitDate?.toISOString().split('T')[0] || 'Unknown'}\nSummary: ${v.summaryText || 'No summary'}`
        ).join('\n\n---\n\n');

        const fullContext = [pdfContext, summaryContext].filter(Boolean).join('\n\n===\n\n');

        // Get chat history for context
        const previousMessages = await ChatMessage.find({ sessionId })
            .sort({ createdAt: 1 })
            .limit(10);

        // Build messages for AI
        const aiMessages = [
            { role: 'system', content: `${SYSTEM_PROMPT}\n\nPATIENT REPORT CONTENT:\n${fullContext || 'No reports available for this patient.'}` },
            ...previousMessages.map(m => ({
                role: m.role,
                content: m.content,
            })),
        ];

        // Get AI response
        let aiResponse = 'I apologize, but the AI service is currently unavailable.';

        if (groq) {
            try {
                const completion = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: aiMessages,
                    temperature: 0.1,
                    max_tokens: 1000,
                });
                aiResponse = completion.choices[0].message.content;
            } catch (err) {
                console.error('Groq API error:', err);
                aiResponse = 'I apologize, but I encountered an error processing your request. Please try again.';
            }
        }

        // Save AI response
        const assistantMessage = await ChatMessage.create({
            sessionId,
            role: 'assistant',
            content: aiResponse,
        });

        // Update session title from first message if it's the default
        if (session.title === `Chat about ${session.patientId}'s reports` || session.title === 'New Chat') {
            session.title = message.trim().substring(0, 50) + (message.length > 50 ? '...' : '');
            await session.save();
        }

        res.status(200).json({
            success: true,
            data: {
                userMessage: {
                    _id: userMessage._id,
                    role: userMessage.role,
                    content: userMessage.content,
                    createdAt: userMessage.createdAt,
                },
                assistantMessage: {
                    _id: assistantMessage._id,
                    role: assistantMessage.role,
                    content: assistantMessage.content,
                    createdAt: assistantMessage.createdAt,
                },
            },
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message,
        });
    }
};

/**
 * @desc    Delete a chat session
 * @route   DELETE /api/chat/sessions/:sessionId
 * @access  Authenticated
 */
const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Verify session belongs to user
        const session = await ChatSession.findOne({
            _id: sessionId,
            userId: req.userId,
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        // Delete all messages in session
        await ChatMessage.deleteMany({ sessionId });

        // Delete session
        await ChatSession.findByIdAndDelete(sessionId);

        res.status(200).json({
            success: true,
            message: 'Chat session deleted successfully',
        });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete session',
        });
    }
};

module.exports = {
    getAvailablePatients,
    createSession,
    getSessions,
    getMessages,
    sendMessage,
    deleteSession,
};
