
const https = require('https');

const RECITER_OVERRIDES = {
  "مشاري العفاسي": "https://server8.mp3quran.net/afs",
  "عبدالباسط عبدالصمد": "https://server7.mp3quran.net/basit",
  "محمد صديق المنشاوي": "https://server10.mp3quran.net/minsh",
  "ماهر المعيقلي": "https://server12.mp3quran.net/maher",
  "محمود خليل الحصري": "https://server13.mp3quran.net/husr",
  "محمد محمود الطبلاوي": "https://server12.mp3quran.net/tblawi",
  "مصطفى إسماعيل": "https://server8.mp3quran.net/mustafa"
};

const TEST_SURAHS = [18, 36, 67]; // Kahf, Yasin, Mulk

async function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        contentType: res.headers['content-type']
      });
    });

    req.on('error', (e) => {
      resolve({ url, error: e.message });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing specific Surahs (Kahf, Yasin, Mulk)...\n');
  
  for (const [reciter, serverUrl] of Object.entries(RECITER_OVERRIDES)) {
    console.log(`Testing Reciter: ${reciter}`);
    
    for (const surahId of TEST_SURAHS) {
      const paddedId = surahId.toString().padStart(3, '0');
      const url = `${serverUrl}/${paddedId}.mp3`;
      
      const result = await checkUrl(url);
      
      if (result.status === 200 && result.contentType === 'audio/mpeg') {
        console.log(`  ✅ Surah ${surahId}: OK`);
      } else {
        console.error(`  ❌ Surah ${surahId}: FAILED - Status: ${result.status}`);
      }
    }
    console.log('---');
  }
}

runTests();
