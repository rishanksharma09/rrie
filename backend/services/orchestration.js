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
export const orchestrateReferral = async (triageData, patientLocation, referralId) => {
    console.log(`[Orchestration] Starting for Referral ${referralId}`);
    const { emergency_type, severity } = triageData;

    // 1. Get Requirements
    const requirements = getRequirements(emergency_type);
    console.log(`[Orchestration] Requirements:`, requirements);

    // 2. Fetch Active Facilities
    // We only want 'active' hospitals (not 'offline')
    // 'overloaded' might be considered but with heavy penalty? 
    // User logic says "Penalize facilities with low ICU availability", implies we fetch even if low.
    // Let's exclude 'offline' only.
    const hospitals = await Hospital.find({ status: { $ne: 'offline' } });

    // 3. Filter & Score Hospitals
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

        // Distance
        const distance = calculateDistance(
            patientLocation.lat, patientLocation.lng,
            hospital.location.lat, hospital.location.lng
        );

        // ICU Availability Score (Higher is better)
        const icuAvailable = hospital.beds.icuAvailable || 0;

        // Status Penalty
        const statusPenalty = hospital.status === 'overloaded' ? 50 : 0; // Huge penalty for overloaded

        // Weighted Score Calculation (Lower score is "cost", so we want MINIMUM cost)
        // Cost = (Distance * Weight) + (100 - ICU_Capacity_Scaled) + Penalty

        // Weights:
        // Distance: High importance for critical cases.
        // ICU: Important if severity is high.

        const distanceWeight = 2.0;
        const icuWeight = 5.0; // Benefit of having ICU is subtracted from cost

        // Make score "fitness" where HIGHER is BETTER? 
        // User said "Compute a weighted referral score".
        // Let's use a standard "Score = Quality / Cost" or similar logic.

        // Approach: Higher Score is Better.
        // Base Score = 100
        // - Distance * 2 (lose 2 points per km)
        // + ICU Available * 5 (gain 5 points per free bed)
        // - Penalty (Overloaded = -50)

        let score = 100 - (distance * 2) + (icuAvailable * 5) - statusPenalty;

        return {
            id: hospital._id,
            name: hospital.name,
            eligible: true,
            location: hospital.location,
            distance: parseFloat(distance.toFixed(2)),
            icuAvailable,
            status: hospital.status,
            score: parseFloat(score.toFixed(2))
        };
    }).filter(h => h.eligible);

    // Sort by Score Descending
    scoredHospitals.sort((a, b) => b.score - a.score);

    const bestHospital = scoredHospitals.length > 0 ? scoredHospitals[0] : null;

    if (!bestHospital) {
        console.warn("[Orchestration] No eligible hospital found!");
        return { error: "No eligible facility found within range matching capabilities." };
    }

    // 4. Find Nearest Ambulance
    // Fetch 'Available' ambulances
    const ambulances = await Ambulance.find({ status: 'Available' });

    // Map distances
    const scoredAmbulances = ambulances.map(amb => {
        // Ambulance location is GeoJSON: [lng, lat]
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

    const bestAmbulance = scoredAmbulances.length > 0 ? scoredAmbulances[0] : null;

    // 5. Create Assignment Record
    const assignment = new Assignment({
        referralId,
        patientLocation,
        triage: triageData,
        assignedHospital: {
            id: bestHospital.id,
            name: bestHospital.name,
            location: bestHospital.location,
            distance: bestHospital.distance,
            score: bestHospital.score,
            reason: `Best capability match with score ${bestHospital.score} (Dist: ${bestHospital.distance}km, ICU: ${bestHospital.icuAvailable})`
        },
        assignedAmbulance: bestAmbulance ? {
            id: bestAmbulance.id,
            vehicleNumber: bestAmbulance.vehicleNumber,
            distance: bestAmbulance.distance,
            eta: `${Math.ceil((bestAmbulance.distance / 40) * 60)} mins` // Crude ETA: 40km/h avg speed
        } : null,
        status: bestAmbulance ? 'Dispatched' : 'Pending'
    });

    await assignment.save();
    console.log(`[Orchestration] Assignment Saved: ${assignment._id}`);

    // 6. Return Decision
    return {
        success: true,
        assignmentId: assignment._id,
        hospital: bestHospital,
        ambulance: bestAmbulance || { message: "No active ambulances available." },
        alternatives: scoredHospitals.slice(1, 4) // Return next 3 best options
    };
};
