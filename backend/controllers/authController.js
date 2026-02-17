import Ambulance from '../models/Ambulance.js';
import Hospital from '../models/Hospital.js';

export const verifyRole = async (req, res) => {
    try {
        const { email, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({ message: "Email and role are required." });
        }

        let isValid = false;
        let userData = null;

        if (role === 'ambulance') {
            userData = await Ambulance.findOne({ email });
        } else if (role === 'hospital') {
            userData = await Hospital.findOne({ email });
        } else {
            return res.status(400).json({ message: "Invalid role specified." });
        }

        if (userData) {
            isValid = true;
            return res.json({
                authorized: true,
                role: role,
                details: {
                    id: userData._id,
                    name: role === 'ambulance' ? userData.vehicleNumber : userData.name
                }
            });
        } else {
            return res.status(403).json({
                authorized: false,
                message: `Access denied. Email not registered as ${role}.`
            });
        }

    } catch (error) {
        console.error("Auth Verification Error:", error);
        res.status(500).json({ message: "Internal server error during verification." });
    }
};
