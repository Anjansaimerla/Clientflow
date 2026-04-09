const { performRealSearch } = require('./utils');

async function searchProfiles(query, onLeadFound) {
    return await performRealSearch('x', query, onLeadFound);
}

module.exports = { searchProfiles };
