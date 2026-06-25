const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. YOUR EXACT CREDENTIALS FROM THE CONSOLE
const API_KEY = "pmx_493a57b733ca300414b25ec9846237a8"; 
const SCRAPER_ID = "ef153e5c-4464-4a87-802d-623cc602c762"; 

const headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Dashboard Homepage on Render
app.get('/', async (req, res) => {
    try {
        // Fetch the list using your exact verified URL path format
        const instUrl = `https://api.parse.bot/scraper/${SCRAPER_ID}/list_institutions?page=1`;
        const response = await axios.get(instUrl, { headers });
        const totalPages = response.data.last_page || 1;

        let html = `
            <div style="font-family:sans-serif; padding:20px; max-width:500px; margin:auto; text-align:center;">
                <h2 style="color:#1e3a8a;">JAMB Brochure Extraction Hub</h2>
                <p style="color:#4b5563;">Download your CBT JSON chunks directly to your phone storage.</p>
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
        `;

        for (let i = 1; i <= totalPages; i++) {
            html += `<a href="/dump?page=${i}" style="padding:14px; background:#10b981; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">Download Part ${i}</a>`;
        }

        html += `</div></div>`;
        res.send(html);
    } catch (err) {
        res.status(500).send(`Authentication/Connection Error: ${err.message}. Check your API Key in Acode.`);
    }
});

// Core Dump Endpoint matching your verified route naming layout
app.get('/dump', async (req, res) => {
    const targetPage = req.query.page || 1;
    console.log(`🚀 Processing Page Batch ${targetPage}...`);
    const pageDatabase = {};

    try {
        const instUrl = `https://api.parse.bot/scraper/${SCRAPER_ID}/list_institutions?page=${targetPage}`;
        const instResponse = await axios.get(instUrl, { headers });
        const institutions = instResponse.data.data || [];

        for (const inst of institutions) {
            const instId = inst.institution_id;
            if (!instId) continue;

            try {
                // Queries each school's brochure courses using the matching parameters
                const courseUrl = `https://api.parse.bot/scraper/${SCRAPER_ID}/get_institution_courses?institution_id=${instId}`;
                const courseResponse = await axios.get(courseUrl, { headers });
                
                pageDatabase[instId] = {
                    school_info: inst,
                    brochure: courseResponse.data
                };
                console.log(`Successfully pulled: ${inst.name}`);
            } catch (err) {
                console.log(`Skipped details for school ID: ${instId}`);
            }
            await sleep(150); // Safe delay to protect execution flow
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=jamb_brochure_part_${targetPage}.json`);
        return res.send(JSON.stringify(pageDatabase, null, 2));

    } catch (globalError) {
        return res.status(500).json({ error: globalError.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
