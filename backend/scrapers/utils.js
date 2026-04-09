const axios = require('axios');

/**
 * Discovery logic using SerpApi (Google Search Engine)
 */
async function performRealSearch(platform, query, onLeadFound) {
    console.log(`Performing live search for ${platform}: ${query}`);
    
    if (!process.env.SERPAPI_KEY) {
        console.error('SERPAPI_KEY is missing from .env');
        return;
    }

    try {
        const platformMap = {
            linkedin: 'site:linkedin.com/in/',
            x: 'site:x.com/',
            reddit: 'site:reddit.com/user/'
        };
        
        const siteQuery = `${platformMap[platform.toLowerCase()]} "${query}"`;
        
        // Using SerpApi's Google Search API
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                engine: 'google',
                q: siteQuery,
                api_key: process.env.SERPAPI_KEY,
                num: 10
            }
        });

        if (response.data.organic_results) {
            for (const result of response.data.organic_results) {
                // Parsing real results from SerpApi
                const lead = {
                    name: result.title.split(' - ')[0].split(' | ')[0].trim(),
                    bio: result.snippet || 'No bio available',
                    link: result.link,
                    // Try to extract username from link
                    username: result.link.split('/').pop().replace(/\?.*/, '') || 'n/a',
                    platform: platform.toUpperCase() === 'X' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)
                };
                
                onLeadFound(lead);
                // Slight delay for real-time streaming feel
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        } else {
             console.log(`No results found for ${platform}`);
        }
    } catch (error) {
        console.error(`Real search failed for ${platform}:`, error.message);
        // NO FALLBACK TO MOCK PER USER REQUEST
    }
}

module.exports = { performRealSearch };
