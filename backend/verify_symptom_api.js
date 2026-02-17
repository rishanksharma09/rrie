import fetch from 'node-fetch';

const verifySymptomApi = async () => {
    const url = 'http://localhost:5000/api/symptoms/analyze';
    const payload = {
        symptoms: "I have severe chest pain and sweating. I feel like passing out.",
        latitude: 29.6800,
        longitude: 76.9900
    };

    try {
        console.log("Sending request to Symptom API...");
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log("--------------------------------------------------");
        console.log("API Response Status:", response.status);
        console.log("Emergency Type:", data.emergency_type);
        console.log("Severity:", data.severity);

        if (data.orchestration) {
            console.log("Orchestration Success:", data.orchestration.success);
            console.log("Recommended Hospital:", data.orchestration.hospital?.name);
            console.log("Assigned Ambulance:", data.orchestration.ambulance?.vehicleNumber);

            if (data.orchestration.alternatives && data.orchestration.alternatives.length > 0) {
                console.log("Alternatives Found:", data.orchestration.alternatives.length);
                data.orchestration.alternatives.forEach(alt => {
                    console.log(`- ${alt.name}: ${alt.distance}km (Score: ${alt.score}, Status: ${alt.status})`);
                });
            } else {
                console.warn("No alternatives returned.");
            }
        } else {
            console.error("Orchestration field missing in response!");
        }
        console.log("--------------------------------------------------");

    } catch (error) {
        console.error("Verification Error:", error);
    }
};

verifySymptomApi();
