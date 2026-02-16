import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { supabase } from '../../lib/supabase'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useQuery } from '@tanstack/react-query'

type SoftwareRow = {
  id: number
  title: string
  poster_url?: string | null
  rating?: number | null
  year?: number | null
  release_year?: number | null
  category?: string | null
  download_url?: string | null
  // for hero compatibility
  media_type?: string
  vote_average?: number
  backdrop_path?: string | null
  release_date?: string
  poster_path?: string | null
}

export const Software = () => {
  const { lang } = useLang()

  const { data: allSoftware } = useQuery({
    queryKey: ['software-all'],
    queryFn: async () => {
      const { data } = await supabase.from('software').select('*').order('rating', { ascending: false })
      const dbItems = (data || []).map((item: any) => ({
        ...item,
        media_type: 'software',
        vote_average: item.rating || 0,
        release_date: item.year ? `${item.year}-01-01` : '2024-01-01',
        poster_path: item.poster_url,
        backdrop_path: item.poster_url
      })) as SoftwareRow[]

      if (dbItems.length > 0) return dbItems

      // Mock Data
      return [
        { id: 201, title: 'Visual Studio Code', poster_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/2048px-Visual_Studio_Code_1.35_icon.svg.png', vote_average: 9.9, category: 'Windows Dev', media_type: 'software' },
        { id: 202, title: 'Adobe Photoshop', poster_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1200px-Adobe_Photoshop_CC_icon.svg.png', vote_average: 9.5, category: 'Mac Design', media_type: 'software' },
        { id: 203, title: 'Google Chrome', poster_path: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg', vote_average: 9.0, category: 'Android Web', media_type: 'software' },
        { id: 204, title: 'VLC Media Player', poster_path: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/VLC_Icon.svg', vote_average: 9.2, category: 'Windows Tools', media_type: 'software' },
        { id: 205, title: 'Discord', poster_path: 'https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png', vote_average: 9.4, category: 'Windows Chat', media_type: 'software' },
        { id: 206, title: 'Spotify', poster_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/2048px-Spotify_logo_without_text.svg.png', vote_average: 9.3, category: 'Android Music', media_type: 'software' },
        { id: 207, title: 'Blender', poster_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Blender_logo_no_text.svg/2503px-Blender_logo_no_text.svg.png', vote_average: 9.7, category: 'Windows 3D', media_type: 'software' },
        { id: 208, title: 'Figma', poster_path: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/1667px-Figma-logo.svg.png', vote_average: 9.6, category: 'Mac Design', media_type: 'software' },
        { id: 209, title: 'Docker', poster_path: 'https://www.docker.com/wp-content/uploads/2022/03/vertical-logo-monochromatic.png', vote_average: 9.5, category: 'Linux Dev', media_type: 'software' },
        { id: 210, title: 'Obsidian', poster_path: 'https://upload.wikimedia.org/wikipedia/commons/1/10/2023_Obsidian_logo.png', vote_average: 9.8, category: 'Windows Productivity', media_type: 'software' },
      ]
    }
  })

  const topRated = allSoftware?.slice(0, 15) || []
  const windows = allSoftware?.filter(s => (s.category || '').toLowerCase().includes('windows') || (s.category || '').toLowerCase().includes('pc')) || []
  const mac = allSoftware?.filter(s => (s.category || '').toLowerCase().includes('mac') || (s.title || '').toLowerCase().includes('mac')) || []
  const android = allSoftware?.filter(s => (s.category || '').toLowerCase().includes('android') || (s.title || '').toLowerCase().includes('android')) || []
  const others = allSoftware?.filter(s => !['windows', 'mac', 'android', 'pc'].some(k => (s.category || '').toLowerCase().includes(k))) || []

  // Hero items - take top 5 rated
  const heroItems = topRated.slice(0, 5)

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Helmet>
        <title>{lang === 'ar' ? 'البرمجيات - سينما أونلاين' : 'Software - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 -mt-20 relative z-10">
        <QuantumTrain 
          items={topRated} 
          title={lang === 'ar' ? 'أفضل البرامج' : 'Top Software'} 
          link="/search?types=software&sort=top_rated"
        />
        
        <QuantumTrain 
          items={windows} 
          title={lang === 'ar' ? 'برامج ويندوز' : 'Windows Software'} 
          link="/search?types=software&keywords=windows"
        />

        <QuantumTrain 
          items={mac} 
          title={lang === 'ar' ? 'برامج ماك' : 'Mac Software'} 
          link="/search?types=software&keywords=mac"
        />

        <QuantumTrain 
          items={android} 
          title={lang === 'ar' ? 'تطبيقات أندرويد' : 'Android Apps'} 
          link="/search?types=software&keywords=android"
        />

        <QuantumTrain 
          items={others} 
          title={lang === 'ar' ? 'أدوات أخرى' : 'Other Tools'} 
          link="/search?types=software&keywords=tools"
        />
      </div>
    </div>
  )
}
