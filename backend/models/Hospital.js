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
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    address: { 
        type: String, 
        required: true 
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

// Index for geospatial queries
hospitalSchema.index({ location: '2dsphere' });

const Hospital = mongoose.model('Hospital', hospitalSchema);


export default Hospital;
