import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

const seedMoreHospitals = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const hospitals = [
            {
                name: "Northside Trauma Center",
                email: "northside@test.com",
                level: "state",
                location: {
                    lat: 29.7000,
                    lng: 77.0100,
                    address: "45 North Ave, Test City"
                },
                contactNumber: "1112223333",
                beds: {
                    icuAvailable: 8,
                    icuTotal: 25,
                    erAvailable: 10,
                    wardAvailable: 40
                },
                specialists: {
                    neurologist: true,
                    cardiologist: true,
                    orthopedic: true,
                    pediatrician: false
                },
                equipment: {
                    ctScan: true,
                    mri: true,
                    ventilator: true,
                    cathLab: true
                },
                status: "active"
            },
            {
                name: "West End Community Clinic",
                email: "westend@test.com",
                level: "community",
                location: {
                    lat: 29.6600,
                    lng: 76.9500,
                    address: "88 West Blvd, Test City"
                },
                contactNumber: "4445556666",
                beds: {
                    icuAvailable: 0,
                    icuTotal: 5,
                    erAvailable: 2,
                    wardAvailable: 15
                },
                specialists: {
                    neurologist: false,
                    cardiologist: false,
                    orthopedic: true,
                    pediatrician: true
                },
                equipment: {
                    ctScan: false,
                    mri: false,
                    ventilator: true,
                    cathLab: false
                },
                status: "overloaded"
            },
            {
                name: "East Valley Children's Hospital",
                email: "eastvalley@test.com",
                level: "specialty",
                location: {
                    lat: 29.6900,
                    lng: 77.0500,
                    address: "101 East St, Test City"
                },
                contactNumber: "7778889999",
                beds: {
                    icuAvailable: 12,
                    icuTotal: 30,
                    erAvailable: 8,
                    wardAvailable: 60
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
            },
            {
                name: "South City Emergency",
                email: "southcity@test.com",
                level: "district",
                location: {
                    lat: 29.6400,
                    lng: 76.9800,
                    address: "22 South Rd, Test City"
                },
                contactNumber: "0001112222",
                beds: {
                    icuAvailable: 1,
                    icuTotal: 15,
                    erAvailable: 3,
                    wardAvailable: 20
                },
                specialists: {
                    neurologist: false,
                    cardiologist: true,
                    orthopedic: true,
                    pediatrician: false
                },
                equipment: {
                    ctScan: true,
                    mri: false,
                    ventilator: true,
                    cathLab: false
                },
                status: "active"
            }
        ];

        // Use insertMany to add them. 
        // We use 'ordered: false' so if one fails (duplicate email), others still insert.
        try {
            await Hospital.insertMany(hospitals, { ordered: false });
            console.log('Successfully added 4 new hospitals.');
        } catch (e) {
            console.log('Some hospitals might verify duplicate emails, but new ones were added.');
        }

        console.log('Seeding Completed.');
        process.exit();

    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedMoreHospitals();
