import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import { orchestrateReferral } from './services/orchestration.js';

dotenv.config();

const testOrchestration = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Mock Data
        const triageData = {
            emergency_type: 'Cardiac', // Requires cardiologist + cathLab
            severity: 'Critical',
            confidence: 0.95,
            risk_flags: ['Chest Pain']
        };

        const patientLocation = {
            lat: 29.6800,
            lng: 76.9900 // Near "City General Hospital" (29.6857, 76.9905)
        };

        const referralId = new mongoose.Types.ObjectId();

        console.log("Running Orchestration...");
        const result = await orchestrateReferral(triageData, patientLocation, referralId);

        console.log("--------------------------------------------------");
        console.log("DECISION RESULT (Writing to orchestration_result.json)...");

        fs.writeFileSync('orchestration_result.json', JSON.stringify(result, null, 2));

        console.log("Result saved.");
        console.log("--------------------------------------------------");

        process.exit();
    } catch (error) {
        console.error("Test Error:", error);
        process.exit(1);
    }
};

testOrchestration();
