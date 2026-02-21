import twilio from "twilio";
import axios from "axios";

const MessagingResponse = twilio.twiml.MessagingResponse;

export const handleWhatsApp = async (req, res) => {
    try {
        const message = req.body.Body;
        const latitude = req.body.Latitude || null;
        const longitude = req.body.Longitude || null;

        console.log("Incoming:", message);

        if (!message) {
            return res.status(400).send("No message");
        }

        // IMPORTANT:
        // Since you're local, call LOCAL endpoint not PUBLIC_URL
        const apiResponse = await axios.post(
            "http://localhost:5000/api/symptoms/analyze",
            {
                symptoms: message,
                latitude,
                longitude,
                wantAmbulance: true
            }
        );

        const data = apiResponse.data;

        let reply = `
Emergency: ${data.emergency_type}
Severity: ${data.severity}
Confidence: ${data.confidence}
        `;

        if (data.orchestration?.hospital) {
            reply += `

Recommended Hospital:
${data.orchestration.hospital.name}
ETA: ${data.orchestration.hospital.eta} mins
            `;
        }

        const twiml = new MessagingResponse();
        twiml.message(reply);

        res.writeHead(200, { "Content-Type": "text/xml" });
        res.end(twiml.toString());

    } catch (error) {
        console.error("WhatsApp Error:", error.message);
        res.status(500).send("Server Error");
    }
};