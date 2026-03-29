/**
 * Hospital socket handlers for hospital operations
 * Handles hospital registration and patient notifications
 */

import logger from '../../config/logger.js';

/**
 * Sets up all hospital-related socket event handlers
 * @param {Object} socket - Individual socket connection
 * @param {Object} io - Socket.IO server instance
 * @param {Map} hospitalSockets - Map of hospital connections
 * @returns {Function} Setup function
 */
export const setupHospitalSocketHandlers = (socket, io, hospitalSockets) => {
    // Hospital registration
    socket.on('register_hospital', handleHospitalRegistration(socket, hospitalSockets));

    // Hospital notifications (from patients)
    socket.on('notify_hospital', handleHospitalNotification(socket, io, hospitalSockets));
};

/**
 * Handles hospital registration for receiving patient alerts
 * @param {Object} socket - Socket connection
 * @param {Map} hospitalSockets - Map of hospital connections
 * @returns {Function} Event handler function
 */
const handleHospitalRegistration = (socket, hospitalSockets) => {
    return async ({ hospitalId }) => {
        const hid = String(hospitalId);
        hospitalSockets.set(hid, socket.id);
        socket.hospitalId = hid;
        logger.info(`[HospitalSocket] Hospital registered: ${hid} → ${socket.id}`);
        socket.emit('hospital_registered', { status: 'live' });
    };
};

/**
 * Handles hospital pre-alert notifications for incoming patients
 * @param {Object} socket - Socket connection
 * @param {Object} io - Socket.IO server instance
 * @param {Map} hospitalSockets - Map of hospital connections
 * @returns {Function} Event handler function
 */
const handleHospitalNotification = (socket, io, hospitalSockets) => {
    return ({ hospitalId, alertData }) => {
        const hid = String(hospitalId);
        logger.info(`[HospitalSocket] Notifying hospital ${hid} of incoming patient`);

        const hospitalSocketId = hospitalSockets.get(hid);
        if (hospitalSocketId) {
            io.to(hospitalSocketId).emit('INCOMING_PATIENT', {
                ...alertData,
                timestamp: new Date().toISOString(),
                status: 'incoming'
            });
            socket.emit('hospital_notified', { success: true });
            logger.info(`[HospitalSocket] Hospital ${hid} notified successfully`);
        } else {
            socket.emit('hospital_notified', {
                success: false,
                reason: 'Hospital portal not online'
            });
            logger.warn(`[HospitalSocket] Hospital ${hid} not connected`);
        }
    };
};