require('dotenv').config(); // Loads variables from .env file into process.env
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000; // Uses port from host or 3000 locally

app.use(cors());
app.use(express.json());

// =========================================================
// 🔒 SECURITY: AUTHENTICATION
// =========================================================
// Do NOT paste your key here. Use process.env to stay safe on GitHub.
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// --- ULTIMATE JSON CLEANER ---
// Prevents crashes if the AI adds conversational text before/after JSON
function cleanJSON(text) {
    try {
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) return JSON.parse(arrayMatch[0]);

        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) return JSON.parse(objectMatch[0]);

        throw new Error("No JSON structure found in AI response");
    } catch (e) { 
        console.error("❌ JSON Parse Failed. Raw AI Text:", text);
        return []; 
    }
}

// 1. CURATE / MOOD ENDPOINT
app.post('/api/smart-search', async (req, res) => {
    try {
        const { refTitle, userPrompt, type } = req.body;
        console.log(`⚡ AI Thinking... searching for matches to "${refTitle || 'Mood'}"...`);
        
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a film curator. Recommend 12 ${type === 'tv' ? 'Series' : 'Movies'}. 
                    STRICT JSON format. Array of objects: [ { "title": "Name", "reason": "Why", "score": 90 } ].`
                },
                { role: "user", content: `Ref: "${refTitle}". Note: "${userPrompt}".` }
            ],
            temperature: 0.6
        };

        const response = await axios.post(GROQ_URL, payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });
        const data = cleanJSON(response.data.choices[0].message.content);
        
        // --- TALK BACK LOGGING ---
        if (data.length > 0) {
            console.log(`✅ Results found! Sending ${data.length} titles for: "${refTitle || 'Mood'}"`);
        } else {
            console.log(`⚠️ AI found no results for that specific request.`);
        }

        res.json(data);

    } catch (error) {
        console.error("❌ Curate Error:", error.response?.status || error.message);
        res.json([]); 
    }
});

// 2. INTEL ENDPOINT
app.post('/api/intel-brief', async (req, res) => {
    try {
        const { title, type } = req.body;
        console.log(`🕵️ Intel Deep Dive on: "${title}"...`);

        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a classified archivist. Return a SINGLE JSON object. 
                    Detail the plot twist fully and truthfully.
                    {
                      "plot_twist": "Detailed spoiler paragraph",
                      "cultural_impact": "Pop culture history",
                      "budget_est": "e.g. $100M",
                      "revenue_est": "e.g. $500M",
                      "status_verdict": "Blockbuster/Cult Classic",
                      "tagline_ai": "Catchy phrase"
                    }`
                },
                { role: "user", content: `Analyze: "${title}" (${type})` }
            ],
            temperature: 0.3
        };

        const response = await axios.post(GROQ_URL, payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });
        const data = cleanJSON(response.data.choices[0].message.content);
        
        console.log(`✅ Intel Retrieved for "${title}".`);
        res.json(data);

    } catch (error) {
        console.error("❌ Intel Error:", error.response?.status || error.message);
        res.json({ plot_twist: "Data Redacted (Error)" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Smart Server running at http://localhost:${PORT}`);
});