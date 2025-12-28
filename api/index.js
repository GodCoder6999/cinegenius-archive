require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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

// 1. UPDATED CURATE / MOOD ENDPOINT
app.post('/api/smart-search', async (req, res) => {
    try {
        const { refTitle, userPrompt, type, exclude = [] } = req.body; 
        // Tell the AI exactly what to ignore
        const excludeString = exclude.length > 0 ? `\n\nDO NOT recommend these titles: ${exclude.join(', ')}.` : '';

        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a film curator. Recommend 12 ${type === 'tv' ? 'Series' : 'Movies'}. STRICT JSON format. Array: [ { "title": "Name", "reason": "Why", "score": 90 } ].${excludeString}`
                },
                { role: "user", content: `Ref: "${refTitle}". Note: "${userPrompt}".` }
            ],
            temperature: 0.6
        };
        const response = await axios.post(GROQ_URL, payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });
        const data = cleanJSON(response.data.choices[0].message.content);
        res.json(data);
    } catch (error) {
        res.json([]); 
    }
});

app.post('/api/intel-brief', async (req, res) => {
    try {
        const { title, type } = req.body;
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a classified archivist. Return a SINGLE JSON object. Plot twist fully. { "plot_twist": "...", "cultural_impact": "...", "budget_est": "...", "revenue_est": "...", "status_verdict": "...", "tagline_ai": "..." }`
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
        res.json({ plot_twist: "Data Redacted (Error)" });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Smart Server running locally at http://localhost:${PORT}`);
    });
}

module.exports = app;
