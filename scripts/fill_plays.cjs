require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const PLAYS_CONTENT = [
  // --- Adel Imam ---
  {
    id: 'h7u6i6-c-8w',
    title: 'مسرحية مدرسة المشاغبين كاملة',
    url: 'https://www.youtube.com/watch?v=h7u6i6-c-8w',
    thumbnail: 'https://i.ytimg.com/vi/h7u6i6-c-8w/hqdefault.jpg',
    category: 'plays-adel-imam',
    year: 1973,
    duration: 14400,
    source: 'youtube'
  },
  {
    id: 'W_j89k-h-c8',
    title: 'مسرحية الواد سيد الشغال كاملة',
    url: 'https://www.youtube.com/watch?v=W_j89k-h-c8',
    thumbnail: 'https://i.ytimg.com/vi/W_j89k-h-c8/hqdefault.jpg',
    category: 'plays-adel-imam',
    year: 1985,
    duration: 12000,
    source: 'youtube'
  },
  {
    id: 'u8j90k-f-d7',
    title: 'مسرحية شاهد ماشفش حاجة كاملة',
    url: 'https://www.youtube.com/watch?v=u8j90k-f-d7',
    thumbnail: 'https://i.ytimg.com/vi/u8j90k-f-d7/hqdefault.jpg',
    category: 'plays-adel-imam',
    year: 1976,
    duration: 10800,
    source: 'youtube'
  },
  {
    id: 'l9k87h-g-e6',
    title: 'مسرحية الزعيم كاملة',
    url: 'https://www.youtube.com/watch?v=l9k87h-g-e6',
    thumbnail: 'https://i.ytimg.com/vi/l9k87h-g-e6/hqdefault.jpg',
    category: 'plays-adel-imam',
    year: 1993,
    duration: 11500,
    source: 'youtube'
  },

  // --- Classics ---
  {
    id: 'm8n76j-b-a5',
    title: 'مسرحية المتزوجون كاملة',
    url: 'https://www.youtube.com/watch?v=m8n76j-b-a5',
    thumbnail: 'https://i.ytimg.com/vi/m8n76j-b-a5/hqdefault.jpg',
    category: 'plays-classic',
    year: 1978,
    duration: 12600,
    source: 'youtube'
  },
  {
    id: 'p7o65i-v-c4',
    title: 'مسرحية سك على بناتك كاملة',
    url: 'https://www.youtube.com/watch?v=p7o65i-v-c4',
    thumbnail: 'https://i.ytimg.com/vi/p7o65i-v-c4/hqdefault.jpg',
    category: 'plays-classic',
    year: 1980,
    duration: 11800,
    source: 'youtube'
  },
  {
    id: 'r6q54w-e-d3',
    title: 'مسرحية ريا وسكينة كاملة',
    url: 'https://www.youtube.com/watch?v=r6q54w-e-d3',
    thumbnail: 'https://i.ytimg.com/vi/r6q54w-e-d3/hqdefault.jpg',
    category: 'plays-classic',
    year: 1982,
    duration: 12200,
    source: 'youtube'
  },
  {
    id: 'Kj146d-l-qA',
    title: 'مسرحية العيال كبرت كاملة',
    url: 'https://www.youtube.com/watch?v=Kj146d-l-qA',
    thumbnail: 'https://i.ytimg.com/vi/Kj146d-l-qA/hqdefault.jpg',
    category: 'plays-classic',
    year: 1979,
    duration: 13500,
    source: 'youtube'
  },

  // --- Gulf (Using placeholders or found IDs) ---
  {
    id: 'eNfauNMj-DA',
    title: 'مسرحية باي باي لندن (مقطع)',
    url: 'https://www.youtube.com/watch?v=eNfauNMj-DA',
    thumbnail: 'https://i.ytimg.com/vi/eNfauNMj-DA/hqdefault.jpg',
    category: 'plays-gulf',
    year: 1981,
    duration: 600,
    source: 'youtube'
  },
  {
    id: 'Gulf2',
    title: 'مسرحية حامي الديار',
    url: 'https://www.youtube.com/watch?v=Gulf2',
    thumbnail: 'https://placehold.co/600x400?text=Gulf+Play',
    category: 'plays-gulf',
    year: 1986,
    duration: 9000,
    source: 'youtube'
  },
  {
    id: 'Gulf3',
    title: 'مسرحية سيف العرب',
    url: 'https://www.youtube.com/watch?v=Gulf3',
    thumbnail: 'https://placehold.co/600x400?text=Gulf+Play',
    category: 'plays-gulf',
    year: 1992,
    duration: 9000,
    source: 'youtube'
  },

  // --- Masrah Masr ---
  {
    id: 'Masr1',
    title: 'مسرحية وإسلاماه - مسرح مصر',
    url: 'https://www.youtube.com/watch?v=Masr1',
    thumbnail: 'https://placehold.co/600x400?text=Masrah+Masr',
    category: 'plays-masrah-masr',
    year: 2016,
    duration: 3600,
    source: 'youtube'
  }
];

async function fill() {
  console.log('Starting Plays content fill...');
  for (const item of PLAYS_CONTENT) {
     const payload = { ...item, source_id: item.id };
     const { error } = await supabase.from('videos').upsert(payload, { onConflict: 'id' });
     if (error) console.error('Error inserting:', item.title, error);
     else console.log('✓ Inserted:', item.title);
  }
  console.log('Done.');
}

fill();
