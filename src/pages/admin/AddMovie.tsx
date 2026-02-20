import { useState, useRef } from 'react'
import { tmdb } from '../../lib/tmdb'
import { supabase } from '../../lib/supabase'
import { useAdmin } from '../../context/AdminContext'
import { errorLogger } from '../../services/errorLogging'
import { Search, Plus, Save, Trash2, Server, Film, Link as LinkIcon, CheckCircle, XCircle, Upload } from 'lucide-react'
import { toast } from 'sonner'

const GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
}

export const AddMovie = () => {
  const { addMovie } = useAdmin()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<any>(null)
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [embeds, setEmbeds] = useState<{ server: string; url: string }[]>([
    { server: 'VidSrc', url: '' },
    { server: 'SuperEmbed', url: '' }
  ])

  const searchMovies = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const { data } = await tmdb.get('/search/movie', {
        params: { query, include_adult: false }
      })
      setResults(data.results || [])
    } catch (err) {
      toast.error('Failed to search TMDB')
    } finally {
      setLoading(false)
    }
  }

  const selectMovie = (movie: any) => {
    setSelectedMovie(movie)
    setResults([])
    setQuery('')
    setPosterFile(null)
    setPosterPreview(null)
    // Auto-generate links
    setEmbeds([
      { server: 'VidSrc', url: `https://vidsrc.xyz/embed/movie/${movie.id}` },
      { server: 'SuperEmbed', url: `https://superembed.stream/movie/${movie.id}` }
    ])
    toast.success(`Selected: ${movie.title}`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPosterFile(file)
      setPosterPreview(URL.createObjectURL(file))
    }
  }

  const saveContent = async () => {
    if (!selectedMovie) return
    setLoading(true)

    try {
      let finalPosterPath = selectedMovie.poster_path

      // Upload custom poster if selected
      if (posterFile) {
        const fileExt = posterFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `public/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('posters')
          .upload(filePath, posterFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('posters')
          .getPublicUrl(filePath)
        
        finalPosterPath = publicUrl
      }

      // Add to AdminContext
      const genreId = selectedMovie.genre_ids?.[0]
      const category = GENRES[genreId] || 'Unknown'

      await addMovie({
        title: selectedMovie.title,
        overview: selectedMovie.overview,
        poster_path: finalPosterPath,
        backdrop_path: selectedMovie.backdrop_path,
        release_date: selectedMovie.release_date || '',
        vote_average: selectedMovie.vote_average,
        category: category
      })

      // In a real app, we would also save the embeds here
      
      setSelectedMovie(null)
      setPosterFile(null)
      setPosterPreview(null)
      setEmbeds([{ server: 'VidSrc', url: '' }, { server: 'SuperEmbed', url: '' }])

    } catch (err: any) {
      errorLogger.logError({
        message: 'Error saving content',
        severity: 'high',
        category: 'user_action',
        context: { error: err }
      })
      toast.error('Error saving content: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
          إضافة فيلم جديد
        </h1>
      </div>

      {/* Search Section */}
      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
        <form onSubmit={searchMovies} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث في TMDB..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-black/20 border border-zinc-700 rounded-lg py-3 pr-10 pl-4 text-white text-sm focus:outline-none focus:border-primary transition-colors text-right"
              dir="rtl"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-white font-bold px-6 rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            {loading ? 'جاري البحث...' : 'بحث'}
          </button>
        </form>

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
            {results.map(movie => (
              <button 
                key={movie.id}
                onClick={() => selectMovie(movie)}
                className="group relative aspect-[2/3] rounded-lg overflow-hidden text-left hover:ring-2 ring-primary transition-all"
              >
                {movie.poster_path ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`} 
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <Film className="text-zinc-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="font-bold text-sm text-white">{movie.title}</p>
                  <p className="text-xs text-zinc-400">{movie.release_date?.split('-')[0]}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Movie Editor */}
      {selectedMovie && (
        <div className="grid md:grid-cols-[250px_1fr] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-xl backdrop-blur-sm">
          {/* Preview */}
          <div className="space-y-3">
            <div className="aspect-[2/3] rounded-xl overflow-hidden border border-zinc-700 shadow-2xl relative group">
              <img 
                src={posterPreview || `https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`} 
                alt={selectedMovie.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-sm transition-all transform hover:scale-110"
                   title="تغيير الملصق"
                 >
                   <Upload size={24} />
                 </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono border border-white/10 text-white pointer-events-none">
                ID: {selectedMovie.id}
              </div>
            </div>
            <p className="text-xs text-center text-zinc-500">
              {posterFile ? 'تم اختيار صورة مخصصة' : 'صورة TMDB الافتراضية'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="space-y-2 text-right">
              <h2 className="text-3xl font-bold text-white">{selectedMovie.title}</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">{selectedMovie.overview}</p>
              <div className="flex gap-3 text-xs font-mono text-primary pt-2 justify-end">
                <span className="bg-primary/10 px-2 py-1 rounded border border-primary/20">
                  {selectedMovie.release_date}
                </span>
                <span className="bg-primary/10 px-2 py-1 rounded border border-primary/20">
                  Rating: {selectedMovie.vote_average}
                </span>
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Embed Links Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setEmbeds([...embeds, { server: 'New Server', url: '' }])}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> إضافة سيرفر
                </button>
                <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                  <Server className="text-purple-400" size={16} />
                  روابط المشاهدة
                </h3>
              </div>

              <div className="space-y-2">
                {embeds.map((embed, idx) => (
                  <div key={idx} className="flex gap-2 items-center group">
                    <button 
                      onClick={() => setEmbeds(embeds.filter((_, i) => i !== idx))}
                      className="text-red-500/50 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="flex-1 relative">
                      <LinkIcon size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        value={embed.url}
                        onChange={(e) => {
                          const newEmbeds = [...embeds]
                          newEmbeds[idx].url = e.target.value
                          setEmbeds(newEmbeds)
                        }}
                        className="w-full bg-black/30 border border-zinc-700 rounded-md pr-7 pl-2 py-1.5 text-xs focus:border-primary outline-none font-mono text-zinc-300 text-right"
                        placeholder="https://..."
                        dir="ltr"
                      />
                    </div>
                    <div className="w-28">
                      <input 
                        value={embed.server}
                        onChange={(e) => {
                          const newEmbeds = [...embeds]
                          newEmbeds[idx].server = e.target.value
                          setEmbeds(newEmbeds)
                        }}
                        className="w-full bg-black/30 border border-zinc-700 rounded-md px-2 py-1.5 text-xs focus:border-primary outline-none text-right"
                        placeholder="اسم السيرفر"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={saveContent}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>
                    <Save size={18} />
                    حفظ الفيلم
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
