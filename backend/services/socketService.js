import Ambulance from '../models/Ambulance.js';
import Assignment from '../models/Assignment.js';

export const initSocketService = async (io) => {
    // Reset all ambulances to offline on server (re)start to avoid stale socketIds
    try {
        await Ambulance.updateMany({}, { isOnline: false, socketId: null });
        console.log('[Socket] Cleared stale ambulance online statuses on startup.');
    } catch (err) {
        console.error('[Socket] Failed to reset ambulance statuses on startup:', err);
    }

    // Map to track user socket IDs for live tracking forwarding
    // Key: userId (patientId), Value: socketId
    const userSockets = new Map();

    // Map to track hospital socket IDs for incoming patient alerts
    // Key: hospitalId (MongoDB _id), Value: socketId
    const hospitalSockets = new Map();

    // Map to track live driver socket IDs in memory
    // Key: ambulanceId (MongoDB _id string), Value: socketId
    const driverSockets = new Map();

    io.on('connection', (socket) => {
        console.log(`[Socket] New connection: ${socket.id}`);

        // Register Hospital
        socket.on('register_hospital', async ({ hospitalId }) => {
            const hid = String(hospitalId);
            hospitalSockets.set(hid, socket.id);
            socket.hospitalId = hid;
            console.log(`[Socket] Hospital registered: ${hid} → ${socket.id}`);
            socket.emit('hospital_registered', { status: 'live' });
        });

        // Register Driver
        socket.on('register_driver', async ({ ambulanceId }) => {
            console.log(`[Socket] Received register_driver for: ${ambulanceId}`);
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
                    console.log(`[Socket] Driver registered: ${ambulance.vehicleNumber} (ID: ${aid}) → ${socket.id}`);
                    socket.emit('registration_success', { status: 'online', vehicleNumber: ambulance.vehicleNumber });
                } else {
                    console.warn(`[Socket] Driver registration failed: Ambulance ${ambulanceId} not found in DB`);
                    socket.emit('error', { message: 'Ambulance not found in registration' });
                }
            } catch (error) {
                console.error(`[Socket] Registration CRITICAL error:`, error);
                socket.emit('error', { message: 'Registration failed internal error' });
            }
        });

        // Register User (Patient) for live tracking updates
        socket.on('register_user', ({ userId }) => {
            userSockets.set(userId, socket.id);
            socket.userId = userId;
            console.log(`[Socket] User registered for tracking: ${userId}`);
        });

        // Update Driver Location
        socket.on('update_location', async ({ ambulanceId, coordinates }) => {
            // coordinates: [lng, lat]
            try {
                await Ambulance.findByIdAndUpdate(ambulanceId, {
                    location: { type: 'Point', coordinates }
                });

                // Check if this ambulance is assigned to any active assignment
                const activeAssignment = await Assignment.findOne({
                    'assignedAmbulance.id': ambulanceId,
                    status: 'Dispatched'
                });

                if (activeAssignment && activeAssignment.patientId) {
                    const userSocketId = userSockets.get(activeAssignment.patientId);
                    if (userSocketId) {
                        io.to(userSocketId).emit('DRIVER_LIVE_LOCATION', {
                            ambulanceId,
                            coordinates,
                            vehicleNumber: activeAssignment.assignedAmbulance.vehicleNumber
                        });
                    }
                }
            } catch (error) {
                console.error(`[Socket] Location update error:`, error);
            }
        });

        // Accept Emergency (Atomic)
        socket.on('accept_emergency', async ({ assignmentId, ambulanceId }) => {
            console.log(`[Socket] Attempting to accept emergency: Assignment=${assignmentId}, Ambulance=${ambulanceId}`);
            try {
                // 1. Get ambulance details first for syncing
                const ambulanceObj = await Ambulance.findById(ambulanceId);
                if (!ambulanceObj) {
                    console.warn(`[Socket] Accept failed: Ambulance ${ambulanceId} not found.`);
                    return socket.emit('error', { message: 'Driver record not found' });
                }

                // 2. Atomic update of assignment
                const assignment = await Assignment.findOneAndUpdate(
                    { _id: assignmentId, status: 'Pending' },
                    {
                        status: 'Dispatched',
                        assignedAmbulance: {
                            id: ambulanceId,
                            vehicleNumber: ambulanceObj.vehicleNumber,
                            driverName: ambulanceObj.driverName,
                            contactNumber: ambulanceObj.contactNumber,
                            status: 'On Way'
                        }
                    },
                    { new: true }
                ).populate('assignedHospital.id');

                if (!assignment) {
                    console.warn(`[Socket] Accept failed: Assignment ${assignmentId} already taken or invalid.`);
                    return socket.emit('error', { message: 'Assignment already taken or invalid' });
                }

                // 3. Update ambulance status in DB
                ambulanceObj.status = 'Busy';
                await ambulanceObj.save();

                console.log(`[Socket] Emergency ${assignmentId} accepted by ${ambulanceObj.vehicleNumber}`);

                // 4. Confirm to driver
                socket.emit('assignment_confirmed', assignment);

                // 5. Notify user (if online)
                const userSocketId = userSockets.get(assignment.patientId);
                if (userSocketId) {
                    io.to(userSocketId).emit('EMERGENCY_ASSIGNED', assignment);
                }

            } catch (error) {
                console.error(`[Socket] Accept Emergency Error:`, error);
                socket.emit('error', { message: 'Failed to accept assignment', details: error.message });
            }
        });

        // Complete Mission - Driver resets to Available
        socket.on('complete_mission', async ({ ambulanceId, assignmentId }) => {
            console.log(`[Socket] Mission complete request: Ambulance=${ambulanceId}, Assignment=${assignmentId}`);
            try {
                // Reset ambulance to available
                await Ambulance.findByIdAndUpdate(ambulanceId, { status: 'Available' });

                // Mark assignment as completed
                if (assignmentId) {
                    await Assignment.findByIdAndUpdate(assignmentId, { status: 'Completed' });
                }

                socket.emit('mission_completed', { status: 'Available' });
                console.log(`[Socket] Driver ${ambulanceId} reset to Available.`);
            } catch (error) {
                console.error(`[Socket] Complete mission error:`, error);
            }
        });

        // Pass to Next Unit — Driver declines and re-dispatches to others
        socket.on('pass_to_next_unit', async ({ assignmentId, ambulanceId }) => {
            const passingId = String(ambulanceId);
            console.log(`[Socket] Pass to next unit: Assignment=${assignmentId}, passed by Ambulance=${passingId}`);
            console.log(`[Socket] Live drivers in memory:`, [...driverSockets.keys()]);
            try {
                const assignment = await Assignment.findById(assignmentId);
                if (!assignment || assignment.status !== 'Pending') {
                    console.warn(`[Socket] Pass failed: Assignment ${assignmentId} not found or no longer Pending.`);
                    return;
                }

                const emergencyPayload = {
                    assignmentId: assignment._id,
                    triage: assignment.triage,
                    patientLocation: assignment.patientLocation,
                    hospitalName: assignment.assignedHospital?.name
                };

                // Use in-memory driverSockets map — always has current live socket IDs
                const otherSocketIds = [...driverSockets.entries()]
                    .filter(([aid]) => aid !== passingId)
                    .map(([, sid]) => sid);

                console.log(`[Socket] Re-dispatching to ${otherSocketIds.length} other live driver(s).`);

                if (otherSocketIds.length > 0) {
                    otherSocketIds.forEach(sid => {
                        console.log(`[Socket] Emitting NEW_EMERGENCY to socket: ${sid}`);
                        io.to(sid).emit('NEW_EMERGENCY', emergencyPayload);
                    });
                } else {
                    // No other drivers online — re-queue to same driver after 3s
                    console.warn(`[Socket] No other drivers online. Re-queuing to same driver in 3s.`);
                    setTimeout(() => {
                        socket.emit('NEW_EMERGENCY', emergencyPayload);
                    }, 3000);
                }
            } catch (error) {
                console.error(`[Socket] Pass to next unit error:`, error);
            }
        });

        // Notify Hospital — Patient pre-alerts their assigned hospital
        socket.on('notify_hospital', ({ hospitalId, alertData }) => {
            const hid = String(hospitalId);
            console.log(`[Socket] Pre-alert → hospital ${hid}. Connected hospitals:`, [...hospitalSockets.keys()]);
            const hospitalSocketId = hospitalSockets.get(hid);
            if (hospitalSocketId) {
                io.to(hospitalSocketId).emit('INCOMING_PATIENT', {
                    ...alertData,
                    timestamp: new Date().toISOString(),
                    status: 'incoming'
                });
                socket.emit('hospital_notified', { success: true });
                console.log(`[Socket] Alert delivered to hospital ${hid}`);
            } else {
                socket.emit('hospital_notified', { success: false, reason: 'Hospital portal not online' });
                console.warn(`[Socket] Hospital ${hid} not connected. Map keys:`, [...hospitalSockets.keys()]);
            }
        });

        // Disconnect Handling
        socket.on('disconnect', async () => {
            console.log(`[Socket] Disconnected: ${socket.id}`);

            // If it's a driver, mark offline and remove from in-memory map
            if (socket.ambulanceId) {
                await Ambulance.findByIdAndUpdate(socket.ambulanceId, {
                    isOnline: false,
                    socketId: null
                });
                driverSockets.delete(String(socket.ambulanceId));
                console.log(`[Socket] Driver offline: ${socket.ambulanceId}`);
            }

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
