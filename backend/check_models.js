import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    console.log("Listing models via REST API...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log(`Details: ${text}`);
            return;
        }
        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            const names = data.models.map(m => m.name).join('\n');
            fs.writeFileSync('models_clean.txt', names, 'utf8');
            console.log("Models written to models_clean.txt");
        } else {
            console.log("No models found in response.");
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

listModels();
