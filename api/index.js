require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Enable CORS for all
app.use(cors({ origin: '*' }));
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// 2. The Fix: "Bulletproof" JSON Cleaner
function cleanJSON(text) {
    console.log("Raw AI Response:", text); // Logs to Vercel
    try {
        // Remove markdown code blocks (```json ... ```)
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Find the first '[' and last ']' to extract just the array
        const firstSquare = clean.indexOf('[');
        const lastSquare = clean.lastIndexOf(']');
        
        if (firstSquare !== -1 && lastSquare !== -1) {
            return JSON.parse(clean.substring(firstSquare, lastSquare + 1));
        }
        // If no array found, try parsing the whole thing
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error:", e.message);
        return []; // Returns empty array instead of crashing
    }
}

// --- ROUTE 1: SMART SEARCH ---
app.post('/api/smart-search', async (req, res) => {
    try {
        const { refTitle, userPrompt, type, exclude = [] } = req.body;
        
        const payload = {
            model: "mixtral-8x7b-32768", // Faster & better at JSON than Llama
            messages: [
                {
                    role: "system",
                    content: `You are a film curator. Recommend 10 ${type === 'tv' ? 'Series' : 'Movies'}. 
                    STRICT INSTRUCTION: Output ONLY a raw JSON Array. No markdown. No intro text.
                    Format: [ { "title": "Title", "reason": "Reason", "score": 90 } ]`
                },
                { role: "user", content: `Ref: ${refTitle}. Mood: ${userPrompt}. Exclude: ${exclude.join(',')}` }
            ],
            temperature: 0.5
        };

        const response = await axios.post(GROQ_URL, payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });

        const data = cleanJSON(response.data.choices[0].message.content);
        res.json(data);

    } catch (error) {
        console.error("API Error:", error.message);
        res.json([]); 
    }
});

// --- ROUTE 2: INTEL BRIEF ---
app.post('/api/intel-brief', async (req, res) => {
    try {
        const { title, type } = req.body;
        const payload = {
            model: "mixtral-8x7b-32768",
            messages: [
                {
                    role: "system",
                    content: `You are a film archivist. Output ONLY raw JSON. No markdown.
                    Format: { "plot_twist": "...", "cultural_impact": "...", "budget_est": "...", "revenue_est": "...", "status_verdict": "...", "tagline_ai": "..." }`
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
        res.json({ tagline_ai: "Analysis Unavailable" });
    }
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
