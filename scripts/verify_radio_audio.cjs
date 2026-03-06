
const https = require('https');

const STATIONS = [
  {
    id: 'cairo',
    name: 'إذاعة القرآن الكريم - القاهرة',
    url: 'https://n09.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5&rj-tok=AAABnL1sTdIAdrvVVnc42TdU_Q',
  },
  { id: 'mix', name: 'تلاوات خاشعة متنوعة', url: 'https://qurango.net/radio/mix' },
  { id: 'tarateel', name: 'تراتيل قصيرة متميزة', url: 'https://qurango.net/radio/tarateel' },
  { id: 'salma', name: 'تلاوات خاشعة', url: 'https://qurango.net/radio/salma' },
  { id: 'ali_jaber', name: 'الشيخ علي جابر', url: 'https://qurango.net/radio/ali_jaber' },
  { id: 'yasser', name: 'الشيخ ياسر الدوسري', url: 'https://qurango.net/radio/yasser_aldosari' },
  { id: 'mishary', name: 'الشيخ مشاري العفاسي', url: 'https://qurango.net/radio/mishary_alafasi' },
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          Range: 'bytes=0-2047',
          'User-Agent': 'Mozilla/5.0',
        },
      },
      (res) => {
        resolve({
          url,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          location: res.headers.location,
        });
        res.destroy();
      }
    );

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
    
    if (result.status === 200 || result.status === 206 || result.status === 302) {
      const extra = result.location ? `, Redirect: ${result.location}` : '';
      console.log(`  ✅ OK (${station.url}) - Status: ${result.status}, Type: ${result.contentType}${extra}`);
    } else {
      console.error(`  ❌ FAILED - Status: ${result.status}, Type: ${result.contentType}, Error: ${result.error}`);
    }
    console.log('---');
  }
}

runTests();
