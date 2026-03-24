/**
 * Shared state management for socket connections
 * Contains in-memory maps for tracking active connections
 */

import Ambulance from '../../models/Ambulance.js';

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
        console.log('[Socket] Resetting all ambulance statuses in DB...');
        await Ambulance.updateMany({}, {
            isOnline: false,
            socketId: null,
            status: 'Available'
        });
        console.log('[Socket] All ambulances reset to offline and available.');
    } catch (err) {
        console.error('[Socket] Failed to reset ambulance statuses:', err);
    }
};