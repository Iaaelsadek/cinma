
const https = require('https');
const http = require('http');

const RECITER_OVERRIDES = {
  "مشاري العفاسي": "https://server8.mp3quran.net/afs",
  "Mishary Rashid Alafasy": "https://server8.mp3quran.net/afs",
  "عبدالباسط عبدالصمد": "https://server7.mp3quran.net/basit",
  "Abdul Basit": "https://server7.mp3quran.net/basit",
  "محمد صديق المنشاوي": "https://server10.mp3quran.net/minsh",
  "Muhammad Siddiq Al-Minshawi": "https://server10.mp3quran.net/minsh",
  "ماهر المعيقلي": "https://server12.mp3quran.net/maher",
  "Maher Al Muaiqly": "https://server12.mp3quran.net/maher",
  "سعود الشريم": "https://server7.mp3quran.net/shur",
  "Saud Al-Shuraim": "https://server7.mp3quran.net/shur",
  "عبدالرحمن السديس": "https://server11.mp3quran.net/sds",
  "Abdul Rahman Al-Sudais": "https://server11.mp3quran.net/sds",
  "أحمد العجمي": "https://server10.mp3quran.net/ajm",
  "Ahmed Al-Ajmi": "https://server10.mp3quran.net/ajm",
  "ياسر الدوسري": "https://server11.mp3quran.net/yasser",
  "Yasser Al-Dosari": "https://server11.mp3quran.net/yasser",
  "ناصر القطامي": "https://server6.mp3quran.net/qtm",
  "Nasser Al Qatami": "https://server6.mp3quran.net/qtm",
  "فارس عباد": "https://server8.mp3quran.net/frs_a",
  "Fares Abbad": "https://server8.mp3quran.net/frs_a",
  "إدريس أبكر": "https://server6.mp3quran.net/abkr",
  "Idris Abkar": "https://server6.mp3quran.net/abkr"
};

const TEST_SURAHS = [1, 114]; // Al-Fatiha and Al-Nas

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
  console.log('Starting Quran Audio URL Tests...\n');
  
  const results = [];

  for (const [reciter, serverUrl] of Object.entries(RECITER_OVERRIDES)) {
    // Only test Arabic names to avoid duplicates, or maybe just a few key ones
    if (/[a-zA-Z]/.test(reciter)) continue; 

    console.log(`Testing Reciter: ${reciter} (${serverUrl})`);
    
    for (const surahId of TEST_SURAHS) {
      const paddedId = surahId.toString().padStart(3, '0');
      const url = `${serverUrl}/${paddedId}.mp3`;
      
      const result = await checkUrl(url);
      results.push({ reciter, surahId, ...result });
      
      if (result.status === 200 && result.contentType === 'audio/mpeg') {
        console.log(`  ✅ Surah ${surahId}: OK (${url})`);
      } else {
        console.error(`  ❌ Surah ${surahId}: FAILED - Status: ${result.status}, Type: ${result.contentType}, Error: ${result.error}`);
      }
    }
    console.log('---');
  }
}

runTests();
