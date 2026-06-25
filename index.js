const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: Paste your actual keys from the Parse.bot console here
const API_KEY = "pmx_493a57b733ca300414b25ec9846237a8";
const SCRAPER_ID = "c3981abc-65c0-4c03-b247-e5797ad0ad22"; 

const headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// This endpoint triggers the download when you visit it on your phone
app.get('/dump', async (req, res) => {
    console.log("🚀 Starting database compilation...");
    const masterDatabase = {};
    let currentPage = 1;
    let totalPages = 1;

    try {
        while (currentPage <= totalPages) {
            const instUrl = `https://api.parse.bot/scraper/${SCRAPER_ID}/search_institutions?page=${currentPage}`;
            const instResponse = await axios.get(instUrl, { headers });
            
            if (currentPage === 1) {
                totalPages = instResponse.data.last_page || 1;
            }

            const institutions = instResponse.data.data || [];

            for (const inst of institutions) {
                const instId = inst.institution_id;
                if (!instId) continue;

                try {
                    const courseUrl = `https://api.parse.bot/scraper/${SCRAPER_ID}/get_institution_courses?institution_id=${instId}`;
                    const courseResponse = await axios.get(courseUrl, { headers });
                    
                    masterDatabase[instId] = {
                        school_info: inst,
                        brochure: courseResponse.data
                    };
                } catch (err) {
                    console.log(`Skipped: ${inst.name}`);
                }
                await sleep(200); // Prevent rate limiting
            }
            currentPage++;
        }

        // Send the complete database straight to your phone screen as a downloadable file!
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=jamb_ibass_master_database.json');
        return res.send(JSON.stringify(masterDatabase, null, 2));

    } catch (globalError) {
        return res.status(500).json({ error: globalError.message });
    }
});

app.get('/', (req, res) => res.send("CBT Brochure Engine is running! Go to /dump to download the file."));

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
