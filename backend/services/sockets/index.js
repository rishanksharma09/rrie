/**
 * Main socket service that combines all socket handlers
 * Provides a unified interface for socket management
 */

import { resetAllAmbulancesOnStartup } from './socketMaps.js';
import { setupDriverSocketHandlers } from './driverSocket.js';
import { setupHospitalSocketHandlers } from './hospitalSocket.js';
import { setupUserSocketHandlers } from './userSocket.js';

/**
 * Initializes the Socket.IO service with all event handlers
 * @param {Object} io - Socket.IO server instance
 */
export const initSocketService = async (io) => {
    console.log('[Socket] Initializing Socket Service...');

    // Reset all ambulances to offline on server restart
    await resetAllAmbulancesOnStartup();

    // In-memory maps for tracking active connections
    const userSockets = new Map();      // userId -> socketId
    const hospitalSockets = new Map();  // hospitalId -> socketId

    io.on('connection', (socket) => {
        console.log(`[Socket] New connection: ${socket.id}`);

        // Setup all socket event handlers
        setupDriverSocketHandlers(socket, io, userSockets);
        setupHospitalSocketHandlers(socket, io, hospitalSockets);
        setupUserSocketHandlers(socket, userSockets);

        // Handle disconnection cleanup
        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);

            // Cleanup user socket mapping
            if (socket.userId) {
                userSockets.delete(socket.userId);
            }

            // Cleanup hospital socket mapping
            if (socket.hospitalId) {
                hospitalSockets.delete(socket.hospitalId);
                console.log(`[Socket] Hospital offline: ${socket.hospitalId}`);
            }
        });
    });
};