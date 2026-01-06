require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function cleanJSON(text) {
    try {
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstSquare = clean.indexOf('['); const lastSquare = clean.lastIndexOf(']');
        const firstCurly = clean.indexOf('{'); const lastCurly = clean.lastIndexOf('}');
        if (firstSquare !== -1 && lastSquare !== -1) return JSON.parse(clean.substring(firstSquare, lastSquare + 1));
        if (firstCurly !== -1 && lastCurly !== -1) return JSON.parse(clean.substring(firstCurly, lastCurly + 1));
        return JSON.parse(clean);
    } catch (e) { return []; }
}

// --- ROUTE 1: SMART SEARCH (Curate/Dream) ---
app.post('/api/smart-search', async (req, res) => {
    try {
        const { refTitle, userPrompt, type, exclude = [] } = req.body;
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a film curator. Recommend 6 ${type === 'tv' ? 'Series' : 'Movies'}. 
                    STRICT JSON Array Only. No Markdown. Format: [{"title":"Name","reason":"Why","score":90}]`
                },
                { role: "user", content: `Ref: "${refTitle}". Note: "${userPrompt}".` }
            ],
            temperature: 0.6,
            max_tokens: 1000 // Prevents timeout
        };

        const response = await axios.post(GROQ_URL, payload, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } });
        res.json(cleanJSON(response.data.choices[0].message.content));
    } catch (error) { res.json([]); }
});

// --- ROUTE 2: INTEL BRIEF ---
app.post('/api/intel-brief', async (req, res) => {
    try {
        const { title, type } = req.body;
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: `Analyze "${title}" (${type}). Return JSON: { "tagline_ai": "...", "plot_twist": "...", "cultural_impact": "...", "budget_est": "...", "revenue_est": "...", "status_verdict": "..." }` }],
            temperature: 0.3
        };
        const response = await axios.post(GROQ_URL, payload, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } });
        res.json(cleanJSON(response.data.choices[0].message.content));
    } catch (error) { res.json({ tagline_ai: "Data Unavailable" }); }
});

module.exports = app;
