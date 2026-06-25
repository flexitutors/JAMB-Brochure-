const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Paste your keys from the Parse.bot console
const API_KEY = "pmx_493a57b733ca300414b25ec9846237a8";
const SCRAPER_ID = "c3981abc-65c0-4c03-b247-e5797ad0ad22"; 

const headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// UI Hub for downloading page-by-page directly on mobile chrome
app.get('/', async (req, res) => {
    try {
        const checkUrl = `https://api.parse.bot/scraper/${SCRAPER_ID}/search_institutions?page=1`;
        const checkRes = await axios.get(checkUrl, { headers });
        const totalPages = checkRes.data.last_page || 1;

        let html = `
            <div style="font-family:sans-serif; padding:20px; max-width:500px; margin:auto; text-align:center;">
                <h2 style="color:#1e3a8a;">JAMB Brochure Sync Panel</h2>
                <p style="color:#4b5563;">Download your CBT files in parts below. No timeouts, no crashes!</p>
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
        `;

        for (let i = 1; i <= totalPages; i++) {
            html += `<a href="/dump?page=${i}" style="padding:14px; background:#2563eb; color:white; text-decoration:none; border-radius:8px; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Download Part ${i}</a>`;
        }

        html += `</div></div>`;
        res.send(html);
    } catch (err) {
        res.status(500).send(`Connection Error: ${err.message}. Check your API Key & Scraper ID.`);
    }
});

// Fixed 404 Endpoint with correct string evaluation variables
app.get('/dump', async (req, res) => {
    const targetPage = req.query.page || 1;
    console.log(`🚀 Compiling Part page ${targetPage}...`);
    
    const pageDatabase = {};

    try {
        const instUrl = `https://api.parse.bot/scraper/${SCRAPER_ID}/search_institutions?page=${targetPage}`;
        const instResponse = await axios.get(instUrl, { headers });
        const institutions = instResponse.data.data || [];

        for (const inst of institutions) {
            const instId = inst.institution_id;
            if (!instId) continue;

            try {
                // FIXED: Added the missing '$' before template string evaluation parameter
                const courseUrl = `https://api.parse.bot/scraper/${SCRAPER_ID}/get_institution_courses?institution_id=${instId}`;
                const courseResponse = await axios.get(courseUrl, { headers });
                
                pageDatabase[instId] = {
                    school_info: inst,
                    brochure: courseResponse.data
                };
            } catch (err) {
                console.log(`Skipped item evaluation for: ${inst.name}`);
            }
            await sleep(150); // Safe delay step execution
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=jamb_brochure_part_${targetPage}.json`);
        return res.send(JSON.stringify(pageDatabase, null, 2));

    } catch (globalError) {
        return res.status(500).json({ error: globalError.message });
    }
});

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
