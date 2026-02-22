-- Migration: Set images and featured status for famous reciters
-- Date: 2026-02-22

-- Mishary Rashid Alafasy
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://upload.wikimedia.org/wikipedia/commons/2/29/Mishary_Rashid_Al-Afasy.jpg',
    category = 'Famous'
WHERE name LIKE '%Mishary%' OR name LIKE '%Afasy%';

-- Abdul Rahman Al-Sudais
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/1.jpg',
    category = 'Famous'
WHERE name LIKE '%Sudais%';

-- Saud Al-Shuraim
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/6.jpg',
    category = 'Famous'
WHERE name LIKE '%Shuraim%';

-- Maher Al Muaiqly
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://i1.sndcdn.com/artworks-000236613390-2p0a6v-t500x500.jpg',
    category = 'Famous'
WHERE name LIKE '%Maher%' AND name LIKE '%Muaiqly%';

-- Saad Al Ghamdi
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/4.jpg',
    category = 'Famous'
WHERE name LIKE '%Ghamdi%';

-- Ahmed Al-Ajmi
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/3.jpg',
    category = 'Famous'
WHERE name LIKE '%Ajmi%';

-- Yasser Al-Dosari
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/2.jpg',
    category = 'Famous'
WHERE name LIKE '%Dosari%';

-- Mahmoud Khalil Al-Hussary
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/5.jpg',
    category = 'Famous'
WHERE name LIKE '%Hussary%' OR name LIKE '%Husary%';

-- Mohamed Siddiq Al-Minshawi
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/10.jpg',
    category = 'Famous'
WHERE name LIKE '%Minshawi%';

-- Abdul Basit Abdul Samad
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/12.jpg',
    category = 'Famous'
WHERE name LIKE '%Abdul Basit%' OR name LIKE '%Abdus-Samad%';

-- Fares Abbad
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/8.jpg',
    category = 'Famous'
WHERE name LIKE '%Fares%' AND name LIKE '%Abbad%';

-- Idris Abkar
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/19.jpg',
    category = 'Famous'
WHERE name LIKE '%Idris%' AND name LIKE '%Abkar%';

-- Nasser Al Qatami
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/16.jpg',
    category = 'Famous'
WHERE name LIKE '%Qatami%';
