
async function test() {
    try {
        const response = await fetch('http://localhost:5000/api/symptoms/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                symptoms: 'Sever headache and high fever',
                latitude: 30.3574,
                longitude: 76.3631,
                wantAmbulance: true
            })
        });

        const data = await response.json();
        console.log("\n--- API RESPONSE ---");
        console.log(JSON.stringify(data.orchestration, null, 2));

        const orch = data.orchestration;
        console.log("\n--- Verification ---");
        console.log("Hospital Contact:", orch.hospital?.contact);
        console.log("Hospital Address:", orch.hospital?.location?.address);

    } catch (err) {
        console.error("Test Error:", err.message);
    }
}

test();
