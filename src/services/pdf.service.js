const axios = require('axios');
const pdfParse = require('pdf-parse');

/**
 * Fetch PDF from Cloudinary URL and extract text content
 * @param {string} pdfUrl - Cloudinary PDF URL
 * @returns {Promise<string>} - Extracted text from PDF
 */
const extractPdfText = async (pdfUrl) => {
    try {
        if (!pdfUrl) {
            return '';
        }

        // Fetch PDF as buffer
        const response = await axios.get(pdfUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
        });

        // Parse PDF and extract text
        const pdfData = await pdfParse(Buffer.from(response.data));

        return pdfData.text || '';
    } catch (error) {
        console.error('PDF extraction error:', error.message);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
};

/**
 * Extract text from multiple PDF URLs
 * @param {string[]} pdfUrls - Array of Cloudinary PDF URLs
 * @returns {Promise<string>} - Combined extracted text
 */
const extractMultiplePdfText = async (pdfUrls) => {
    const validUrls = pdfUrls.filter(url => url && url.trim());

    if (validUrls.length === 0) {
        return '';
    }

    const results = await Promise.allSettled(
        validUrls.map(url => extractPdfText(url))
    );

    const texts = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(text => text.trim());

    return texts.join('\n\n---\n\n');
};

module.exports = {
    extractPdfText,
    extractMultiplePdfText,
};
