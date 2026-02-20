import { io } from 'socket.io-client';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ambulance from '../models/Ambulance.js';

dotenv.config();

let ambulanceId = process.argv[2];
const socket = io('http://localhost:5000');
socket.on('connect', async () => {
    console.log("Connected to Socket ID:", socket.id);



    if (!ambulanceId) {
        console.log("No ID provided. Searching for an available ambulance in DB...");
        try {
            await mongoose.connect(process.env.MONGO_URI);
            const ambulance = await Ambulance.findOne({ vehicleNumber: /DL-01-TEST/ }).sort({ createdAt: -1 });
            if (ambulance) {
                ambulanceId = ambulance._id.toString();
                console.log(`Auto-discovered test ambulance: ${ambulance.vehicleNumber} (${ambulanceId})`);
            } else {
                console.log("No test ambulance found. Using hardcoded fallback.");
                ambulanceId = '67b73c218684711316b2302e';
            }
            await mongoose.connection.close();
        } catch (dbErr) {
            console.error("Database connection failed for auto-lookup:", dbErr);
            ambulanceId = '67b73c218684711316b2302e';
        }
    }

    console.log(`Registering driver for ambulance: ${ambulanceId}`);
    socket.emit('register_driver', { ambulanceId });
});

socket.on('registration_success', (data) => {
    console.log("Registration successful:", data);

    // Simulate location updates
    setInterval(() => {
        const lat = 28.6139 + (Math.random() - 0.5) * 0.01;
        const lng = 77.2090 + (Math.random() - 0.5) * 0.01;
        console.log(`Sending location: [${lng}, ${lat}]`);
        socket.emit('update_location', {
            ambulanceId: ambulanceId,
            coordinates: [lng, lat]
        });
    }, 5000);
});

socket.on('NEW_EMERGENCY', (emergency) => {
    console.log("!!! NEW EMERGENCY RECEIVED !!!");
    console.log(JSON.stringify(emergency, null, 2));

    // Accept after 2 seconds
    setTimeout(() => {
        console.log("Accepting emergency...");
        socket.emit('accept_emergency', {
            assignmentId: emergency.assignmentId,
            ambulanceId: ambulanceId
        });
    }, 2000);
});

socket.on('assignment_confirmed', (assignment) => {
    console.log("Assignment confirmed!");
    console.log(JSON.stringify(assignment, null, 2));
});

socket.on('error', (err) => {
    console.error("Socket error:", err);
});

socket.on('disconnect', () => {
    console.log("Disconnected from server");
});
