
import mongoose from 'mongoose';
import Hospital from './models/Hospital.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function dump() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hospitals = await Hospital.find({});
        fs.writeFileSync('hospital_dump.json', JSON.stringify(hospitals, null, 2));
        console.log("Dumped", hospitals.length, "hospitals to hospital_dump.json");
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

dump();
