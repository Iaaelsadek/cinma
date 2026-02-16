import { useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Autoplay } from 'swiper/modules'
import { ChevronLeft, ChevronRight, Play, Star } from 'lucide-react'
import 'swiper/css'
import 'swiper/css/navigation'

type MovieMeta = { 
  id: number
  poster_path?: string | null
  media_type?: 'movie' | 'tv'
  title?: string
  name?: string
  vote_average?: number
  overview?: string
}

const IMG = (path?: string | null, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : ''

export const CinemaTrain = ({ items }: { items: MovieMeta[] }) => {
  const navigate = useNavigate()
  const goTo = (m: MovieMeta) => {
    const isTv = m.media_type === 'tv'
    navigate(isTv ? `/series/${m.id}` : `/movie/${m.id}`)
  }

  if (!items || items.length === 0) return null
  
  const filteredItems = items.filter(m => (m.vote_average || 0) >= 5)
  if (filteredItems.length === 0) return null

  return (
    <div className="relative z-20 mx-auto max-w-[2560px]" dir="rtl">
      {/* Walking Character */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-32 h-32 hidden md:block">
        <img 
          src="https://media.tenor.com/B9O5875t8xcAAAAi/walking.gif" 
          alt="Walking Character"
          className="w-full h-full object-contain drop-shadow-2xl opacity-90 scale-x-[-1]" 
        />
      </div>

      <div className="relative group">
        <Swiper
          modules={[Navigation, Autoplay]}
          spaceBetween={20}
          slidesPerView="auto"
          loop={true}
          speed={1000}
          dir="rtl"
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
          }}
          navigation={{
            nextEl: '.swiper-prev-custom', // Swapped for RTL logical direction
            prevEl: '.swiper-next-custom',
          }}
          className="!overflow-visible py-8"
          breakpoints={{
            320: { slidesPerView: 1, spaceBetween: 12 },
            480: { slidesPerView: 2, spaceBetween: 16 },
            640: { slidesPerView: 3, spaceBetween: 20 },
            768: { slidesPerView: 4, spaceBetween: 24 },
            1024: { slidesPerView: 5, spaceBetween: 24 },
            1280: { slidesPerView: 6, spaceBetween: 24 },
            1536: { slidesPerView: 7, spaceBetween: 24 }, // 2xl
            1920: { slidesPerView: 8, spaceBetween: 32 }, // 3xl (TV)
            2560: { slidesPerView: 10, spaceBetween: 32 }, // 4xl
          }}
        >
          {filteredItems.map((m) => (
            <SwiperSlide key={m.id} className="!w-auto">
              <div
                className="group/card relative cursor-pointer w-40 h-60 md:w-52 md:h-80 lg:w-60 lg:h-96 3xl:w-64 3xl:h-[26rem] transition-all duration-500 ease-out hover:scale-110 hover:z-50"
                onClick={() => goTo(m)}
              >
                {/* Neon Glow Container */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-cyan-500 opacity-0 blur-lg transition-opacity duration-500 group-hover/card:opacity-70" />
                
                {/* Card Content */}
                <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-xl transition-all duration-300 group-hover/card:border-primary/50">
                  {m.poster_path ? (
                    <img
                      src={IMG(m.poster_path)}
                      alt={m.title || m.name || ''}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110 group-hover/card:brightness-50"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                      <span className="text-xs">NO POSTER</span>
                    </div>
                  )}

                  {/* Rating Badge (Always Visible) */}
                  <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
                    {m.vote_average && (
                      <div className="flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-md border border-white/10">
                        <Star size={10} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-bold text-white">{m.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                    <div className="rounded-md bg-primary/80 px-1.5 py-0.5 backdrop-blur-md border border-white/10">
                      <span className="text-[9px] font-black text-black uppercase tracking-wider">
                        {m.media_type === 'tv' ? 'SERIES' : 'MOVIE'}
                      </span>
                    </div>
                  </div>

                  {/* Hover Overlay Info */}
                  <div className="absolute inset-0 z-10 flex flex-col justify-end p-4 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 bg-gradient-to-t from-black via-black/60 to-transparent">
                    
                    {/* Play Button */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform scale-50 opacity-0 transition-all duration-300 group-hover/card:scale-100 group-hover/card:opacity-100">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-black shadow-lg shadow-primary/40">
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>

                    <div className="transform translate-y-4 transition-transform duration-300 group-hover/card:translate-y-0">
                      {/* Category / Type */}
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {m.media_type === 'tv' ? 'مسلسل' : 'فيلم'}
                      </div>
                      
                      {/* Title */}
                      <h3 className="line-clamp-1 text-sm font-black text-white leading-tight">
                        {m.title || m.name}
                      </h3>

                      {/* Overview */}
                      {m.overview && (
                        <p className="mt-1 line-clamp-2 text-[10px] text-zinc-300 leading-snug">
                          {m.overview}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Buttons */}
        <button 
          className="swiper-next-custom absolute -right-4 top-1/2 -translate-y-1/2 z-30 h-12 w-12 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all hover:bg-primary hover:text-black hover:scale-110 disabled:opacity-0 disabled:pointer-events-none opacity-0 group-hover:opacity-100"
          aria-label="Next"
        >
          <ChevronRight size={24} />
        </button>
        <button 
          className="swiper-prev-custom absolute -left-4 top-1/2 -translate-y-1/2 z-30 h-12 w-12 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all hover:bg-primary hover:text-black hover:scale-110 disabled:opacity-0 disabled:pointer-events-none opacity-0 group-hover:opacity-100"
          aria-label="Previous"
        >
          <ChevronLeft size={24} />
        </button>
      </div>
    </div>
  )
}
