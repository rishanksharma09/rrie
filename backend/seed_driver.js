import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ambulance from './models/Ambulance.js';

dotenv.config();

const seedDriver = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        const testDriver = {
            vehicleNumber: `DL-01-TEST-${Math.floor(Math.random() * 9000) + 1000}`,
            email: `driver_${Math.floor(Math.random() * 1000)}@test.com`,
            type: 'ALS',
            status: 'Available',
            location: {
                type: 'Point',
                coordinates: [77.2090, 28.6139] // Delhi center
            },
            driverName: 'Rishank Test Driver',
            contactNumber: '9999999999',
            equipment: ['Defibrillator', 'Oxygen', 'Ventilator'],
            isOnline: false,
            isActive: true
        };

        const ambulance = await Ambulance.create(testDriver);
        console.log('\n--- New Test Driver Created ---');
        console.log(`ID: ${ambulance._id}`);
        console.log(`Vehicle: ${ambulance.vehicleNumber}`);
        console.log(`Driver: ${ambulance.driverName}`);
        console.log('\n-------------------------------');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("Error seeding driver:", error);
        process.exit(1);
    }
};

seedDriver();
