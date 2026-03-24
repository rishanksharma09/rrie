/**
 * Driver socket handlers for ambulance operations
 * Handles driver registration, emergency acceptance, location updates, etc.
 */

import Ambulance from '../../models/Ambulance.js';
import Assignment from '../../models/Assignment.js';
import { calculateETA } from '../../utils/mapboxUtils.js';
import { driverSockets } from './socketMaps.js';

/**
 * Sets up all driver-related socket event handlers
 * @param {Object} socket - Individual socket connection
 * @param {Object} io - Socket.IO server instance
 * @param {Map} userSockets - Map of user connections
 * @returns {Function} Setup function
 */
export const setupDriverSocketHandlers = (socket, io, userSockets) => {
    // Driver registration
    socket.on('register_driver', handleDriverRegistration(socket));

    // Emergency acceptance
    socket.on('accept_emergency', handleEmergencyAcceptance(socket, io, userSockets));

    // Location updates from drivers
    socket.on('update_location', handleLocationUpdate(socket, io, userSockets));

    // Mission completion
    socket.on('complete_mission', handleMissionCompletion(socket));

    // Pass emergency to next available unit
    socket.on('pass_to_next_unit', handlePassToNextUnit(socket, io));
};

/**
 * Handles driver registration and online status
 * @param {Object} socket - Socket connection
 * @returns {Function} Event handler function
 */
const handleDriverRegistration = (socket) => {
    return async ({ ambulanceId }) => {
        console.log(`[DriverSocket] Registering driver for ambulance: ${ambulanceId}`);
        try {
            const ambulance = await Ambulance.findByIdAndUpdate(
                ambulanceId,
                { socketId: socket.id, isOnline: true },
                { new: true }
            );

            if (ambulance) {
                socket.ambulanceId = ambulanceId;
                const aid = String(ambulanceId);
                driverSockets.set(aid, socket.id);
                console.log(`[DriverSocket] Driver registered: ${ambulance.vehicleNumber} (ID: ${aid}) → ${socket.id}`);
                socket.emit('registration_success', {
                    status: 'online',
                    vehicleNumber: ambulance.vehicleNumber
                });
            } else {
                console.warn(`[DriverSocket] Ambulance ${ambulanceId} not found in database`);
                socket.emit('error', { message: 'Ambulance not found' });
            }
        } catch (error) {
            console.error('[DriverSocket] Driver registration error:', error);
            socket.emit('error', { message: 'Registration failed' });
        }
    };
};

/**
 * Handles emergency assignment acceptance by drivers
 * @param {Object} socket - Socket connection
 * @param {Object} io - Socket.IO server instance
 * @param {Map} userSockets - Map of user connections
 * @returns {Function} Event handler function
 */

// (CAN USE QUEUE SYSTEM HERE IF NEEDED)
const handleEmergencyAcceptance = (socket, io, userSockets) => {
    return async ({ assignmentId, ambulanceId }) => {
        console.log(`[DriverSocket] Accepting emergency: Assignment=${assignmentId}, Ambulance=${ambulanceId}`);
        try {
            // Get ambulance details
            const ambulance = await Ambulance.findById(ambulanceId);
            if (!ambulance) {
                console.warn(`[DriverSocket] Ambulance ${ambulanceId} not found`);
                return socket.emit('error', { message: 'Ambulance not found' });
            }

            // Atomically update assignment status
            const assignment = await Assignment.findOneAndUpdate(
                { _id: assignmentId, status: 'Pending' },
                {
                    status: 'Dispatched',
                    assignedAmbulance: {
                        id: ambulanceId,
                        vehicleNumber: ambulance.vehicleNumber,
                        driverName: ambulance.driverName,
                        contactNumber: ambulance.contactNumber,
                        status: 'On Way'
                    }
                },
                { new: true }
            ).populate('assignedHospital.id');

            if (!assignment) {
                console.warn(`[DriverSocket] Assignment ${assignmentId} already taken or invalid`);
                return socket.emit('error', { message: 'Assignment already taken' });
            }

            // Calculate initial ETA
            if (ambulance.location && ambulance.location.coordinates) {
                const ambCoords = ambulance.location.coordinates;
                const patientCoords = [assignment.patientLocation.lng, assignment.patientLocation.lat];
                const { etaText } = await calculateETA(ambCoords, patientCoords);

                assignment.assignedAmbulance.eta = etaText;
                await assignment.save();
            }

            // Update ambulance status to busy
            ambulance.status = 'Busy';
            await ambulance.save();

            console.log(`[DriverSocket] Emergency ${assignmentId} accepted by ${ambulance.vehicleNumber}`);

            // Confirm assignment to driver
            socket.emit('assignment_confirmed', assignment);

            // Notify patient if online (CAN USE QUEUE SYSTEM HERE IF NEEDED)
            const userSocketId = userSockets.get(assignment.patientId);
            if (userSocketId) {
                io.to(userSocketId).emit('EMERGENCY_ASSIGNED', assignment);
            }

        } catch (error) {
            console.error('[DriverSocket] Emergency acceptance error:', error);
            socket.emit('error', { message: 'Failed to accept assignment', details: error.message });
        }
    };
};

/**
 * Handles real-time location updates from drivers
 * @param {Object} socket - Socket connection
 * @param {Object} io - Socket.IO server instance
 * @param {Map} userSockets - Map of user connections
 * @returns {Function} Event handler function
 */
const handleLocationUpdate = (socket, io, userSockets) => {
    return async ({ ambulanceId, coordinates }) => {
        try {
            // Update ambulance location in database
            await Ambulance.findByIdAndUpdate(ambulanceId, {
                location: { type: 'Point', coordinates }
            });

            // Check if this ambulance has an active assignment
            const activeAssignment = await Assignment.findOne({
                'assignedAmbulance.id': ambulanceId,
                status: 'Dispatched'
            });

            if (activeAssignment && activeAssignment.patientId) {
                const userSocketId = userSockets.get(activeAssignment.patientId);
                if (userSocketId) {
                    // Calculate real-time ETA
                    const patientCoords = [
                        activeAssignment.patientLocation.lng,
                        activeAssignment.patientLocation.lat
                    ];
                    const { etaText } = await calculateETA(coordinates, patientCoords);

                    // Update assignment with latest ETA
                    if (activeAssignment.assignedAmbulance) {
                        activeAssignment.assignedAmbulance.eta = etaText;
                        await activeAssignment.save();
                    }

                    // Send live location update to patient
                    io.to(userSocketId).emit('DRIVER_LIVE_LOCATION', {
                        assignmentId: activeAssignment._id,
                        ambulanceId,
                        coordinates,
                        vehicleNumber: activeAssignment.assignedAmbulance.vehicleNumber,
                        eta: etaText
                    });
                }
            }
        } catch (error) {
            console.error('[DriverSocket] Location update error:', error);
        }
    };
};

/**
 * Handles mission completion and resets driver to available
 * @param {Object} socket - Socket connection
 * @returns {Function} Event handler function
 */
const handleMissionCompletion = (socket) => {
    return async ({ ambulanceId, assignmentId }) => {
        console.log(`[DriverSocket] Completing mission: Ambulance=${ambulanceId}, Assignment=${assignmentId}`);
        try {
            // Reset ambulance to available
            await Ambulance.findByIdAndUpdate(ambulanceId, { status: 'Available' });

            // Mark assignment as completed
            if (assignmentId) {
                await Assignment.findByIdAndUpdate(assignmentId, { status: 'Completed' });
            }

            socket.emit('mission_completed', { status: 'Available' });
            console.log(`[DriverSocket] Driver ${ambulanceId} reset to Available`);
        } catch (error) {
            console.error('[DriverSocket] Mission completion error:', error);
        }
    };
};

/**
 * Handles passing emergency to next available driver
 * @param {Object} socket - Socket connection
 * @param {Object} io - Socket.IO server instance
 * @returns {Function} Event handler function
 */
const handlePassToNextUnit = (socket, io) => {
    return async ({ assignmentId, ambulanceId }) => {
        const passingId = String(ambulanceId);
        console.log(`[DriverSocket] Passing to next unit: Assignment=${assignmentId}, by Ambulance=${passingId}`);

        try {
            const assignment = await Assignment.findById(String(assignmentId));
            if (!assignment) {
                console.warn(`[DriverSocket] Assignment ${assignmentId} not found`);
                return;
            }

            if (!['Pending', 'Dispatched'].includes(assignment.status)) {
                console.warn(`[DriverSocket] Cannot pass assignment with status: ${assignment.status}`);
                return;
            }

            // Reset assignment if it was already accepted
            if (assignment.status === 'Dispatched') {
                assignment.status = 'Pending';
                assignment.assignedAmbulance = undefined;
                await assignment.save();
                console.log(`[DriverSocket] Reset assignment ${assignmentId} to Pending`);
            }

            const emergencyPayload = {
                assignmentId: assignment._id,
                triage: assignment.triage,
                patientLocation: assignment.patientLocation,
                hospitalName: assignment.assignedHospital?.name
            };

            // Find other available drivers (exclude the one passing)
            const otherSocketIds = [...driverSockets.entries()]
                .filter(([aid]) => aid !== passingId)
                .map(([, sid]) => sid);

            console.log(`[DriverSocket] Re-dispatching to ${otherSocketIds.length} other drivers`);

            if (otherSocketIds.length > 0) {
                // Send to other drivers
                otherSocketIds.forEach(sid => {
                    console.log(`[DriverSocket] Sending NEW_EMERGENCY to socket: ${sid}`);
                    io.to(sid).emit('NEW_EMERGENCY', emergencyPayload);
                });
            } else {
                // No other drivers available - re-queue to same driver after delay
                console.warn('[DriverSocket] No other drivers online, re-queuing to same driver in 3s');
                setTimeout(() => {
                    socket.emit('NEW_EMERGENCY', emergencyPayload);
                }, 3000);
            }
        } catch (error) {
            console.error('[DriverSocket] Pass to next unit error:', error);
        }
    };
};