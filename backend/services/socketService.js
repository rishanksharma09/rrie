import Ambulance from '../models/Ambulance.js';
import Assignment from '../models/Assignment.js';

export const initSocketService = (io) => {
    // Map to track user socket IDs for live tracking forwarding
    // Key: userId (patientId), Value: socketId
    const userSockets = new Map();

    io.on('connection', (socket) => {
        console.log(`[Socket] New connection: ${socket.id}`);

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
                    console.log(`[Socket] Driver registered successfully: ${ambulance.vehicleNumber} (ID: ${ambulance._id})`);
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

        // Disconnect Handling
        socket.on('disconnect', async () => {
            console.log(`[Socket] Disconnected: ${socket.id}`);

            // If it's a driver, mark offline
            if (socket.ambulanceId) {
                await Ambulance.findByIdAndUpdate(socket.ambulanceId, {
                    isOnline: false,
                    socketId: null
                });
                console.log(`[Socket] Driver offline: ${socket.ambulanceId}`);
            }

            // Cleanup user socket mapping
            if (socket.userId) {
                userSockets.delete(socket.userId);
            }
        });
    });
};
