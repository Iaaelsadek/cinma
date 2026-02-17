-- Add columns to support advanced filtering for MENA market

-- Movies: Add origin_country and is_play
ALTER TABLE public.movies 
ADD COLUMN IF NOT EXISTS origin_country TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_play BOOLEAN DEFAULT FALSE;

-- Series: Add origin_country and is_ramadan
ALTER TABLE public.tv_series 
ADD COLUMN IF NOT EXISTS origin_country TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_ramadan BOOLEAN DEFAULT FALSE;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_movies_is_play ON public.movies(is_play);
CREATE INDEX IF NOT EXISTS idx_series_is_ramadan ON public.tv_series(is_ramadan);
CREATE INDEX IF NOT EXISTS idx_series_origin_country ON public.tv_series USING GIN(origin_country);
