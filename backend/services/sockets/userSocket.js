/**
 * User socket handlers for patient operations
 * Handles user registration and tracking updates
 */

import logger from '../../config/logger.js';

/**
 * Sets up all user-related socket event handlers
 * @param {Object} socket - Individual socket connection
 * @param {Map} userSockets - Map of user connections
 * @returns {Function} Setup function
 */
export const setupUserSocketHandlers = (socket, userSockets) => {
    // User registration for live tracking updates
    socket.on('register_user', handleUserRegistration(socket, userSockets));
};

/**
 * Handles user registration for live tracking updates
 * @param {Object} socket - Socket connection
 * @param {Map} userSockets - Map of user connections
 * @returns {Function} Event handler function
 */
const handleUserRegistration = (socket, userSockets) => {
    return ({ userId }) => {
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        logger.info(`[UserSocket] User registered for tracking: ${userId}`);
    };
};