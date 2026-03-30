import Hospital from '../models/Hospital.js';
import Ambulance from '../models/Ambulance.js';
import Assignment from '../models/Assignment.js';
import logger from '../config/logger.js';

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
    logger.info(`[Orchestration] Referral ${referralId} - Emergency: ${emergency_type}, Severity: ${severity}`);
    const requirements = getRequirements(emergency_type);
    logger.info(`[Orchestration] Requirements:`, JSON.stringify(requirements));

    // 2. Build Clinical Requirements Match Stage
    const matchStage = { status: { $ne: 'offline' } };
    if (requirements.specialists) {
        requirements.specialists.forEach(spec => {
            matchStage[`specialists.${spec}`] = true;
        });
    }
    if (requirements.equipment) {
        requirements.equipment.forEach(eq => {
            matchStage[`equipment.${eq}`] = true;
        });
    }
    if (requirements.beds) {
        requirements.beds.forEach(bedType => {
            matchStage[`beds.${bedType}`] = { $gt: 0 };
        });
    }

    // 3. Fetch, Filter, and Score Hospitals via MongoDB Aggregation ($geoNear)
    // GeoJSON [longitude, latitude]
    const patientCoords = [parseFloat(patientLocation.lng), parseFloat(patientLocation.lat)];
    
    logger.info(`[Orchestration] SEARCHING FOR: Coord=${JSON.stringify(patientCoords)}, Query=${JSON.stringify(matchStage)}`);

    const scoredHospitals = await Hospital.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: patientCoords },
                distanceField: "distance",
                spherical: true,
                distanceMultiplier: 0.001, // Convert meters to kilometers
                query: matchStage
            }
        },
        {
            $addFields: {
                // Formula: 100 - (distance * 10) + (icuAvailable * 1) - statusPenalty
                score: {
                    $subtract: [
                        { $add: [
                            100,
                            { $multiply: [{ $ifNull: ["$beds.icuAvailable", 0] }, 1] }
                        ]},
                        { $add: [
                            { $multiply: ["$distance", 10] },
                            { $cond: [ { $eq: ["$status", "overloaded"] }, 50, 0 ] }
                        ]}
                    ]
                }
            }
        },
        { $sort: { score: -1 } }
    ]);

    logger.info(`[Orchestration] Aggregation Results: Found ${scoredHospitals.length} hospitals.`);
    if (scoredHospitals.length === 0) {
        const totalActive = await Hospital.countDocuments({ status: { $ne: 'offline' } });
        logger.warn(`[Orchestration] DIAGNOSTIC: Total active hospitals in DB: ${totalActive}. None matched clinical criteria.`);
    }

    const bestHospital = scoredHospitals.length > 0 ? scoredHospitals[0] : null;

    if (!bestHospital) {
        logger.warn("[Orchestration] No eligible hospital found!");
        return { error: "No eligible facility found within range matching capabilities." };
    }

    // Map result fields for downstream compatibility
    bestHospital.id = bestHospital._id;
    bestHospital.distance = parseFloat(bestHospital.distance.toFixed(2));
    bestHospital.score = parseFloat(bestHospital.score.toFixed(2));
    bestHospital.contact = bestHospital.contactNumber;

    logger.info(`[Orchestration] Best Hospital: ${bestHospital.name} (Score: ${bestHospital.score})`);


    // 4. Find Nearest Ambulance (Conditional) USING REDIS
    logger.info(`[Orchestration] Referral ${referralId} - Step 4: Finding ambulance (Requested: ${wantAmbulance})...`);
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
            logger.error("[Redis] Error fetching nearest ambulance:", err);
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
                    lat: bestHospital.location.coordinates[1],
                    lng: bestHospital.location.coordinates[0],
                    address: bestHospital.address
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
                logger.info(`[Orchestration] Searching for drivers via Redis near: [${patientLocation.lng}, ${patientLocation.lat}]`);

                // Ask Redis for all ambulance IDs within 50km
                // (We don't need sorting or distance here, just the IDs)
                const nearbyFromRedis = await redisClient.geoSearch(
                    'ambulances:locations',
                    { longitude: patientLocation.lng, latitude: patientLocation.lat },
                    { radius: 50, unit: 'km' }
                );

                logger.info(`[Orchestration] Redis found ${nearbyFromRedis.length} drivers nearby.`);

                // Loop through the IDs Redis gave us
                for (const redisAmbulanceId of nearbyFromRedis) {
                    const aid = String(redisAmbulanceId);

                    // Check if they have an active WebSocket connection
                    const liveSocketId = driverSockets.get(aid);

                    // If they are online, emit the event directly to them!
                    if (liveSocketId) {
                        logger.info(`[Orchestration] EMITTING NEW_EMERGENCY to socket: ${liveSocketId}`);
                        io.to(liveSocketId).emit('NEW_EMERGENCY', {
                            assignmentId: savedAssignment._id,
                            triage: savedAssignment.triage,
                            patientLocation: savedAssignment.patientLocation,
                            hospitalName: bestHospital.name
                        });
                    }
                }
            } catch (socketError) {
                logger.error("[Orchestration] Redis Socket notification error:", socketError);
            }
        }

        else {
            logger.info(`[Orchestration] Skip notify: assignment status is ${savedAssignment.status}. io object present: ${!!io}`);
            if (savedAssignment.status === 'Pending' && !io) {
                logger.error("[Orchestration] CRITICAL: io object is NULL! Socket notifications will not work.");
            }
        }
    } catch (saveError) {
        logger.error("[Orchestration] CRITICAL: Failed to save assignment:", saveError);
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
