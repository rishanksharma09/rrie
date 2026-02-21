import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

const scenarios = {
    cardiac: [
        { name: "Rajindra Hospital Patiala", status: "active", equipment: { cathLab: true }, specialists: { cardiologist: true }, beds: { icuAvailable: 10 } },
        { name: "Government Medical College & Hospital Patiala", status: "active", equipment: { cathLab: false }, specialists: { cardiologist: false }, beds: { icuAvailable: 1 } },
        { name: "Columbia Asia Hospital Patiala", status: "active", equipment: { cathLab: true }, specialists: { cardiologist: true }, beds: { icuAvailable: 5 } },
        { name: "Amar Hospital Patiala", status: "active", equipment: { cathLab: false }, specialists: { cardiologist: false }, beds: { icuAvailable: 0 } },
        { name: "Deep Hospital Patiala", status: "active", equipment: { cathLab: false }, specialists: { cardiologist: false }, beds: { icuAvailable: 1 } }
    ],
    load: [
        { name: "Rajindra Hospital Patiala", status: "overloaded", beds: { icuAvailable: 0 } },
        { name: "Government Medical College & Hospital Patiala", status: "active", beds: { icuAvailable: 8 } },
        { name: "Columbia Asia Hospital Patiala", status: "active", beds: { icuAvailable: 5 } },
        { name: "Amar Hospital Patiala", status: "active", beds: { icuAvailable: 2 } },
        { name: "Deep Hospital Patiala", status: "active", beds: { icuAvailable: 3 } }
    ],
    trauma: [
        { name: "Rajindra Hospital Patiala", status: "active", equipment: { mri: true, ctScan: true, ventilator: true }, specialists: { neurologist: true, orthopedic: true }, beds: { icuAvailable: 15 } },
        { name: "Government Medical College & Hospital Patiala", status: "active", equipment: { mri: false, ctScan: true, ventilator: true }, specialists: { neurologist: true, orthopedic: true }, beds: { icuAvailable: 8 } },
        { name: "Columbia Asia Hospital Patiala", status: "active", equipment: { mri: false, ctScan: true, ventilator: true }, specialists: { neurologist: false, orthopedic: true }, beds: { icuAvailable: 4 } },
        { name: "Amar Hospital Patiala", status: "active", equipment: { mri: false, ventilator: false }, specialists: { neurologist: false, orthopedic: false } },
        { name: "Deep Hospital Patiala", status: "active", equipment: { mri: false, ventilator: false }, specialists: { neurologist: false, orthopedic: false } }
    ],
    unified: [
        {
            name: "Rajindra Hospital Patiala",
            status: "active",
            specialists: { cardiologist: true, neurologist: true, orthopedic: true, pediatrician: true },
            equipment: { cathLab: true, mri: true, ctScan: true, ventilator: true },
            beds: { icuAvailable: 15, icuTotal: 25 }
        },
        {
            name: "Columbia Asia Hospital Patiala",
            status: "active",
            specialists: { cardiologist: true, orthopedic: true, neurologist: false },
            equipment: { cathLab: true, ctScan: true, ventilator: true, mri: false },
            beds: { icuAvailable: 8, icuTotal: 15 }
        },
        {
            name: "Government Medical College & Hospital Patiala",
            status: "active",
            specialists: { cardiologist: true, orthopedic: true, neurologist: true, pediatrician: true },
            equipment: { cathLab: false, ctScan: true, ventilator: true, mri: false },
            beds: { icuAvailable: 12, icuTotal: 30 }
        },
        {
            name: "Amar Hospital Patiala",
            status: "overloaded",
            specialists: { orthopedic: true },
            equipment: { ctScan: true, ventilator: true },
            beds: { icuAvailable: 0, icuTotal: 10 }
        },
        {
            name: "Deep Hospital Patiala",
            status: "active",
            specialists: { pediatrician: true },
            equipment: { ventilator: true },
            beds: { icuAvailable: 3, icuTotal: 12 }
        }
    ]
};

const switchDemo = async () => {
    const scenarioName = process.argv[2];
    if (!scenarioName || !scenarios[scenarioName]) {
        console.error("Usage: node switch_demo.js [cardiac|load|trauma]");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`Switching to scenario: ${scenarioName.toUpperCase()}`);

        const updates = scenarios[scenarioName];
        for (const update of updates) {
            await Hospital.findOneAndUpdate({ name: update.name }, { $set: update });
        }

        console.log("Database updated successfully for the demo.");
        process.exit(0);
    } catch (error) {
        console.error("Error updating demo scenario:", error);
        process.exit(1);
    }
};

switchDemo();
