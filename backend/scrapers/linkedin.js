const { performRealSearch } = require('./utils');

async function searchProfiles(query, onLeadFound) {
    // We use the shared search logic with platform-specific context
    return await performRealSearch('linkedin', query, onLeadFound);
}

module.exports = { searchProfiles };
