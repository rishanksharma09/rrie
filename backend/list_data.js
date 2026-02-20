import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ambulance from './models/Ambulance.js';
import Hospital from './models/Hospital.js';

dotenv.config();

const listData = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    const ambulances = await Ambulance.find();
    console.log('\n--- Ambulances ---');
    ambulances.forEach(a => console.log(`${a._id} | ${a.vehicleNumber} | ${a.driverName}`));

    const hospitals = await Hospital.find();
    console.log('\n--- Hospitals ---');
    hospitals.forEach(h => console.log(`${h._id} | ${h.name}`));

    await mongoose.connection.close();
};

listData();
