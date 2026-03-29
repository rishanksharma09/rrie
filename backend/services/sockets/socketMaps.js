/**
 * Shared state management for socket connections
 * Contains in-memory maps for tracking active connections
 */

import Ambulance from '../../models/Ambulance.js';
import logger from '../../config/logger.js';

/**
 * Module-level map to track active driver socket connections
 * Key: ambulanceId (MongoDB _id string), Value: socketId
 * Exported so orchestration.js can access live socket IDs
 */
export const driverSockets = new Map();

/**
 * Resets all ambulances to offline status on server startup
 */
export const resetAllAmbulancesOnStartup = async () => {
    try {
        logger.info('[Socket] Resetting all ambulance statuses in DB...');
        await Ambulance.updateMany({}, {
            isOnline: false,
            socketId: null,
            status: 'Available'
        });
        logger.info('[Socket] All ambulances reset to offline and available.');
    } catch (err) {
        logger.error('[Socket] Failed to reset ambulance statuses:', err);
    }
};