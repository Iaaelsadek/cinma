
const https = require('https');

const providers = [
  { name: 'VidSrc', url: 'https://vidsrc.to/embed/movie/840464' },
  { name: '2Embed', url: 'https://www.2embed.cc/embed/840464' },
  { name: 'EmbedSU', url: 'https://embed.su/embed/movie/840464' }
];

console.log('Verifying external streaming sources for Movie ID: 840464...');

providers.forEach(p => {
  const req = https.request(p.url, { method: 'HEAD' }, (res) => {
    console.log(`[${p.name}] Status: ${res.statusCode} - ${res.statusCode < 400 ? 'ACTIVE' : 'POTENTIAL ISSUE'}`);
  });
  
  req.on('error', (e) => {
    console.log(`[${p.name}] Error: ${e.message}`);
  });
  
  req.end();
});
