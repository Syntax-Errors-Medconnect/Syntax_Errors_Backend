const Groq = require('groq-sdk');
const VisitSummary = require('../models/visitSummary.model');
const User = require('../models/user.model');

// Initialize Groq only if key exists
const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

/**
 * Retrieve specific information from patient records using AI
 * Input: patientId, query
 */
const retrieveSummary = async (req, res) => {
    try {
        const { patientId, query } = req.body;

        if (!patientId || !query) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and query are required',
            });
        }

        // 1. Verify access (Only doctors can use this tool)
        // Note: Middleware already checks 'doctor' role, but we must ensure 
        // the doctor is querying a valid patient.
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found',
            });
        }

        // 2. Fetch all visit summaries for this patient
        const visits = await VisitSummary.find({ patientId }).sort({ visitDate: -1 });

        if (visits.length === 0) {
            return res.status(200).json({
                success: true,
                answer: "Not mentioned in the records (No visit history found).",
            });
        }

        // 3. Prepare Context for LLM
        // Format: "Date: YYYY-MM-DD\nSummary: ...\n\n"
        const contextText = visits.map(v =>
            `Date: ${v.visitDate.toISOString().split('T')[0]}\nSummary: ${v.summaryText}`
        ).join('\n\n---\n\n');

        // 4. Call AI (or Mock if no key)
        if (!groq) {
            console.warn('GROQ_API_KEY not found. Returning mock response.');
            return res.status(200).json({
                success: true,
                answer: "AI Service Unavailable (Missing API Key). However, here is the raw data matching your query: [Mock Extraction]",
                debug_note: "Configure GROQ_API_KEY in .env to enable real extraction."
            });
        }

        const systemPrompt = `
You are a specialized Clinical Retrieval Assistant. Your task is to extract information strictly from the provided patient visit records.

RULES:
1. Retrieval Only: Extract logic based *only* on the provided context. Do not use external medical knowledge.
2. No Diagnosis/Advice: If the query asks for medical advice, diagnosis, prognosis, or treatment recommendations, output exactly: "I cannot provide medical advice or diagnosis. Please use your professional judgment."
3. Missing Info: If the information is not present in the records, output exactly: "Not mentioned in the records."
4. No Hallucination: Do not invent facts.
5. Format: Provide a concise extracted summary. Cite the visit date if relevant.

CONTEXT:
${contextText}
        `;

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Fast and capable Groq model
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Query: ${query}` }
            ],
            temperature: 0, // Deterministic for retrieval
        });

        const answer = completion.choices[0].message.content;

        res.status(200).json({
            success: true,
            answer: answer,
        });

    } catch (error) {
        console.error('AI Retrieval error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process AI retrieval request',
            error: error.message
        });
    }
};

module.exports = { retrieveSummary };
