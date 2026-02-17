import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const analyzeSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms) {
            return res.status(400).json({ message: "Symptoms are required" });
        }

        const prompt = `
        Analyze the following medical symptoms and provide a structured JSON response.
        Symptoms: "${symptoms}"

        IMPORTANT RULES:

- DO NOT diagnose diseases.
- DO NOT recommend hospitals.
- DO NOT recommend ambulances.
- DO NOT add extra fields.
- Return ONLY valid JSON.
- Keep reasoning to ONE short sentence.

--------------------------------

Classify the input into:

emergency_type (one of):
- cardiac
- stroke
- trauma
- respiratory
- general

severity (one of):
- low
- medium
- high

confidence:
- number between 0 and 1

risk_flags (array of zero or more from):
- time_sensitive
- heavy_bleeding
- airway_risk
- neurological_deficit
- cardiac_symptoms
- shock_risk
- breathing_distress

reasoning:
- one short sentence explaining the classification

--------------------------------

Return EXACTLY this JSON format:

{
  "emergency_type": "...",
  "severity": "...",
  "confidence": 0.0,
  "risk_flags": [],
  "reasoning": "..."
}


        `;

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        })

        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content.parts.length > 0) {
            const text = response.candidates[0].content.parts[0].text;
            let jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResponse = JSON.parse(jsonText);

            // --- Orchestration Integration ---
            const { latitude, longitude } = req.body;
            let orchestrationResult = null;

            if (latitude && longitude) {
                try {
                    console.log("Orchestrating referral for location:", latitude, longitude);
                    const mongoose = await import('mongoose');
                    const { orchestrateReferral } = await import('../services/orchestration.js');

                    const referralId = new mongoose.Types.ObjectId();
                    const triageData = {
                        emergency_type: jsonResponse.emergency_type || 'General',
                        severity: jsonResponse.severity || 'Medium',
                        confidence: jsonResponse.confidence || 0.8,
                        risk_flags: jsonResponse.risk_flags || []
                    };
                    const patientLocation = { lat: latitude, lng: longitude };

                    orchestrationResult = await orchestrateReferral(triageData, patientLocation, referralId);
                } catch (orchError) {
                    console.error("Orchestration Failed:", orchError);
                }
            }

            const finalResponse = {
                ...jsonResponse,
                orchestration: orchestrationResult
            };

            console.log(finalResponse);
            res.json(finalResponse);
        } else {
            throw new Error("No candidates or text found in response.");
        }

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        res.status(500).json({ message: "Failed to analyze symptoms", error: error.message });
    }
};
