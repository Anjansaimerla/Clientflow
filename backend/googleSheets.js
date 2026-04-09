const axios = require('axios');

/**
 * Service to handle Google Sheets interactions via Apps Script Web App
 */
async function saveLeadToSheet(lead) {
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    
    if (!scriptUrl) {
        console.warn('GOOGLE_SCRIPT_URL is not configured. Cloud save skipped.');
        return false;
    }

    try {
        console.log(`Attempting to save lead to Google Sheets via Web App...`);
        
        const response = await axios.post(scriptUrl, {
            lead: {
                name: lead.name,
                username: lead.username,
                platform: lead.platform,
                bio: lead.bio,
                link: lead.link
            }
        });

        if (response.data && response.data.status === 'success') {
            console.log('Successfully saved lead to Google Sheets.');
            return true;
        } else {
            console.warn('Google Sheets Web App returned an error:', response.data);
            return false;
        }
    } catch (error) {
        console.error('Error saving to Google Sheets Web App:', error.message);
        return false;
    }
}

module.exports = { saveLeadToSheet };
