import Hospital from '../models/Hospital.js';
import Ambulance from '../models/Ambulance.js';
import Assignment from '../models/Assignment.js';

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
    const reqs = {
        'Cardiac': {
            specialists: ['cardiologist'],
            equipment: ['cathLab'],
            minTraumaLevel: 3 // e.g., lower number is better/higher capability? Or purely feature based. 
            // Let's stick to explicit capability checks for now.
        },
        'Trauma': {
            specialists: ['orthopedic', 'neurologist'],
            equipment: ['ctScan', 'ventilator'],
            beds: ['icuAvailable']
        },
        'Respiratory': {
            equipment: ['ventilator'],
            beds: ['icuAvailable']
        },
        'Stroke': {
            specialists: ['neurologist'],
            equipment: ['ctScan', 'mri']
        },
        'Pediatric': {
            specialists: ['pediatrician']
        },
        'Default': {}
    };
    return reqs[emergencyType] || reqs['Default'];
};

// --- Main Orchestration Function ---
export const orchestrateReferral = async (triageData, patientLocation, referralId, wantAmbulance, patientId) => {
    const { emergency_type, severity } = triageData;

    // 1. Get Requirements
    console.log(`[Orchestration] Referral ${referralId} - Step 1: Getting Requirements...`);
    const requirements = getRequirements(emergency_type);
    console.log(`[Orchestration] Requirements for ${emergency_type}:`, JSON.stringify(requirements));

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

        if (!capabilityMatch) {
            return { id: hospital._id, eligible: false, reason: `Missing: ${missingCapabilities.join(', ')}` };
        }

        // --- 3b. Scoring Logic ---
        const distance = calculateDistance(
            patientLocation.lat, patientLocation.lng,
            hospital.location.lat, hospital.location.lng
        );

        const icuAvailable = hospital.beds.icuAvailable || 0;
        const statusPenalty = hospital.status === 'overloaded' ? 50 : 0;

        let score = 100 - (distance * 2) + (icuAvailable * 5) - statusPenalty;

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

    // 4. Find Nearest Ambulance (Conditional)
    console.log(`[Orchestration] Referral ${referralId} - Step 4: Finding ambulance (Requested: ${wantAmbulance})...`);
    let bestAmbulance = null;
    if (wantAmbulance) {
        // Fetch 'Available' ambulances
        const ambulances = await Ambulance.find({ status: 'Available' });

        // Map distances
        const scoredAmbulances = ambulances.map(amb => {
            const ambLat = amb.location.coordinates[1];
            const ambLng = amb.location.coordinates[0];

            const dist = calculateDistance(
                patientLocation.lat, patientLocation.lng,
                ambLat, ambLng
            );

            return {
                id: amb._id,
                vehicleNumber: amb.vehicleNumber,
                type: amb.type,
                distance: parseFloat(dist.toFixed(2)),
                location: { lat: ambLat, lng: ambLng }
            };
        });

        // Sort by Distance Ascending (Nearest first)
        scoredAmbulances.sort((a, b) => a.distance - b.distance);
        bestAmbulance = scoredAmbulances.length > 0 ? scoredAmbulances[0] : null;
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
            assignedAmbulance: bestAmbulance ? {
                id: bestAmbulance.id,
                vehicleNumber: bestAmbulance.vehicleNumber,
                distance: bestAmbulance.distance,
                eta: `${Math.ceil((bestAmbulance.distance / 40) * 60)} mins`
            } : null,
            status: bestAmbulance ? 'Dispatched' : 'Referral Only'
        });

        const savedAssignment = await assignment.save();
        assignmentId = savedAssignment._id;
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
