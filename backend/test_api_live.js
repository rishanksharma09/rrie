
import axios from 'axios';

async function testApi() {
    try {
        console.log("Calling API...");
        const response = await axios.post('http://localhost:5000/api/symptoms/analyze', {
            symptoms: 'Sever headache and high fever',
            latitude: 30.3574,
            longitude: 76.3631,
            wantAmbulance: true
        });

        console.log("\n--- API RESPONSE ---");
        console.log(JSON.stringify(response.data.orchestration, null, 2));

        const orch = response.data.orchestration;
        console.log("\n--- Verification ---");
        console.log("Hospital Contact:", orch.hospital?.contact);
        console.log("Hospital Address:", orch.hospital?.location?.address);

    } catch (err) {
        console.error("API Error:", err.response?.data || err.message);
    }
}

testApi();
