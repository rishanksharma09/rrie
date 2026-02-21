import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

const checkHospitals = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await Hospital.countDocuments();
        const hospitals = await Hospital.find({}).limit(10);
        console.log(`Total hospitals: ${count}`);
        console.log('Sample hospitals:', JSON.stringify(hospitals, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkHospitals();
