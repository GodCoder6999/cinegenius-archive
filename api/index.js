require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Enable CORS for Vercel
app.use(cors({ origin: '*' }));
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// 2. BULLETPROOF JSON PARSER
function cleanJSON(text) {
    try {
        console.log("Raw Output:", text);
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstSquare = clean.indexOf('[');
        const lastSquare = clean.lastIndexOf(']');
        const firstCurly = clean.indexOf('{');
        const lastCurly = clean.lastIndexOf('}');
        
        if (firstSquare !== -1 && lastSquare !== -1) return JSON.parse(clean.substring(firstSquare, lastSquare + 1));
        if (firstCurly !== -1 && lastCurly !== -1) return JSON.parse(clean.substring(firstCurly, lastCurly + 1));
        return JSON.parse(clean);
    } catch (e) {
        console.error("JSON Parse Error:", e.message);
        return []; 
    }
}

// --- ROUTE 1: SMART SEARCH (Optimized for Speed) ---
app.post('/api/smart-search', async (req, res) => {
    try {
        if (!GROQ_API_KEY) return res.status(500).json({ error: "Missing Groq Key" });

        const { refTitle, userPrompt, type, exclude = [] } = req.body;
        
        // LIMIT: Asking for 6 items prevents Vercel 10s Timeout
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a film curator. Recommend 6 ${type === 'tv' ? 'Series' : 'Movies'}. 
                    STRICT: Output ONLY raw JSON. No Markdown.
                    Format: [ { "title": "Title", "reason": "Short reason", "score": 90 } ]`
                },
                { role: "user", content: `Ref: "${refTitle}". Note: "${userPrompt}". Exclude: ${exclude.join(',')}` }
            ],
            temperature: 0.6,
            max_tokens: 800 // Hard limit to ensure speed
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
            model: "llama-3.3-70b-versatile",
            messages: [{
                role: "system",
                content: `Analyze "${title}" (${type}). Output ONLY raw JSON.
                Format: { "plot_twist": "Spoiler", "cultural_impact": "Impact", "budget_est": "N/A", "revenue_est": "N/A", "status_verdict": "Hit", "tagline_ai": "Tagline" }`
            }],
            temperature: 0.3,
            max_tokens: 500
        };

        const response = await axios.post(GROQ_URL, payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });

        res.json(cleanJSON(response.data.choices[0].message.content));
    } catch (error) {
        res.json({ tagline_ai: "System Offline" });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server on ${PORT}`));
}

module.exports = app;
