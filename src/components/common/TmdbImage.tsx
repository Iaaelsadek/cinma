import { useState, memo } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type TmdbImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original'

interface TmdbImageProps extends React.HTMLAttributes<HTMLDivElement> {
  path?: string | null
  size?: TmdbImageSize
  fallback?: React.ReactNode
  showLoading?: boolean
  sizes?: string
  priority?: boolean
  alt: string
  imgClassName?: string
}

const getUrl = (path: string, size: TmdbImageSize) => {
  if (path.startsWith('http')) return path
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export const TmdbImage = memo(({
  path,
  size = 'w342',
  fallback,
  showLoading = true,
  className = '',
  imgClassName = '',
  alt,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  ...props
}: TmdbImageProps) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  if (!path) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-700 ${className}`} {...props}>
        {fallback || <ImageOff className="h-8 w-8 opacity-20" />}
      </div>
    )
  }

  const src = getUrl(path, size)
  // Generate srcset for responsive images if using standard sizes
  const srcSet = !path.startsWith('http') && size !== 'original' 
    ? `${getUrl(path, 'w342')} 342w, ${getUrl(path, 'w500')} 500w, ${getUrl(path, 'w780')} 780w`
    : undefined

  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${className}`} {...props}>
      <AnimatePresence>
        {status === 'loading' && showLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900"
          >
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchpriority={priority ? 'high' : 'low'}
        className={`h-full w-full object-cover transition-all duration-500 select-none ${status === 'loaded' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        onDragStart={(e) => e.preventDefault()} 
      />

      {status === 'error' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900 text-zinc-700">
          {fallback || <ImageOff className="h-8 w-8 opacity-20" />}
        </div>
      )}
    </div>
  )
})
