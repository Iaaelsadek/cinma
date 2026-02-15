import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Server as ServerIcon, AlertTriangle, Loader2 } from 'lucide-react';

interface Server {
  name: string;
  url: string;
  priority: number;
  responseTime?: number;
}

const ServerSwitcher = ({
  tmdbId,
  type,
  season,
  episode
}: {
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
}) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [currentServer, setCurrentServer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    loadServers();
  }, [tmdbId, type, season, episode]);

  const loadServers = async () => {
    setLoading(true);
    
    let dbLinks: Record<string, string> = {};
    
    // 1. Try to fetch from DB
    if (type === 'movie') {
      const { data } = await supabase
        .from('movies')
        .select('embed_links')
        .eq('id', tmdbId)
        .maybeSingle();
      if (data?.embed_links) dbLinks = data.embed_links;
    } else if (type === 'tv' && season && episode) {
        // Try to find episode links
        // First find season id
        const { data: seasonData } = await supabase
            .from('seasons')
            .select('id')
            .eq('series_id', tmdbId)
            .eq('season_number', season)
            .maybeSingle();
            
        if (seasonData) {
             const { data: epData } = await supabase
                .from('episodes')
                .select('embed_links')
                .eq('season_id', seasonData.id)
                .eq('episode_number', episode)
                .maybeSingle();
             if (epData?.embed_links) dbLinks = epData.embed_links;
        }
    }

    // 2. Generate fallback links for common reliable servers if not in DB
    const defaultServers = ['vidsrc', '2embed', 'embed_su', 'autoembed'];
    defaultServers.forEach(server => {
        if (!dbLinks[server]) {
            let url = '';
            if (server === 'vidsrc') {
                url = type === 'movie' 
                    ? `https://vidsrc.to/embed/movie/${tmdbId}`
                    : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
            } else if (server === '2embed') {
                url = type === 'movie'
                    ? `https://www.2embed.cc/embed/${tmdbId}`
                    : `https://www.2embed.cc/embed/tv/${tmdbId}&s=${season}&e=${episode}`;
            } else if (server === 'embed_su') {
                url = type === 'movie'
                    ? `https://embed.su/embed/movie/${tmdbId}`
                    : `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`;
            } else if (server === 'autoembed') {
                 url = type === 'movie'
                    ? `https://autoembed.to/movie/tmdb/${tmdbId}`
                    : `https://autoembed.to/tv/tmdb/${tmdbId}-${season}x${episode}`;
            }
            if (url) dbLinks[server] = url;
        }
    });

    // 3. Get priorities and response times
    const { data: sources } = await supabase
        .from('embed_sources')
        .select('name, priority, response_time_ms')
        .in('name', Object.keys(dbLinks));

    const serverList = Object.entries(dbLinks).map(([name, url]) => {
        const source = sources?.find(s => s.name === name);
        return {
            name,
            url: url as string,
            priority: source?.priority || 5,
            responseTime: source?.response_time_ms
        };
    }).sort((a, b) => a.priority - b.priority);

    setServers(serverList);
    setLoading(false);
  };

  const reportBroken = async () => {
    setReporting(true);
    const server = servers[currentServer];
    try {
        await supabase.from('link_checks').insert({
            content_id: tmdbId,
            content_type: type,
            source_name: server.name,
            url: server.url,
            status_code: 0, // 0 indicates reported by user manually
            response_time_ms: 0
        });
        
        // Optimistically remove from UI to improve UX immediately
        const newServers = servers.filter((_, i) => i !== currentServer);
        setServers(newServers);
        setCurrentServer(0);
    } catch (e) {
        console.error(e);
    }
    setReporting(false);
  };

  if (loading) {
    return <div className="animate-pulse bg-zinc-900/50 h-96 rounded-xl border border-white/5" />;
  }

  return (
    <div className="space-y-6">
      {/* Server List */}
      <div className="flex flex-wrap gap-3">
        {servers.map((server, idx) => (
          <button
            key={server.name}
            onClick={() => setCurrentServer(idx)}
            className={`
              relative group flex items-center gap-3 px-5 h-11 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300
              ${currentServer === idx 
                ? 'bg-gradient-to-r from-primary to-luxury-purple text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] scale-105 border-primary' 
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white border-white/5 hover:border-white/10'
              }
              border
            `}
          >
            <ServerIcon size={14} className={currentServer === idx ? 'animate-pulse' : ''} />
            <span>{server.name === 'vidsrc' ? 'VidSrc' : server.name === '2embed' ? '2Embed' : server.name}</span>
            {server.responseTime && server.responseTime < 1000 && (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" title={`${server.responseTime}ms`} />
            )}
          </button>
        ))}
      </div>

      {/* Player */}
      {servers.length > 0 ? (
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl ring-1 ring-white/5 group">
          <iframe
            key={servers[currentServer].url}
            src={servers[currentServer].url}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
          
          <button
            onClick={reportBroken}
            disabled={reporting}
            className="absolute bottom-6 right-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-2 bg-black/80 backdrop-blur-md hover:bg-red-900/80 text-white/50 hover:text-white px-4 h-11 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 transition-all duration-300"
          >
            {reporting ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} className="text-red-500" />}
            <span>Report Issue</span>
          </button>
        </div>
      ) : (
        <div className="aspect-video bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border border-white/10 gap-4">
            <AlertTriangle size={48} className="text-zinc-700" />
            <p className="text-zinc-500 font-medium">No active servers found for this content.</p>
        </div>
      )}
    </div>
  );
}

export default ServerSwitcher
