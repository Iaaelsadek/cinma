import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lhpuwupbhpcqkwqugkhh.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const RECITERS = [
  { id: 1, name: 'مشاري العفاسي', rewaya: 'حفص عن عاصم', server: 'https://server8.mp3quran.net/afs', featured: true, category: 'modern' },
  { id: 2, name: 'عبدالباسط عبدالصمد', rewaya: 'المصحف المجود', server: 'https://server7.mp3quran.net/basit', featured: true, category: 'classic' },
  { id: 3, name: 'محمد صديق المنشاوي', rewaya: 'المصحف المرتل', server: 'https://server10.mp3quran.net/minsh', featured: true, category: 'classic' },
  { id: 4, name: 'ماهر المعيقلي', rewaya: 'حفص عن عاصم', server: 'https://server12.mp3quran.net/maher', featured: true, category: 'modern' },
  { id: 5, name: 'سعود الشريم', rewaya: 'حفص عن عاصم', server: 'https://server7.mp3quran.net/shur', featured: true, category: 'modern' },
  { id: 6, name: 'عبدالرحمن السديس', rewaya: 'حفص عن عاصم', server: 'https://server11.mp3quran.net/sds', featured: true, category: 'modern' },
  { id: 7, name: 'أحمد العجمي', rewaya: 'حفص عن عاصم', server: 'https://server10.mp3quran.net/ajm', featured: true, category: 'modern' },
  { id: 8, name: 'ياسر الدوسري', rewaya: 'حفص عن عاصم', server: 'https://server11.mp3quran.net/yasser', featured: true, category: 'modern' },
  { id: 9, name: 'ناصر القطامي', rewaya: 'حفص عن عاصم', server: 'https://server6.mp3quran.net/qtm', featured: true, category: 'modern' },
  { id: 10, name: 'فارس عباد', rewaya: 'حفص عن عاصم', server: 'https://server8.mp3quran.net/frs_a', featured: true, category: 'modern' },
  { id: 11, name: 'إدريس أبكر', rewaya: 'حفص عن عاصم', server: 'https://server6.mp3quran.net/abkr', featured: true, category: 'modern' },
  { id: 12, name: 'محمود خليل الحصري', rewaya: 'المصحف المرتل', server: 'https://server13.mp3quran.net/husr', featured: true, category: 'classic' },
  { id: 13, name: 'محمد محمود الطبلاوي', rewaya: 'حفص عن عاصم', server: 'https://server12.mp3quran.net/tblawi', featured: true, category: 'classic' },
  { id: 14, name: 'مصطفى إسماعيل', rewaya: 'المصحف المجود', server: 'https://server8.mp3quran.net/mustafa', featured: true, category: 'classic' },
  { id: 15, name: 'سعد الغامدي', rewaya: 'حفص عن عاصم', server: 'https://server7.mp3quran.net/sghm', featured: false, category: 'modern' },
  { id: 16, name: 'خالد الجليل', rewaya: 'حفص عن عاصم', server: 'https://server10.mp3quran.net/jleel', featured: false, category: 'modern' },
  { id: 17, name: 'صلاح بو خاطر', rewaya: 'حفص عن عاصم', server: 'https://server8.mp3quran.net/bu_khatir', featured: false, category: 'modern' },
  { id: 18, name: 'عبدالله الجهني', rewaya: 'حفص عن عاصم', server: 'https://server13.mp3quran.net/jhn', featured: false, category: 'modern' },
  { id: 19, name: 'علي الحذيفي', rewaya: 'حفص عن عاصم', server: 'https://server9.mp3quran.net/huth', featured: false, category: 'classic' },
  { id: 20, name: 'محمد جبريل', rewaya: 'حفص عن عاصم', server: 'https://server8.mp3quran.net/jbrl', featured: false, category: 'modern' }
];

async function fillQuran() {
  console.log('Filling Quran reciters...');
  
  for (const reciter of RECITERS) {
    const { data, error } = await supabase
      .from('quran_reciters')
      .upsert({
        id: reciter.id,
        name: reciter.name,
        rewaya: reciter.rewaya,
        server: reciter.server,
        featured: reciter.featured,
        category: reciter.category,
        is_active: true
      });
    
    if (error) {
      console.error(`Error inserting ${reciter.name}:`, error.message);
    } else {
      console.log(`Successfully added/updated: ${reciter.name}`);
    }
  }
}

fillQuran();
