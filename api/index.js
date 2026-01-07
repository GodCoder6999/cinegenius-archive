const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
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

app.post('/api/smart-search', async (req, res) => {
    try {
        // NOW ACCEPTING 'genreFilter' FROM FRONTEND
        const { refTitle, userPrompt, type, exclude = [], genreFilter = "" } = req.body;
        
        const excludeText = exclude.length > 0 ? `Do NOT recommend: ${exclude.join(', ')}.` : '';
        
        // NEW: STRICT GENRE INSTRUCTION
        const genreInstruction = genreFilter 
            ? `STRICT CONSTRAINT: The user has selected these genres: [${genreFilter}]. You MUST prioritize results that fit these genres.` 
            : '';

        const systemPrompt = `You are a precise Movie/TV recommendation engine. 
        Your goal is HIGH SIMILARITY and VIBE MATCHING.
        
        Task: Recommend 6 ${type === 'tv' ? 'Series' : 'Movies'}.
        User Vibe/Prompt: "${userPrompt || 'General Recommendation'}".
        Reference Title (if any): "${refTitle || 'None'}".
        
        ${genreInstruction}
        ${excludeText}
        
        STRICT OUTPUT: JSON Array Only. No text. 
        Format: [{"title":"Name","reason":"Why it matches","score":95}]`;

        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Generate recommendations." }
            ],
            temperature: 0.5, 
            max_tokens: 1000
        };
        const response = await axios.post(GROQ_URL, payload, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } });
        res.json(cleanJSON(response.data.choices[0].message.content));
    } catch (error) { res.json([]); }
});

app.post('/api/intel-brief', async (req, res) => {
    try {
        const { title, type } = req.body;
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [{
                role: "system",
                content: `Analyze "${title}" (${type}). Return JSON: {"tagline_ai":"...","plot_twist":"...","cultural_impact":"...","budget_est":"...","revenue_est":"...","status_verdict":"..."}`
            }],
            temperature: 0.3
        };
        const response = await axios.post(GROQ_URL, payload, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } });
        res.json(cleanJSON(response.data.choices[0].message.content));
    } catch (error) { res.json({ tagline_ai: "Data Unavailable" }); }
});

module.exports = app;
