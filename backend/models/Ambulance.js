import mongoose from 'mongoose';

const ambulanceSchema = new mongoose.Schema({
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: false // Optional for now until Hospital model is fully integrated
    },
    vehicleNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    type: {
        type: String,
        enum: ['ALS', 'BLS', 'Patient Transport', 'Neonatal', 'Air'],
        required: true
    },
    status: {
        type: String,
        enum: ['Available', 'Busy', 'Maintenance', 'Inactive'],
        default: 'Available'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    driverName: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /\d{10}/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    equipment: [{
        type: String
    }],
    socketId: {
        type: String,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for geospatial queries
ambulanceSchema.index({ location: '2dsphere' });

const Ambulance = mongoose.model('Ambulance', ambulanceSchema);

export default Ambulance;
