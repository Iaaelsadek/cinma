const axios = require('axios');
const apiKey = 'afef094e7c0de13c1cac98227a61da4d';

const search = async (query, type) => {
    try {
        const res = await axios.get(`https://api.themoviedb.org/3/search/${type}`, {
            params: {
                api_key: apiKey,
                query: query,
                language: 'ko-KR'
            }
        });
        return res.data.results[0];
    } catch (e) {
        console.error(`Search error for ${query}:`, e.message);
        return null;
    }
};

const run = async () => {
    const infiniteChallenge = await search('무한도전', 'tv');
    const japaneseMom = await search('일본 엄마', 'movie');

    console.log('--- Infinite Challenge (TV) ---');
    if (infiniteChallenge) {
        console.log(`ID: ${infiniteChallenge.id}`);
        console.log(`Title: ${infiniteChallenge.name}`);
    } else {
        console.log('Not found');
    }

    console.log('\n--- Japanese Mom (Movie) ---');
    if (japaneseMom) {
        console.log(`ID: ${japaneseMom.id}`);
        console.log(`Title: ${japaneseMom.title}`);
    } else {
        console.log('Not found');
    }
};

run();
