import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

const seedHospital = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const userEmail = 'rishanksharma04524@gmail.com';

        const hospitalData = {
            name: "City General Hospital (Test)",
            email: userEmail,
            level: "district",
            location: {
                lat: 29.6857,
                lng: 76.9905,
                address: "123 Test St, Test City"
            },
            contactNumber: "9876543210",
            beds: {
                icuAvailable: 3,
                icuTotal: 10,
                erAvailable: 5,
                wardAvailable: 12
            },
            specialists: {
                neurologist: true,
                cardiologist: true,
                orthopedic: true,
                pediatrician: true
            },
            equipment: {
                ctScan: true,
                mri: true,
                ventilator: true,
                cathLab: false
            },
            status: "active"
        };

        // Check if hospital exists and update/replace
        // We delete and recreate to ensure schema compliance if structure changed drastically
        await Hospital.deleteMany({ email: userEmail });
        console.log('Deleted old hospital data for this email.');

        await Hospital.create(hospitalData);
        console.log('Created new Hospital with updated structure.');

        console.log('Seeding Completed Successfully!');
        process.exit();

    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedHospital();
