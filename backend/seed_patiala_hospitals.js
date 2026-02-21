import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

const hospitals = [
    {
        "name": "Rajindra Hospital Patiala",
        "email": "rajindra.patiala@example.com",
        "level": "tertiary",
        "location": {
            "lat": 30.3398,
            "lng": 76.3869,
            "address": "Rajindra Hospital, Patiala, Punjab"
        },
        "contactNumber": "01752213000",
        "beds": {
            "icuAvailable": 6,
            "icuTotal": 20,
            "erAvailable": 12,
            "wardAvailable": 40
        },
        "specialists": {
            "neurologist": true,
            "cardiologist": true,
            "orthopedic": true,
            "pediatrician": true
        },
        "equipment": {
            "ctScan": true,
            "mri": true,
            "ventilator": true,
            "cathLab": true
        },
        "status": "active"
    },
    {
        "name": "Government Medical College & Hospital Patiala",
        "email": "gmch.patiala@example.com",
        "level": "tertiary",
        "location": {
            "lat": 30.3375,
            "lng": 76.3851,
            "address": "Government Medical College, Patiala, Punjab"
        },
        "contactNumber": "01752213050",
        "beds": {
            "icuAvailable": 4,
            "icuTotal": 18,
            "erAvailable": 10,
            "wardAvailable": 35
        },
        "specialists": {
            "neurologist": true,
            "cardiologist": true,
            "orthopedic": true,
            "pediatrician": false
        },
        "equipment": {
            "ctScan": true,
            "mri": true,
            "ventilator": true,
            "cathLab": false
        },
        "status": "active"
    },
    {
        "name": "Columbia Asia Hospital Patiala",
        "email": "columbia.patiala@example.com",
        "level": "secondary",
        "location": {
            "lat": 30.3520,
            "lng": 76.3725,
            "address": "Urban Estate Phase II, Patiala, Punjab"
        },
        "contactNumber": "01752880000",
        "beds": {
            "icuAvailable": 2,
            "icuTotal": 10,
            "erAvailable": 6,
            "wardAvailable": 20
        },
        "specialists": {
            "neurologist": false,
            "cardiologist": true,
            "orthopedic": true,
            "pediatrician": true
        },
        "equipment": {
            "ctScan": true,
            "mri": false,
            "ventilator": true,
            "cathLab": true
        },
        "status": "active"
    },
    {
        "name": "Amar Hospital Patiala",
        "email": "amar.patiala@example.com",
        "level": "secondary",
        "location": {
            "lat": 30.3362,
            "lng": 76.4002,
            "address": "Leela Bhawan, Patiala, Punjab"
        },
        "contactNumber": "01752222222",
        "beds": {
            "icuAvailable": 0,
            "icuTotal": 8,
            "erAvailable": 3,
            "wardAvailable": 15
        },
        "specialists": {
            "neurologist": false,
            "cardiologist": false,
            "orthopedic": true,
            "pediatrician": true
        },
        "equipment": {
            "ctScan": false,
            "mri": false,
            "ventilator": true,
            "cathLab": false
        },
        "status": "overloaded"
    },
    {
        "name": "Deep Hospital Patiala",
        "email": "deep.patiala@example.com",
        "level": "secondary",
        "location": {
            "lat": 30.3489,
            "lng": 76.3792,
            "address": "Tripuri, Patiala, Punjab"
        },
        "contactNumber": "01752666666",
        "beds": {
            "icuAvailable": 3,
            "icuTotal": 12,
            "erAvailable": 5,
            "wardAvailable": 22
        },
        "specialists": {
            "neurologist": false,
            "cardiologist": true,
            "orthopedic": true,
            "pediatrician": false
        },
        "equipment": {
            "ctScan": true,
            "mri": false,
            "ventilator": true,
            "cathLab": false
        },
        "status": "active"
    }
];

const seedHospitals = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // Insert new hospitals
        await Hospital.insertMany(hospitals);
        console.log('Successfully added 5 hospitals for Patiala.');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding hospitals:', error);
        process.exit(1);
    }
};

seedHospitals();
