require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const ISLAMIC_CONTENT = [
  // --- Quran ---
  {
    title: 'سورة البقرة كاملة - مشاري العفاسي',
    url: 'https://www.youtube.com/watch?v=Ktync4j_nmA',
    thumbnail: 'https://i.ytimg.com/vi/Ktync4j_nmA/hqdefault.jpg',
    category: 'quran',
    year: 2020,
    duration: 7200
  },
  {
    title: 'سورة الكهف - ماهر المعيقلي',
    url: 'https://www.youtube.com/watch?v=F7ghLCk7FqI',
    thumbnail: 'https://i.ytimg.com/vi/F7ghLCk7FqI/hqdefault.jpg',
    category: 'quran',
    year: 2021,
    duration: 1800
  },
  {
    title: 'سورة يوسف - عبدالباسط عبدالصمد',
    url: 'https://www.youtube.com/watch?v=o_N7sFkK1Xw',
    thumbnail: 'https://i.ytimg.com/vi/o_N7sFkK1Xw/hqdefault.jpg',
    category: 'quran',
    year: 1980,
    duration: 2400
  },
  {
    title: 'سورة يس - سعد الغامدي',
    url: 'https://www.youtube.com/watch?v=6WVl66XF5S0',
    thumbnail: 'https://i.ytimg.com/vi/6WVl66XF5S0/hqdefault.jpg',
    category: 'quran',
    year: 2010,
    duration: 1200
  },
  {
    title: 'سورة الملك - إسلام صبحي',
    url: 'https://www.youtube.com/watch?v=1Y7r9GjQZ_c',
    thumbnail: 'https://i.ytimg.com/vi/1Y7r9GjQZ_c/hqdefault.jpg',
    category: 'quran',
    year: 2019,
    duration: 600
  },

  // --- Stories of Prophets (Nabil Al-Awadi) ---
  {
    title: 'قصة بداية الخلق وآدم عليه السلام - نبيل العوضي',
    url: 'https://www.youtube.com/watch?v=CExv4mSFyBE',
    thumbnail: 'https://i.ytimg.com/vi/CExv4mSFyBE/hqdefault.jpg',
    category: 'prophets',
    year: 2015,
    duration: 3000
  },
  {
    title: 'قصة نوح عليه السلام - نبيل العوضي',
    url: 'https://www.youtube.com/watch?v=3rf8k3QuI-E',
    thumbnail: 'https://i.ytimg.com/vi/3rf8k3QuI-E/hqdefault.jpg',
    category: 'prophets',
    year: 2015,
    duration: 2800
  },
  {
    title: 'قصة يوسف عليه السلام - نبيل العوضي',
    url: 'https://www.youtube.com/watch?v=j_dO4K_T_cc',
    thumbnail: 'https://i.ytimg.com/vi/j_dO4K_T_cc/hqdefault.jpg',
    category: 'prophets',
    year: 2015,
    duration: 3600
  },
  {
    title: 'قصة موسى عليه السلام - نبيل العوضي',
    url: 'https://www.youtube.com/watch?v=3B13suDF9Jg',
    thumbnail: 'https://i.ytimg.com/vi/3B13suDF9Jg/hqdefault.jpg',
    category: 'prophets',
    year: 2015,
    duration: 3200
  },

  // --- Fatwas (Othman Khamis) ---
  {
    title: 'أحكام الصيام - عثمان الخميس',
    url: 'https://www.youtube.com/watch?v=8_k_vJ7Jz_M',
    thumbnail: 'https://i.ytimg.com/vi/8_k_vJ7Jz_M/hqdefault.jpg',
    category: 'fatwa',
    year: 2023,
    duration: 1500
  },
  {
    title: 'كيفية صلاة النبي - عثمان الخميس',
    url: 'https://www.youtube.com/watch?v=example2',
    thumbnail: 'https://i.ytimg.com/vi/example2/hqdefault.jpg',
    category: 'fatwa',
    year: 2022,
    duration: 1200
  }
];

async function fill() {
  console.log('Starting Islamic content fill...');
  for (const item of ISLAMIC_CONTENT) {
     const { error } = await supabase.from('videos').upsert(item, { onConflict: 'url' });
     if (error) console.error('Error inserting:', item.title, error);
     else console.log('✓ Inserted:', item.title);
  }
  console.log('Done.');
}

fill();
