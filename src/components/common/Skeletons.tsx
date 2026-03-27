import { memo } from 'react'

export const SkeletonVideoCard = memo(() => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-luxury-charcoal">
      <div className="aspect-video w-full overflow-hidden rounded-b-xl bg-zinc-900">
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-zinc-800 via-zinc-700/60 to-zinc-800" />
      </div>
      <div className="p-3 min-h-[64px]">
        <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800 mb-2" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800 mb-2" />
        <div className="h-2 w-1/4 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  )
})

export const SkeletonPosterCard = memo(() => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-luxury-charcoal">
      <div className="aspect-[2/3] w-full overflow-hidden rounded-b-xl bg-zinc-900">
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-zinc-800 via-zinc-700/60 to-zinc-800" />
      </div>
      <div className="p-3 flex flex-col justify-end min-h-[80px]">
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800 mb-2" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800 mb-2" />
        <div className="h-2 w-1/3 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  )
})

export const SkeletonHero = memo(() => {
  return (
    <div className="relative h-[85vh] w-full bg-black flex gap-0 overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div 
          key={i} 
          className="relative h-full w-64 sm:w-80 shrink-0 border-r border-white/5 bg-zinc-900 overflow-hidden"
        >
          <div className="absolute inset-0 animate-pulse bg-zinc-800/50" />
          <div className="absolute bottom-0 left-0 p-6 w-full space-y-3">
            <div className="h-8 w-3/4 animate-pulse rounded bg-zinc-700" />
            {i === 1 && (
              <>
                <div className="h-16 w-full animate-pulse rounded bg-zinc-700/50" />
                <div className="flex gap-3 pt-2">
                  <div className="h-9 w-28 animate-pulse rounded bg-zinc-700" />
                  <div className="h-9 w-28 animate-pulse rounded bg-zinc-700" />
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
})

export const SkeletonGrid = ({ count = 8, variant = 'video' }: { count?: number; variant?: 'video' | 'poster' }) => {
  const Item = variant === 'poster' ? SkeletonPosterCard : SkeletonVideoCard
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  )
}

export const SkeletonDetails = memo(() => {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="aspect-[2/3] w-60 animate-pulse rounded-lg bg-zinc-800" />
      <div className="flex-1 space-y-3">
        <div className="h-7 w-1/2 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-800" />
        <div className="h-24 w-full animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  )
})

export const SkeletonProfile = memo(() => {
  return (
    <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full space-y-4 animate-pulse">
      <div className="h-10 w-48 bg-zinc-800 rounded mb-8"></div>
      <div className="rounded-lg border border-zinc-800 p-6 h-64 bg-zinc-900/50">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-24 h-24 bg-zinc-800 rounded-full"></div>
          <div className="flex-1">
            <div className="h-6 w-32 bg-zinc-800 rounded mb-2"></div>
            <div className="h-4 w-48 bg-zinc-800 rounded"></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-10 bg-zinc-800 rounded"></div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-zinc-800 rounded"></div>
            <div className="h-10 w-32 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-800 p-4 h-48 bg-zinc-900/50"></div>
        <div className="rounded-lg border border-zinc-800 p-4 h-48 bg-zinc-900/50"></div>
      </div>
    </div>
  )
})
