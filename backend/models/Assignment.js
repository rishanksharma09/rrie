import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
    referralId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    patientLocation: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    triage: {
        emergency_type: { type: String, required: true },
        severity: { type: String, required: true },
        confidence: { type: Number },
        risk_flags: [String]
    },
    assignedHospital: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
        name: String,
        contact: String,
        location: { lat: Number, lng: Number, address: String },
        distance: Number,
        score: Number,
        reason: String
    },
    assignedAmbulance: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
        vehicleNumber: String,
        eta: String,
        distance: Number
    },
    status: {
        type: String,
        enum: ['Pending', 'Dispatched', 'Arrived', 'Complete', 'Cancelled', 'Referral Only'],
        default: 'Pending'
    },
    engineVersion: { type: String, default: 'v1.0.0' }
}, {
    timestamps: true
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;
