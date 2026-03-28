import Hospital from '../models/Hospital.js';
import Ambulance from '../models/Ambulance.js';
import Assignment from '../models/Assignment.js';

import { getIO } from '../config/socket.js';
import { driverSockets } from './socketService.js';
import redisClient from '../config/redis.js';

// --- Helper: Haversine Distance (in km) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
};

// --- Step 1: Define Clinical Requirements ---
const getRequirements = (emergencyType) => {
    const type = (emergencyType || 'default').toLowerCase();
    const reqs = {
        'cardiac': {
            specialists: ['cardiologist'],
            equipment: ['cathLab'],
            minTraumaLevel: 3
        },
        'trauma': {
            specialists: ['orthopedic', 'neurologist'],
            equipment: ['ctScan', 'ventilator'],
            beds: ['icuAvailable']
        },
        'respiratory': {
            equipment: ['ventilator'],
            beds: ['icuAvailable']
        },
        'stroke': {
            specialists: ['neurologist'],
            equipment: ['ctScan', 'mri']
        },
        'pediatric': {
            specialists: ['pediatrician']
        },
        'default': {}
    };
    return reqs[type] || reqs['default'];
};

// --- Main Orchestration Function ---
export const orchestrateReferral = async (triageData, patientLocation, referralId, wantAmbulance, patientId) => {
    const { emergency_type, severity } = triageData;

    // 1. Get Requirements
    console.log(`[Orchestration] Referral ${referralId} - Emergency: ${emergency_type}, Severity: ${severity}`);
    const requirements = getRequirements(emergency_type);
    console.log(`[Orchestration] Requirements:`, JSON.stringify(requirements));

    // 2. Fetch Active Facilities
    const hospitalsRaw = await Hospital.find({ status: { $ne: 'offline' } });
    const hospitals = hospitalsRaw.map(h => h.toObject());
    console.log(`[Orchestration] Found ${hospitals.length} active hospitals.`);

    // 3. Filter & Score Hospitals
    console.log(`[Orchestration] Referral ${referralId} - Step 3: Scoring hospitals...`);
    const scoredHospitals = hospitals.map(hospital => {
        // --- 3a. Capability Filtering (Hard Filter) ---
        let capabilityMatch = true;
        let missingCapabilities = [];

        // Check Specialists
        if (requirements.specialists) {
            requirements.specialists.forEach(spec => {
                if (!hospital.specialists[spec]) {
                    capabilityMatch = false;
                    missingCapabilities.push(spec);
                }
            });
        }

        // Check Equipment
        if (requirements.equipment) {
            requirements.equipment.forEach(eq => {
                if (!hospital.equipment[eq]) {
                    capabilityMatch = false;
                    missingCapabilities.push(eq);
                }
            });
        }

        // Check Beds
        if (requirements.beds) {
            requirements.beds.forEach(bedType => {
                if (!hospital.beds || !hospital.beds[bedType] || hospital.beds[bedType] <= 0) {
                    capabilityMatch = false;
                    missingCapabilities.push(bedType);
                }
            });
        }

        if (!capabilityMatch) {
            console.log(`[Orchestration] Hospital ${hospital.name} EXCLUDED. Missing: ${missingCapabilities.join(', ')}`);
            return { id: hospital._id, eligible: false, reason: `Missing: ${missingCapabilities.join(', ')}` };
        }

        // --- 3b. Scoring Logic ---
        const distance = calculateDistance(
            patientLocation.lat, patientLocation.lng,
            hospital.location.lat, hospital.location.lng
        );

        const icuAvailable = hospital.beds.icuAvailable || 0;
        const statusPenalty = hospital.status === 'overloaded' ? 50 : 0;

        // Formula: Start at 100
        // - 10 points per km (Very heavy penalty for distance)
        // + 1 point per ICU bed (Small bonus for capacity)
        // - 50 points if overloaded
        let score = 100 - (distance * 10) + (icuAvailable * 1) - statusPenalty;

        return {
            id: hospital._id,
            name: hospital.name,
            eligible: true,
            location: hospital.location,
            address: hospital.location?.address, // Flat fallback
            distance: parseFloat(distance.toFixed(2)),
            contact: hospital.contactNumber || hospital.phone || hospital.contact,
            contactNumber: hospital.contactNumber || hospital.phone || hospital.contact, // Extra redundancy
            icuAvailable,
            status: hospital.status,
            score: parseFloat(score.toFixed(2))
        };
    }).filter(h => h.eligible);

    // Sort by Score Descending
    scoredHospitals.sort((a, b) => b.score - a.score);
    console.log(`[Orchestration] Scored ${scoredHospitals.length} eligible hospitals.`);

    const bestHospital = scoredHospitals.length > 0 ? scoredHospitals[0] : null;

    if (!bestHospital) {
        console.warn("[Orchestration] No eligible hospital found!");
        return { error: "No eligible facility found within range matching capabilities." };
    }
    console.log(`[Orchestration] Best Hospital: ${bestHospital.name} (Score: ${bestHospital.score})`);

    // 4. Find Nearest Ambulance (Conditional) USING REDIS
    console.log(`[Orchestration] Referral ${referralId} - Step 4: Finding ambulance (Requested: ${wantAmbulance})...`);
    let bestAmbulance = null;

    if (wantAmbulance) {
        try {
            // Search Redis for ambulances within a 50km radius, sorted closest first
            const nearbyAmbulances = await redisClient.geoSearch(
                'ambulances:locations',
                { longitude: patientLocation.lng, latitude: patientLocation.lat },
                { radius: 50, unit: 'km' },
                { WITHDIST: true, SORT: 'ASC' }
            );

            // If Redis found at least one ambulance nearby
            if (nearbyAmbulances.length > 0) {
                const closestId = nearbyAmbulances[0].member; // Gives us the MongoDB _id string

                // Fetch static details from Mongo (Vehicle number, etc.)
                const ambDetails = await Ambulance.findById(closestId);

                if (ambDetails && ambDetails.status === 'Available') {
                    bestAmbulance = {
                        id: ambDetails._id,
                        vehicleNumber: ambDetails.vehicleNumber,
                        type: ambDetails.type,
                        distance: parseFloat(nearbyAmbulances[0].distance.toFixed(2))
                    };
                }
            }
        } catch (err) {
            console.error("[Redis] Error fetching nearest ambulance:", err);
        }
    }


    // 5. Create Assignment Record
    let assignmentId = null;
    try {
        const assignment = new Assignment({
            referralId,
            patientId,
            patientLocation,
            triage: triageData,
            assignedHospital: {
                id: bestHospital.id,
                name: bestHospital.name,
                contact: bestHospital.contact,
                location: {
                    lat: bestHospital.location.lat,
                    lng: bestHospital.location.lng,
                    address: bestHospital.location.address
                },
                distance: bestHospital.distance,
                score: bestHospital.score,
                reason: `Best capability match with score ${bestHospital.score} (Dist: ${bestHospital.distance}km, ICU: ${bestHospital.icuAvailable})`
            },
            assignedAmbulance: null, // Driver will accept via Socket
            status: wantAmbulance ? 'Pending' : 'Referral Only'
        });

        const savedAssignment = await assignment.save();
        assignmentId = savedAssignment._id;

        // --- Notify Nearby Drivers USING REDIS ---
        const io = getIO();
        if (savedAssignment.status === 'Pending' && io) {
            try {
                console.log(`[Orchestration] Searching for drivers via Redis near: [${patientLocation.lng}, ${patientLocation.lat}]`);

                // Ask Redis for all ambulance IDs within 50km
                // (We don't need sorting or distance here, just the IDs)
                const nearbyFromRedis = await redisClient.geoSearch(
                    'ambulances:locations',
                    { longitude: patientLocation.lng, latitude: patientLocation.lat },
                    { radius: 50, unit: 'km' }
                );

                console.log(`[Orchestration] Redis found ${nearbyFromRedis.length} drivers nearby.`);

                // Loop through the IDs Redis gave us
                for (const redisAmbulanceId of nearbyFromRedis) {
                    const aid = String(redisAmbulanceId);

                    // Check if they have an active WebSocket connection
                    const liveSocketId = driverSockets.get(aid);

                    // If they are online, emit the event directly to them!
                    if (liveSocketId) {
                        console.log(`[Orchestration] EMITTING NEW_EMERGENCY to socket: ${liveSocketId}`);
                        io.to(liveSocketId).emit('NEW_EMERGENCY', {
                            assignmentId: savedAssignment._id,
                            triage: savedAssignment.triage,
                            patientLocation: savedAssignment.patientLocation,
                            hospitalName: bestHospital.name
                        });
                    }
                }
            } catch (socketError) {
                console.error("[Orchestration] Redis Socket notification error:", socketError);
            }
        }

        else {
            console.log(`[Orchestration] Skip notify: assignment status is ${savedAssignment.status}. io object present: ${!!io}`);
            if (savedAssignment.status === 'Pending' && !io) {
                console.error("[Orchestration] CRITICAL: io object is NULL! Socket notifications will not work.");
            }
        }
    } catch (saveError) {
        console.error("[Orchestration] CRITICAL: Failed to save assignment:", saveError);
        // We continue anyway to return the recommendation to the user, but mark as failed
        return {
            success: false,
            error: "Failed to save assignment record.",
            hospital: {
                ...bestHospital,
                reason: `Best capability match with score ${bestHospital.score} (Dist: ${bestHospital.distance}km, ICU: ${bestHospital.icuAvailable})`
            },
            ambulance: bestAmbulance || (wantAmbulance ? { message: "No active ambulances available." } : { message: "Ambulance not requested." }),
            alternatives: scoredHospitals.slice(1, 4)
        };
    }

    // 6. Return Decision
    return {
        success: true,
        assignmentId: assignmentId,
        hospital: {
            ...bestHospital,
            reason: `Best capability match with score ${bestHospital.score} (Dist: ${bestHospital.distance}km, ICU: ${bestHospital.icuAvailable})`
        },
        ambulance: bestAmbulance || (wantAmbulance ? { message: "No active ambulances available." } : { message: "Ambulance not requested." }),
        alternatives: scoredHospitals.slice(1, 4)
    };
};
