import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    level: {
        type: String,
        required: true
    },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String, required: true }
    },
    contactNumber: {
        type: String,
        required: true
    },
    beds: {
        icuAvailable: { type: Number, default: 0 },
        icuTotal: { type: Number, default: 0 },
        erAvailable: { type: Number, default: 0 },
        wardAvailable: { type: Number, default: 0 }
    },
    specialists: {
        neurologist: { type: Boolean, default: false },
        cardiologist: { type: Boolean, default: false },
        orthopedic: { type: Boolean, default: false },
        pediatrician: { type: Boolean, default: false }
    },
    equipment: {
        ctScan: { type: Boolean, default: false },
        mri: { type: Boolean, default: false },
        ventilator: { type: Boolean, default: false },
        cathLab: { type: Boolean, default: false }
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'overloaded', 'offline']
    }
}, {
    timestamps: true
});

// Note: If geospatial queries are needed later, we might need a separate 2dsphere index field or transformation.
// For now, removing the 2dsphere index on 'location' as it's no longer a GeoJSON object.

// Index for geospatial queries

const Hospital = mongoose.model('Hospital', hospitalSchema);

export default Hospital;
