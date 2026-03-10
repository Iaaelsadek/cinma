DO $$
BEGIN
  IF to_regclass('public.embed_sources') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'embed_sources'
        AND column_name = 'base_url'
    ) THEN
      INSERT INTO embed_sources (name, base_url, url_pattern, priority) VALUES 
      ('vidsrc', 'https://vidsrc.to', 'https://vidsrc.to/embed/{type}/{id}', 1),
      ('2embed', 'https://www.2embed.cc', 'https://www.2embed.cc/embed/{id}', 2),
      ('embed_su', 'https://embed.su', 'https://embed.su/embed/{type}/{id}', 3)
      ON CONFLICT (name) DO NOTHING;
    ELSE
      INSERT INTO embed_sources (name, url_pattern, priority) VALUES 
      ('vidsrc', 'https://vidsrc.to/embed/{type}/{id}', 1),
      ('2embed', 'https://www.2embed.cc/embed/{id}', 2),
      ('embed_su', 'https://embed.su/embed/{type}/{id}', 3)
      ON CONFLICT (name) DO NOTHING;
    END IF;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.anime') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'anime' AND column_name = 'image_url'
    ) THEN
      INSERT INTO public.anime (id, title, category, image_url, rating, description)
      SELECT
        COALESCE((SELECT MAX(id) FROM public.anime), 0) + ROW_NUMBER() OVER (ORDER BY v.title),
        v.title, v.category, v.image_url, v.rating, v.description
      FROM (
        VALUES
        ('Attack on Titan', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/hTP1DtLGFamjfu8WqjnuQdPuy61.jpg', 9.1, 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.'),
        ('One Piece', 'Adventure', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/cMD9Ygz11zjJzAovURpO75Pg738.jpg', 8.9, 'Monkey D. Luffy refuses to let anyone or anything stand in the way of his quest to become the king of all pirates.'),
        ('Demon Slayer: Kimetsu no Yaiba', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/xUfRZu2mi8bZJKSe15TLkQymxCot.jpg', 8.8, 'It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.'),
        ('Death Note', 'Thriller', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/tCzeDfOdqB8m0J82s27HCV84xM9.jpg', 9.0, 'Light Yagami is an ace student with great prospects—and he''s bored out of his mind. But all that changes when he finds the Death Note.'),
        ('Naruto', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/vauCEnR7CjyqePGUkyKAoExO75C.jpg', 8.5, 'Naruto Uzumaki, a hyperactive and knuckle-headed ninja, searches for recognition from everyone around him.')
      ) AS v(title, category, image_url, rating, description)
      WHERE NOT EXISTS (SELECT 1 FROM public.anime a WHERE a.title = v.title);
    ELSE
      INSERT INTO public.anime (id, title, poster_path, overview)
      SELECT
        COALESCE((SELECT MAX(id) FROM public.anime), 0) + ROW_NUMBER() OVER (ORDER BY v.title),
        v.title, v.poster_path, v.overview
      FROM (
        VALUES
        ('Attack on Titan', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/hTP1DtLGFamjfu8WqjnuQdPuy61.jpg', 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.'),
        ('One Piece', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/cMD9Ygz11zjJzAovURpO75Pg738.jpg', 'Monkey D. Luffy refuses to let anyone or anything stand in the way of his quest to become the king of all pirates.'),
        ('Demon Slayer: Kimetsu no Yaiba', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/xUfRZu2mi8bZJKSe15TLkQymxCot.jpg', 'It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.')
      ) AS v(title, poster_path, overview)
      WHERE NOT EXISTS (SELECT 1 FROM public.anime a WHERE a.title = v.title);
    END IF;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.quran_reciters') IS NOT NULL THEN
    WITH seed(name, image, rewaya, server, category) AS (
      VALUES
      ('Mishary Rashid Alafasy', 'https://upload.wikimedia.org/wikipedia/commons/2/29/Mishary_Rashid_Al-Afasy.jpg', 'Hafs', 'https://server8.mp3quran.net/afs/', 'Famous'),
      ('Maher Al Muaiqly', 'https://i1.sndcdn.com/artworks-000236613390-2p0a6v-t500x500.jpg', 'Hafs', 'https://server12.mp3quran.net/maher/', 'Famous'),
      ('Abdul Rahman Al-Sudais', 'https://static.surahquran.com/images/reciters/1.jpg', 'Hafs', 'https://server11.mp3quran.net/sds/', 'Famous')
    )
    INSERT INTO public.quran_reciters (id, name, image, rewaya, server, category)
    SELECT
      COALESCE((SELECT MAX(id) FROM public.quran_reciters), 0) + ROW_NUMBER() OVER (ORDER BY s.name),
      s.name, s.image, s.rewaya, s.server, s.category
    FROM seed s
    WHERE NOT EXISTS (SELECT 1 FROM public.quran_reciters q WHERE q.name = s.name);
  END IF;
END
$$;
