
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { orchestrateReferral } from './services/orchestration.js';

dotenv.config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const triageData = {
            emergency_type: 'Cardiac',
            severity: 'high',
            confidence: 0.9,
            risk_flags: ['cardiac_symptoms']
        };

        const patientLocation = { lat: 30.3574, lng: 76.3631 };
        const referralId = new mongoose.Types.ObjectId();

        const result = await orchestrateReferral(triageData, patientLocation, referralId, true);

        console.log("\n--- Orchestration Result ---");
        console.log("Hospital Name:", result.hospital?.name);
        console.log("Hospital Contact:", result.hospital?.contact);
        console.log("Hospital Address:", result.hospital?.location?.address);
        console.log("Alternatives Count:", result.alternatives?.length);

        if (result.alternatives && result.alternatives.length > 0) {
            console.log("\n--- Alternative 1 ---");
            console.log("Name:", result.alternatives[0].name);
            console.log("Contact:", result.alternatives[0].contact);
            console.log("Address:", result.alternatives[0].location?.address);
        }

    } catch (error) {
        console.error("Test Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

test();
