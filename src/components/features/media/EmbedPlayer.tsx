import { Signal, Lightbulb, WifiOff, Wifi, SkipForward, AlertTriangle, Loader2, RefreshCcw, Play, Pause, Volume2, VolumeX, Maximize, FastForward, Rewind, Rocket, ArrowDown, Settings, Subtitles, Monitor } from 'lucide-react'
import { Server } from '../../../hooks/useServers'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useMemo, useRef } from 'react'
import { clsx } from 'clsx'
import { logger } from '../../../lib/logger'

type Props = {
  server: Server | undefined
  cinemaMode: boolean
  toggleCinemaMode: () => void
  loading: boolean
  onNextServer: () => void
  onReport: () => void
  reporting: boolean
  lang?: 'ar' | 'en'
}

export const EmbedPlayer = ({ 
  server, 
  cinemaMode, 
  toggleCinemaMode, 
  loading, 
  onNextServer, 
  onReport, 
  reporting, 
  lang = 'ar'
}: Props) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [isIframeLoading, setIsIframeLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [isSlowConnection, setIsSlowConnection] = useState(false)
  const [clicksAbsorbed, setClicksAbsorbed] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false) // Optimistic UI state
  const [hasStarted, setHasStarted] = useState(false) // Tracks if user has ever clicked start
  const [startClicks, setStartClicks] = useState(0) // Tracks number of clicks on start overlay
  const [isUserActive, setIsUserActive] = useState(true) // Track mouse movement
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [quality, setQuality] = useState('1080p')
  const [ccEnabled, setCcEnabled] = useState(false)
  const [playerUrl, setPlayerUrl] = useState<string | undefined>(server?.url)
  const [subtitleRequested, setSubtitleRequested] = useState(false)
  
  // Progress Bar State (Experimental)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(7200) // Default 2 hours if unknown

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const trustedOrigin = useMemo(() => {
    try {
      if (!playerUrl) return null
      const parsed = new URL(playerUrl, window.location.origin)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
      return parsed.origin
    } catch {
      return null
    }
  }, [playerUrl])

  // SIMULATED PROGRESS: Increment timer if playing
  // useEffect(() => {
  //   let interval: number;
  //   if (isPlaying) {
  //     interval = window.setInterval(() => {
  //        setCurrentTime(prev => {
  //          if (prev >= duration) return duration;
  //          return prev + 1;
  //        });
  //     }, 1000);
  //   }
  //   return () => clearInterval(interval);
  // }, [isPlaying, duration]);

  // Auto-hide controls logic
  useEffect(() => {
    let timeout: number | undefined
    
    const handleActivity = () => {
      setIsUserActive(true);
      if (timeout !== undefined) {
        clearTimeout(timeout)
      }
      
      // Only hide if playing AND has started AND quality menu is closed
      if (isPlaying && hasStarted && !showQualityMenu) {
        timeout = window.setTimeout(() => {
          setIsUserActive(false);
        }, 3000);
      }
    };

    // If paused or hasn't started, always show controls (if started)
    if (!isPlaying || !hasStarted) {
      setIsUserActive(true);
      if (timeout !== undefined) {
        clearTimeout(timeout)
      }
    } else {
      // Start timer immediately if playing
      timeout = window.setTimeout(() => {
        setIsUserActive(false);
      }, 3000);
    }

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      if (timeout !== undefined) {
        clearTimeout(timeout)
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [isPlaying, hasStarted]);

  // Connection Quality Detection
  useEffect(() => {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection
      const updateConn = () => {
        setIsSlowConnection(conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === '3g')
      }
      conn.addEventListener('change', updateConn)
      updateConn()
      return () => conn.removeEventListener('change', updateConn)
    }
  }, [])

  // Auto-switch Logic if loading takes too long
  useEffect(() => {
    let timeout: number | null = null
    
    if (isIframeLoading && server) {
      // If server doesn't load in 15 seconds, consider it a failure and offer next
      timeout = window.setTimeout(() => {
        if (isIframeLoading) {
           // We don't auto-switch immediately to avoid annoying the user, 
           // but we show a helpful warning and a quick-switch button
           onNextServer()
        }
      }, 15000)
    }

    return () => {
      if (timeout) window.clearTimeout(timeout)
    }
  }, [isIframeLoading, server?.url, onNextServer])

  // Reset loading state when server changes
  useEffect(() => {
    setIsIframeLoading(true)
    setRetryCount(0)
    setClicksAbsorbed(0)
    setPlayerUrl(server?.url)
    setSubtitleRequested(false)
  }, [server?.url, server?.id])

  const addSubtitleParam = (url: string, param: string) => {
    const key = param.split('=')[0]
    const hasParam = new RegExp(`([?&])${key}=`, 'i').test(url)
    if (hasParam) return url
    const sep = url.includes('?') ? '&' : (url.includes('&season=') && !url.includes('?') ? '&' : '?')
    return `${url}${sep}${param}`
  }

  const withArabicSubtitleHints = (url: string, serverId?: string) => {
    let next = url
    if (serverId?.startsWith('vidsrc_')) {
      next = addSubtitleParam(next, 'subtitles=ar')
      next = addSubtitleParam(next, 'lang=ar')
      return next
    }
    if (serverId === 'autoembed_co') {
      next = addSubtitleParam(next, 'lang=ar')
      next = addSubtitleParam(next, 'subtitles=ar')
      return next
    }
    if (serverId?.startsWith('2embed')) {
      next = addSubtitleParam(next, 'subtitles=ar')
      next = addSubtitleParam(next, 'lang=ar')
      return next
    }
    if (serverId === '111movies') {
      next = addSubtitleParam(next, 'lang=ar')
      return next
    }
    if (serverId === 'smashystream' || serverId === 'moviebox' || serverId === 'streamwish') {
      next = addSubtitleParam(next, 'sub=ar')
      next = addSubtitleParam(next, 'lang=ar')
      return next
    }
    return url
  }

  const requestArabicSubtitles = () => {
    if (!server?.url) return
    const updated = withArabicSubtitleHints(server.url, server.id)
    setSubtitleRequested(true)
    setIsIframeLoading(true)
    setPlayerUrl(updated)
  }

  // POPUP BLOCKER: Attempt to neutralize window.open from within the component scope
  // Note: This is a best-effort approach. Cross-origin iframes are protected, but some 
  // older ad scripts try to open windows from the parent or shared context.
  useEffect(() => {
    const originalOpen = window.open;
    // Monkey Patch window.open to block popups - RETURN A FAKE WINDOW OBJECT
    (window as any).open = function(url: string, target: string, features: string) {
      logger.debug('🚫 Mocked popup attempt:', url)
      // Return a fake window object to fool ad scripts that check for 'popup.closed' or 'popup.focus'
      return {
        closed: false,
        focus: () => { logger.debug('🚫 Mocked focus call') },
        close: () => { logger.debug('🚫 Mocked close call') },
        document: { write: () => {} },
        location: { href: url }
      };
    };

    return () => {
      // Restore original on cleanup
      (window as any).open = originalOpen;
    };
  }, []);

  // LINK INTERCEPTOR: Prevent anchor tags from opening new windows (target="_blank")
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link) {
        // If it tries to open in new tab/window, force it to stay or block it
        if (link.target === '_blank') {
          logger.debug('🚫 Blocked link popup:', link.href)
          e.preventDefault();
          e.stopPropagation();
          // Optionally: link.target = '_self'; // To force open in same tab (risky for video player)
        }
      }
    };

    // Capture phase to intercept before it bubbles
    window.addEventListener('click', handleLinkClick, true);

    return () => {
      window.removeEventListener('click', handleLinkClick, true);
    };
  }, []);

  // PROGRESS BAR & SYNC: Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow
      if (!iframeWindow || !trustedOrigin) return
      if (event.source !== iframeWindow) return
      if (event.origin !== trustedOrigin) return

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Check for common player events (jwplayer, clappr, etc)
        if (data && (data.event === 'timeupdate' || data.type === 'timeupdate' || data.event === 'play' || data.type === 'play' || data.event === 'playing' || data.type === 'playing')) {
           const time = data.position || data.currentTime || data.time;
           const dur = data.duration || data.totalTime;
           if (time) setCurrentTime(time);
           if (dur) setDuration(dur);

           // Smart Activation: If video started, enable controls immediately!
           setHasStarted(prev => {
             if (!prev) {
               logger.debug('🎬 Smart Detection: Video started! Activating controls...')
                setIsPlaying(true);
                setStartClicks(2); // Force completion
                return true;
             }
             return prev;
           });
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [trustedOrigin]);

  // FOCUS DETECTION: If user clicks the iframe, window loses focus -> we assume playing started
  useEffect(() => {
    const onBlur = () => {
      if (document.activeElement instanceof HTMLIFrameElement) {
         logger.debug('🖱️ Iframe clicked (Focus lost) -> Incrementing Start Clicks')
         
         setStartClicks(prev => {
           const newCount = prev + 1;
           
           // HACK: Refocus window after first click so we can detect the second click!
           if (newCount === 1) {
              setTimeout(() => {
                 window.focus();
                 logger.debug('🔄 Refocusing window to capture second click...')
              }, 200);
           }

           if (newCount >= 2) {
              setIsPlaying(true);
              setHasStarted(true); // Mark as started forever after 2nd click
           }
           return newCount;
         });
      }
    };
    
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  if (loading) {
    return (
      <div className="aspect-video w-full rounded-[2rem] border border-white/5 bg-[#0a0a0a] animate-pulse flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="animate-spin text-primary" size={56} />
          <div className="absolute inset-0 blur-3xl bg-primary/20 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
           <span className="block text-xs font-black text-primary uppercase tracking-[0.3em] animate-pulse">
             {t('جاري التحميل...', 'INITIALIZING STREAM')}
           </span>
           <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
             {t('البحث عن أفضل مسار للمشاهدة...', 'OPTIMIZING CONNECTION PATH...')}
           </span>
        </div>
      </div>
    )
  }

  // --- FORCE SHOW: Never show offline screen, even if server is offline ---
  // const isOffline = server?.status === 'offline'
  // const isDegraded = server?.status === 'degraded'
  const isOffline = false; 
  const isDegraded = false;
  
  // --- IGNORE ERROR SCREEN ---
  // if (isOffline && !isIframeLoading) { ... } -> Removed/Bypassed

  const handleIframeLoad = () => {
    setIsIframeLoading(false)
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setIsIframeLoading(true)
  }

  // POSTMESSAGE CONTROL: Attempt to control iframe player externally
  const handleExternalControl = (action: string, value?: any) => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      if (!trustedOrigin) return
      // Optimistic Update
      if (action === 'play') setIsPlaying(true);
      if (action === 'pause') setIsPlaying(false);
      if (action === 'mute') setIsMuted(true);
      if (action === 'unmute') setIsMuted(false);
      if (action === 'captions') setCcEnabled(prev => !prev);
      if (action === 'quality') setQuality(value);

      // PostMessage Commands
      let msgs: any[] = [];
      
      if (action === 'play' || action === 'pause') {
         msgs = [
          { event: 'command', func: action === 'play' ? 'playVideo' : 'pauseVideo' }, // YouTube/Google
          { method: action }, // Vimeo
          { type: action }, // Generic
          action
        ];
      } else if (action === 'mute' || action === 'unmute') {
        msgs = [
           { event: 'command', func: action === 'mute' ? 'mute' : 'unMute' },
           { method: action === 'mute' ? 'setVolume' : 'setVolume', value: action === 'mute' ? 0 : 1 },
           { type: action }
        ];
      } else if (action === 'seek_forward') {
         // Generic seek forward 10s
         setCurrentTime(prev => Math.min(prev + 10, duration));
         msgs = [
             { event: 'command', func: 'seekTo', args: [10, true] }, // YouTube style relative seek is hard, usually absolute
             { method: 'seekTo', value: 10 } 
         ];
      } else if (action === 'seek_backward') {
          // Generic seek backward 10s
          setCurrentTime(prev => Math.max(prev - 10, 0));
          msgs = [
              { event: 'command', func: 'seekTo', args: [-10, true] },
              { method: 'seekTo', value: -10 }
          ];
      } else if (action === 'captions') {
          msgs = [{ event: 'command', func: ccEnabled ? 'hideCaptions' : 'showCaptions' }];
      } else if (action === 'quality') {
          msgs = [{ event: 'command', func: 'setPlaybackQuality', args: [value] }];
      } else if (action === 'seek') {
          // Absolute seek from progress bar
          setCurrentTime(value);
          msgs = [
             { event: 'command', func: 'seekTo', args: [value, true] },
             { method: 'seekTo', value: value }
          ];
      }

      // Keyboard Simulation Fallback
      if (action === 'seek_forward') {
         // Simulate Right Arrow
         iframe.focus();
         window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true }));
      } else if (action === 'seek_backward') {
         // Simulate Left Arrow
         iframe.focus();
         window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true }));
      } else if (action === 'play' || action === 'pause') {
         // Force focus and send Space key - Safe for Play/Pause toggle
         iframe.focus();
         setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
         }, 50);
      } else if (action === 'mute' || action === 'unmute') {
         // Simulate M
         iframe.focus();
         window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', code: 'KeyM', bubbles: true }));
      }

      // DIRECT CLICK SIMULATION (The Ultimate Fallback)
      // If server ignores everything, we might just focus the iframe and hope user clicks work better
      // But for Play/Pause specifically, we can try to send a click event to the document body of iframe (if same origin)
      // or just rely on the Space key above.
      
      msgs.forEach(msg => {
        iframe.contentWindow?.postMessage(JSON.stringify(msg), trustedOrigin);
        iframe.contentWindow?.postMessage(msg, trustedOrigin);
      });
      
      logger.debug(`📡 Sent external ${action} command to iframe`, value)
    }
  };

  // Attempt to enter fullscreen on the wrapper div
  const toggleFullscreen = () => {
     const wrapper = document.querySelector('.player-wrapper');
     if (wrapper) {
       if (!document.fullscreenElement) {
         wrapper.requestFullscreen().catch(err => logger.error(err))
       } else {
         document.exitFullscreen();
       }
     }
  }

  // --- NEW: Direct Click Handler for Play/Pause Button ---
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 1. Force Focus on Iframe First!
    const iframe = iframeRef.current;
    if (iframe) {
       iframe.focus();
       logger.debug('🎯 Focused iframe for keyboard event')
    }

    // 2. Determine Action
    const cmd = isPlaying ? 'pause' : 'play';
    
    // 3. Send Space Key (The most reliable method after focus)
    // We send it multiple times with slight delays to ensure the player catches it
    setTimeout(() => {
       window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
    }, 50);
    setTimeout(() => {
       window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
    }, 100);

    // 4. Also try postMessage as backup
    handleExternalControl(cmd);

    // 5. Optimistic UI Update
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-4">
      {/* Header: Stream Status & Cinema Mode */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-4">
          <div className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-tighter transition-all duration-500",
            isOffline ? "border-red-500/20 bg-red-500/10 text-red-500" : 
            isDegraded ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500" : 
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          )}>
            <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", isOffline ? "bg-red-500" : isDegraded ? "bg-yellow-500" : "bg-emerald-500")} />
            <Signal size={10} />
            <span>{isOffline ? t('غير متصل', 'Offline') : isDegraded ? t('بطيء', 'Degraded') : t('اتصال آمن', 'Secure Stream')}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleCinemaMode}
            className={clsx(
              "group relative flex items-center gap-2 px-6 py-3 rounded-xl text-xs md:text-sm font-black uppercase tracking-tight transition-all duration-500 border overflow-hidden",
              cinemaMode 
                ? "bg-primary border-primary text-black shadow-[0_0_20px_rgba(245,197,24,0.3)]" 
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
            )}
          >
            <Lightbulb size={16} className={clsx("transition-transform duration-500", cinemaMode ? "fill-black scale-110" : "group-hover:scale-110")} />
            <span>{cinemaMode ? t('إيقاف السينما', 'Cinema ON') : t('وضع السينما', 'Cinema Mode')}</span>
          </button>
        </div>
      </div>

      {/* Video Player Container */}
      <div className={clsx(
        "relative aspect-video w-full overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group player-wrapper",
        cinemaMode 
          ? 'fixed inset-0 z-[60] h-screen w-screen rounded-none border-none bg-black' 
          : 'rounded-[2rem] border border-white/10 bg-black shadow-2xl ring-1 ring-white/5'
      )}>
        {/* Iframe Loading State */}
        <AnimatePresence>
          {isIframeLoading && server && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl gap-4"
            >
              <div className="relative">
                <Loader2 className="animate-spin text-primary" size={56} />
                <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  {t('جاري تحميل الفيديو...', 'LOADING VIDEO...')}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Frame */}
        <div className="h-full w-full relative">
          {/* ALWAYS RENDER IFRAME - NEVER SHOW ERROR SCREEN */}
          <iframe
              key={`${playerUrl || 'loading'}-${retryCount}`}
              src={playerUrl}
              ref={iframeRef}
              className={clsx(
                "h-full w-full bg-black transition-opacity duration-1000",
                isIframeLoading ? "opacity-0" : "opacity-100"
              )}
              allowFullScreen
              scrolling="no"
              onLoad={handleIframeLoad}
              referrerPolicy="origin"
              style={{ border: 'none', overflow: 'hidden' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              title={`Stream ${server?.name || 'Loading...'}`}
            />
        </div>
        
        {/* Cinema Mode Close Button */}
        {cinemaMode && (
          <motion.button 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={toggleCinemaMode}
            className="absolute top-8 right-8 z-[70] flex items-center gap-4 px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white/20 transition-all group"
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">
              {t('إغلاق وضع السينما', 'Exit Cinema')}
            </span>
            <Lightbulb size={24} className="fill-white" />
          </motion.button>
        )}

        {/* Floating Controls for Iframe */}
        {!cinemaMode && !isIframeLoading && server && (
          <div className="absolute top-4 left-4 pointer-events-none">
             <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Wifi size={10} className="text-emerald-500" />
                <span>{t('بث مباشر', 'Live Stream')}</span>
             </div>
          </div>
        )}

        {/* External Controls (Experimental) */}
        {!isIframeLoading && server && (
          <div className="absolute inset-0 z-[100] pointer-events-none flex flex-col justify-end p-6 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             
             {/* FULL SHIELD: Blocks clicks on iframe TOP 85% ONLY */}
             {hasStarted && (
               <div className="absolute top-0 left-0 right-0 h-[85%] z-[200] pointer-events-none">
                 {/* Top Block */}
                 <div 
                   className="absolute top-0 left-0 right-0 h-[calc(50%-75px)] bg-transparent pointer-events-auto cursor-default"
                   onDoubleClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                   onClick={(e) => e.stopPropagation()}
                 />
                 
                 {/* Bottom Block (above the 15% open area) */}
                 <div 
                   className="absolute bottom-0 left-0 right-0 top-[calc(50%+75px)] bg-transparent pointer-events-auto cursor-default"
                   onDoubleClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                   onClick={(e) => e.stopPropagation()}
                 />

                 {/* Left Block */}
                 <div 
                   className="absolute top-[calc(50%-75px)] bottom-[calc(50%-75px)] left-0 w-[calc(50%-75px)] h-[150px] bg-transparent pointer-events-auto cursor-default"
                   onDoubleClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                   onClick={(e) => e.stopPropagation()}
                 />

                 {/* Right Block */}
                 <div 
                   className="absolute top-[calc(50%-75px)] bottom-[calc(50%-75px)] right-0 w-[calc(50%-75px)] h-[150px] bg-transparent pointer-events-auto cursor-default"
                   onDoubleClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                   onClick={(e) => e.stopPropagation()}
                 />
                 
                 {/* Center Hole is implicitly created by the space between these divs */}
               </div>
             )}

             {/* Center Play Button Overlay - TRANSPARENT TO ALLOW FIRST 2 CLICKS ON IFRAME */}
             {startClicks === 0 && (
               <div 
                  className={clsx(
                    "absolute inset-0 flex items-center justify-center transition-opacity duration-500",
                    "opacity-100 cursor-pointer"
                  )}
                  onClick={() => {
                     // We let the click pass through to iframe
                     // But we update our internal counter
                     setStartClicks(prev => prev + 1);
                  }}
                  style={{ pointerEvents: 'none' }} // Always allow click through to iframe initially
               >
                  {/* COMPLETELY TRANSPARENT - NO VISIBLE UI */}
               </div>
             )}

             {/* Floating Controls: Removed per request for minimalist look */}
             {/* Use Shield for Play/Pause (Click) and Fullscreen (DoubleClick) */}
          </div>
        )}
      </div>

      {/* Footer: Detailed Controls & Reporting */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 items-center gap-4 px-2">
        <div className="flex items-center gap-4 lg:col-span-2">
          <button 
            onClick={handleRetry}
            className="group flex items-center gap-3 text-xs md:text-sm font-black text-zinc-500 hover:text-white uppercase tracking-tight transition-colors"
          >
            <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
            <span>{t('إعادة اتصال', 'Reconnect')}</span>
          </button>
          <button
            onClick={requestArabicSubtitles}
            className={clsx(
              "group flex items-center gap-2 text-xs md:text-sm font-black uppercase tracking-tight transition-colors",
              subtitleRequested ? "text-emerald-400" : "text-zinc-500 hover:text-white"
            )}
          >
            <Subtitles size={16} />
            <span>{subtitleRequested ? t('تم طلب ترجمة عربية', 'Arabic Subtitle Requested') : t('طلب ترجمة عربية', 'Request Arabic Subtitles')}</span>
          </button>
        </div>

        <div className="flex justify-center order-first md:order-none lg:col-span-2">
           <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-2xl w-full md:w-auto">
              <button 
                onClick={onNextServer}
                className="flex items-center justify-center gap-3 px-10 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs md:text-sm font-black uppercase tracking-tight transition-all w-full"
              >
                <span>{t('تغيير السيرفر', 'Rotate Server')}</span>
                <SkipForward size={18} />
              </button>
           </div>
        </div>

        <div className="flex justify-end md:col-span-2 lg:col-span-2">
          <button 
            onClick={onReport}
            disabled={reporting}
            className={clsx(
              "flex items-center gap-3 px-6 py-3 rounded-xl text-xs md:text-sm font-black uppercase tracking-tight transition-all",
              reporting 
                ? "bg-red-500/20 text-red-500 border border-red-500/20" 
                : "text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
            )}
          >
            <AlertTriangle size={18} />
            <span>{reporting ? t('جاري الإبلاغ...', 'Reporting...') : t('إبلاغ عن عطل', 'Report Failure')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
