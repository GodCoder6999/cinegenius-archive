require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so your frontend can talk to this backend
app.use(cors());
app.use(express.json());

// Load API Key from Vercel Environment Variables
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Helper function to clean AI response into valid JSON
function cleanJSON(text) {
    try {
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) return JSON.parse(arrayMatch[0]);
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) return JSON.parse(objectMatch[0]);
        throw new Error("No JSON structure found");
    } catch (e) { 
        console.error("❌ JSON Parse Failed:", text);
        return []; 
    }
}

// --- ROUTE 1: SMART CURATE (Handles "Load More" Logic) ---
app.post('/api/smart-search', async (req, res) => {
    try {
        const { refTitle, userPrompt, type, exclude = [] } = req.body; 
        
        // 1. Build the exclusion instruction if titles are passed
        const excludeString = exclude.length > 0 
            ? `\n\nCRITICAL INSTRUCTION: Do NOT recommend any of these titles (they are already shown): ${exclude.join(', ')}.` 
            : '';

        // 2. Prepare the AI Payload
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a film curator. Recommend 12 ${type === 'tv' ? 'Series' : 'Movies'}. 
                    STRICT JSON format only. 
                    Output Array: [ { "title": "Exact Title", "reason": "Short punchy reason", "score": 85 } ].
                    ${excludeString}` // <--- This prevents duplicates
                },
                { role: "user", content: `Reference: "${refTitle}". User Notes: "${userPrompt}".` }
            ],
            temperature: 0.7 // Slightly higher creativity for "Load More" requests
        };

        // 3. Call Groq AI
        const response = await axios.post(GROQ_URL, payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });

        // 4. Return Clean Data
        const data = cleanJSON(response.data.choices[0].message.content);
        res.json(data);

    } catch (error) {
        console.error("AI Error:", error.message);
        res.json([]); // Return empty array on error to prevent crash
    }
});

// --- ROUTE 2: INTEL BRIEF (Analysis) ---
app.post('/api/intel-brief', async (req, res) => {
    try {
        const { title, type } = req.body;
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a classified archivist. Return a SINGLE JSON object. Plot twist fully revealed. 
                    Format: { "plot_twist": "...", "cultural_impact": "...", "budget_est": "...", "revenue_est": "...", "status_verdict": "Hit/Flop/Cult", "tagline_ai": "..." }`
                },
                { role: "user", content: `Analyze: "${title}" (${type})` }
            ],
            temperature: 0.3
        };
        const response = await axios.post(GROQ_URL, payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });
        const data = cleanJSON(response.data.choices[0].message.content);
        res.json(data);
    } catch (error) {
        res.json({ plot_twist: "Data Redacted (Error)", tagline_ai: "System Offline" });
    }
});

// Start Server (Local Development Only)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Smart Server running locally at http://localhost:${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
