import Hospital from '../models/Hospital.js';
import { getIO } from '../config/socket.js';

export const getHospitalByEmail = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        const hospital = await Hospital.findOne({ email });

        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found." });
        }

        res.json(hospital);
    } catch (error) {
        console.error("Get Hospital Error:", error);
        res.status(500).json({ message: "Server error fetching hospital data." });
    }
};

export const getAllHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find({});
        res.json(hospitals);
    } catch (error) {
        console.error("Get All Hospitals Error:", error);
        res.status(500).json({ message: "Server error fetching all hospitals." });
    }
};

export const updateHospital = async (req, res) => {
    try {
        const { email, updates } = req.body;

        if (!email || !updates) {
            return res.status(400).json({ message: "Email and updates are required." });
        }

        const hospital = await Hospital.findOne({ email });

        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found." });
        }

        // Update allowed fields (resources, etc.)
        // We use a deep merge or specific field handling if needed, 
        // but for now relying on the structure being correct in `updates`

        // Example: updates = { resources: { ... } }

        if (updates.beds) {
            hospital.beds = updates.beds;
        }
        if (updates.specialists) {
            hospital.specialists = updates.specialists;
        }
        if (updates.equipment) {
            hospital.equipment = updates.equipment;
        }
        if (updates.status) {
            hospital.status = updates.status;
        }

        await hospital.save();

        // Broadcast the update to all connected clients (e.g., Network Explorer)
        const io = getIO();
        if (io) {
            io.emit('HOSPITAL_DATA_UPDATED', hospital);
        }

        res.json({ message: "Hospital updated successfully", hospital });
    } catch (error) {
        console.error("Update Hospital Error:", error);
        res.status(500).json({ message: "Server error updating hospital." });
    }
};
