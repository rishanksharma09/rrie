import twilio from "twilio";
import { analyzeSymptomsLogic } from "./symptomController.js";

export const handleWhatsApp = async (req, res) => {
    try {
        const incomingMsg = req.body?.Body;

        console.log("📩 WhatsApp message received:", incomingMsg);

        if (!incomingMsg) {
            const twiml = new twilio.twiml.MessagingResponse();
            twiml.message("⚠️ Please describe your symptoms.");
            return sendTwiml(res, twiml);
        }

        // Temporary default location (until WhatsApp location sharing is added)
        const latitude = 30.3556;
        const longitude = 76.3692;

        const result = await analyzeSymptomsLogic({
            symptoms: incomingMsg,
            latitude,
            longitude,
            wantAmbulance: true,
            user: null
        });

        const twiml = new twilio.twiml.MessagingResponse();

        let message = `🚨 EMERGENCY ANALYSIS\n\n`;
        message += `Type: ${result.emergency_type}\n`;
        message += `Severity: ${(result.severity || "").toUpperCase()}\n`;
        message += `Confidence: ${((result.confidence || 0) * 100).toFixed(0)}%\n`;
        message += `Reason: ${result.reasoning}\n\n`;

        if (result.orchestration?.hospital) {
            message += `🏥 ASSIGNED HOSPITAL\n`;
            message += `${result.orchestration.hospital.name}\n`;
            message += `📞 ${result.orchestration.hospital.contact}\n`;
            message += `📍 ${result.orchestration.hospital.address || "Location available on dashboard"}\n\n`;
        }

        if (result.orchestration?.ambulance) {
            message += `🚑 AMBULANCE STATUS\n`;
            message += `${result.orchestration.ambulance.message || "Dispatch initiated"}\n\n`;
        }

        if (result.orchestration?.alternatives?.length > 0) {
            message += `📋 OTHER OPTIONS\n`;
            result.orchestration.alternatives.slice(0, 2).forEach((h, i) => {
                message += `${i + 1}. ${h.name}\n`;
                message += `📞 ${h.contact}\n\n`;
            });
        }

        message += `Stay calm. Help is being coordinated.`;

        twiml.message(message);

        return sendTwiml(res, twiml);

    } catch (error) {
        console.error("❌ WhatsApp Processing Error:", error);

        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message("⚠️ Unable to process symptoms. Please try again.");

        return sendTwiml(res, twiml);
    }
};

function sendTwiml(res, twiml) {
    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(twiml.toString());
}