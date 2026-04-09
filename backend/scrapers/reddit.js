const { performRealSearch } = require('./utils');

async function searchProfiles(query, onLeadFound) {
    return await performRealSearch('reddit', query, onLeadFound);
}

module.exports = { searchProfiles };
