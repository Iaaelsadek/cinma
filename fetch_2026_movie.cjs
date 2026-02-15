
const https = require('https');

const apiKey = 'afef094e7c0de13c1cac98227a61da4d';
const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&primary_release_year=2026&sort_by=popularity.desc`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.results && json.results.length > 0) {
        const movie = json.results[0];
        console.log(`ID: ${movie.id}`);
        console.log(`Title: ${movie.title}`);
        console.log(`Overview: ${movie.overview}`);
      } else {
        console.log('No movies found for 2026');
      }
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', (err) => {
  console.error('Error: ' + err.message);
});
