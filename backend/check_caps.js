import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

const checkCap = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({}, 'name specialists equipment');
        console.log(JSON.stringify(hospitals, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkCap();
