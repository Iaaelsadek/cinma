
-- Migration: Fix Famous Reciters
-- Date: 2026-02-22

-- 1. Remove "Famous" tag from accidental matches (impostors or less famous with similar names)
UPDATE public.quran_reciters
SET category = 'Others', featured = false
WHERE name IN ('خالد الشريمي', 'خالد الغامدي', 'سامي الدوسري', 'إبراهيم الدوسري');

-- 2. Update Abdul Basit to Famous (Arabic name match)
UPDATE public.quran_reciters
SET category = 'Famous', 
    featured = true,
    image = 'https://static.surahquran.com/images/reciters/12.jpg'
WHERE name LIKE '%عبدالباسط عبدالصمد%';

-- 3. Insert missing famous reciters (using high IDs to avoid conflict)

-- Yasser Al-Dosari
INSERT INTO public.quran_reciters (id, name, image, rewaya, server, category, surah_list, is_active, featured)
VALUES (
    10001,
    'Yasser Al-Dosari',
    'https://static.surahquran.com/images/reciters/2.jpg',
    'Hafs',
    'https://server11.mp3quran.net/yasser/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- Fares Abbad
INSERT INTO public.quran_reciters (id, name, image, rewaya, server, category, surah_list, is_active, featured)
VALUES (
    10002,
    'Fares Abbad',
    'https://static.surahquran.com/images/reciters/8.jpg',
    'Hafs',
    'https://server8.mp3quran.net/frs_a/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- Nasser Al Qatami
INSERT INTO public.quran_reciters (id, name, image, rewaya, server, category, surah_list, is_active, featured)
VALUES (
    10003,
    'Nasser Al Qatami',
    'https://static.surahquran.com/images/reciters/16.jpg',
    'Hafs',
    'https://server6.mp3quran.net/qtm/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
) ON CONFLICT (id) DO NOTHING;
