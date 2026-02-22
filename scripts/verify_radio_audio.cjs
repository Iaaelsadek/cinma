
const https = require('https');
const http = require('http');

const STATIONS = [
  { id: 'cairo', name: 'إذاعة القرآن الكريم - القاهرة', url: 'https://stream.radiojar.com/8s5u5tpdtwzuv' },
  { id: 'mix', name: 'تلاوات خاشعة متنوعة', url: 'https://backup.qurango.net/radio/mix' },
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length']
      });
    });

    req.on('error', (e) => {
      resolve({ url, error: e.message });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Starting Quran Radio URL Tests...\n');
  
  for (const station of STATIONS) {
    console.log(`Testing Station: ${station.name} (${station.url})`);
    const result = await checkUrl(station.url);
    
    if (result.status === 200 || result.status === 302) { // 302 is common for streams
      console.log(`  ✅ OK (${station.url}) - Status: ${result.status}, Type: ${result.contentType}`);
    } else {
      console.error(`  ❌ FAILED - Status: ${result.status}, Type: ${result.contentType}, Error: ${result.error}`);
    }
    console.log('---');
  }
}

runTests();
