import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeSymptomsLogic = async ({
    symptoms,
    latitude,
    longitude,
    wantAmbulance,
    user
}) => {
    if (!symptoms) {
        throw new Error("Symptoms are required");
    }

    try {
        const prompt = `
Analyze the following medical symptoms and provide a structured JSON response.
Symptoms: "${symptoms}"

Return ONLY valid JSON in this exact format:

{
  "emergency_type": "cardiac | stroke | trauma | respiratory | general",
  "severity": "low | medium | high",
  "confidence": 0.0,
  "risk_flags": [],
  "reasoning": "one short sentence"
}
`;
        console.log("🔥 NEW SYMPTOM CONTROLLER LOADED");
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json"
            }
        });

        const text = result.response.text();

        if (!text) {
            throw new Error("Empty response from Gemini");
        }

        let jsonResponse;

        try {
            jsonResponse = JSON.parse(
                text.replace(/```json/g, "").replace(/```/g, "").trim()
            );
        } catch (err) {
            console.error("❌ Gemini returned invalid JSON:", text);
            throw new Error("Invalid JSON response from Gemini");
        }

        // Normalize safely
        jsonResponse.emergency_type =
            (jsonResponse.emergency_type || "general").toLowerCase();

        jsonResponse.severity =
            (jsonResponse.severity || "medium").toLowerCase();

        jsonResponse.confidence =
            typeof jsonResponse.confidence === "number"
                ? jsonResponse.confidence
                : 0.8;

        jsonResponse.risk_flags =
            Array.isArray(jsonResponse.risk_flags)
                ? jsonResponse.risk_flags
                : [];

        jsonResponse.reasoning =
            jsonResponse.reasoning ||
            "Classification based on symptom pattern.";

        let orchestrationResult = null;

        if (latitude && longitude) {
            const mongoose = await import("mongoose");
            const { orchestrateReferral } = await import(
                "../services/orchestration.js"
            );

            const referralId = new mongoose.Types.ObjectId();

            const triageData = {
                emergency_type: jsonResponse.emergency_type,
                severity: jsonResponse.severity,
                confidence: jsonResponse.confidence,
                risk_flags: jsonResponse.risk_flags
            };

            const patientLocation = {
                lat: latitude,
                lng: longitude
            };

            const patientId = user?.uid || "anonymous";

            orchestrationResult = await orchestrateReferral(
                triageData,
                patientLocation,
                referralId,
                wantAmbulance,
                patientId
            );
        }

        return {
            ...jsonResponse,
            orchestration: orchestrationResult
        };

    } catch (error) {
        console.error("❌ Symptom Analysis Error:", error);
        throw error;
    }
};
console.log("Loaded Key:", process.env.GEMINI_API_KEY);
console.log("Loaded GEMINI KEY:", process.env.GEMINI_API_KEY);