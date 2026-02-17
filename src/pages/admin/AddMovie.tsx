import { useState } from 'react'
import { tmdb } from '../../lib/tmdb'
import { supabase } from '../../lib/supabase'
import { Search, Plus, Save, Trash2, Server, Film, Link as LinkIcon, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export const AddMovie = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<any>(null)
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
    // Auto-generate links
    setEmbeds([
      { server: 'VidSrc', url: `https://vidsrc.xyz/embed/movie/${movie.id}` },
      { server: 'SuperEmbed', url: `https://superembed.stream/movie/${movie.id}` }
    ])
    toast.success(`Selected: ${movie.title}`)
  }

  const saveContent = async () => {
    if (!selectedMovie) return
    setLoading(true)

    try {
      // 1. Insert Movie
      const moviePayload = {
        tmdb_id: selectedMovie.id,
        title: selectedMovie.title,
        original_title: selectedMovie.original_title,
        overview: selectedMovie.overview,
        poster_path: selectedMovie.poster_path,
        backdrop_path: selectedMovie.backdrop_path,
        release_date: selectedMovie.release_date || null,
        vote_average: selectedMovie.vote_average,
        popularity: selectedMovie.popularity,
        is_published: true
      }

      const { data: movieData, error: movieError } = await supabase
        .from('movies')
        .insert(moviePayload)
        .select()
        .single()

      if (movieError) {
        if (movieError.code === '23505') { // Unique violation
            toast.error('Movie already exists in database!')
            setLoading(false)
            return
        }
        throw movieError
      }

      const movieId = movieData.id

      // 2. Insert Embeds
      const linksPayload = embeds
        .filter(e => e.url.trim())
        .map(e => ({
          movie_id: movieId,
          media_type: 'movie',
          server_name: e.server,
          url: e.url,
          is_active: true
        }))

      if (linksPayload.length > 0) {
        const { error: linksError } = await supabase
          .from('embed_links')
          .insert(linksPayload)
        
        if (linksError) throw linksError
      }

      toast.success('Movie added successfully!')
      setSelectedMovie(null)
      setEmbeds([{ server: 'VidSrc', url: '' }, { server: 'SuperEmbed', url: '' }])

    } catch (err: any) {
      console.error(err)
      toast.error('Error saving content: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Add New Movie
        </h1>
      </div>

      {/* Search Section */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <form onSubmit={searchMovies} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search TMDB for a movie..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 rounded-xl transition-colors flex items-center gap-2"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
            {results.map(movie => (
              <button 
                key={movie.id}
                onClick={() => selectMovie(movie)}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden text-left hover:ring-2 ring-cyan-500 transition-all"
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
                  <p className="font-bold text-sm">{movie.title}</p>
                  <p className="text-xs text-zinc-400">{movie.release_date?.split('-')[0]}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Movie Editor */}
      {selectedMovie && (
        <div className="grid md:grid-cols-[300px_1fr] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Preview */}
          <div className="space-y-4">
            <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
              <img 
                src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`} 
                alt={selectedMovie.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono border border-white/10">
                ID: {selectedMovie.id}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-black">{selectedMovie.title}</h2>
              <p className="text-zinc-400 leading-relaxed">{selectedMovie.overview}</p>
              <div className="flex gap-4 text-sm font-mono text-cyan-400 pt-2">
                <span className="bg-cyan-950/30 px-3 py-1 rounded border border-cyan-900">
                  {selectedMovie.release_date}
                </span>
                <span className="bg-cyan-950/30 px-3 py-1 rounded border border-cyan-900">
                  Rating: {selectedMovie.vote_average}
                </span>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            {/* Embed Links Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Server className="text-purple-400" size={20} />
                  Video Sources
                </h3>
                <button 
                  onClick={() => setEmbeds([...embeds, { server: 'New Server', url: '' }])}
                  className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> Add Source
                </button>
              </div>

              <div className="space-y-3">
                {embeds.map((embed, idx) => (
                  <div key={idx} className="flex gap-3 items-center group">
                    <div className="w-32">
                      <input 
                        value={embed.server}
                        onChange={(e) => {
                          const newEmbeds = [...embeds]
                          newEmbeds[idx].server = e.target.value
                          setEmbeds(newEmbeds)
                        }}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none"
                        placeholder="Server Name"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        value={embed.url}
                        onChange={(e) => {
                          const newEmbeds = [...embeds]
                          newEmbeds[idx].url = e.target.value
                          setEmbeds(newEmbeds)
                        }}
                        className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-purple-500 outline-none font-mono text-zinc-300"
                        placeholder="https://..."
                      />
                    </div>
                    <button 
                      onClick={() => setEmbeds(embeds.filter((_, i) => i !== idx))}
                      className="text-red-500/50 hover:text-red-400 p-2 rounded-lg hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <button 
                onClick={saveContent}
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>
                    <Save size={20} />
                    Save to Database
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
