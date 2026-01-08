const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

/**
 * Generate Agora RTC token for video call
 * @param {string} channelName - Unique channel name for the call
 * @param {string|number} uid - User ID (0 for auto-assignment)
 * @param {string} role - 'publisher' or 'subscriber'
 * @returns {string} Agora token
 */
const generateAgoraToken = (channelName, uid = 0, role = 'publisher') => {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
        throw new Error('Agora credentials not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in environment variables.');
    }

    // Token expiration time (1 hour from now)
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Determine role
    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Build token
    const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        agoraRole,
        privilegeExpiredTs
    );

    return token;
};

/**
 * Generate unique channel name for video call
 * @param {string} appointmentId - Appointment ID
 * @returns {string} Unique channel name
 */
const generateChannelName = (appointmentId) => {
    const timestamp = Date.now();
    return `call_${appointmentId}_${timestamp}`;
};

module.exports = {
    generateAgoraToken,
    generateChannelName,
};
