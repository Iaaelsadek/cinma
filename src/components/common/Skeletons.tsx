import { memo } from 'react'

export const SkeletonVideoCard = memo(() => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-luxury-charcoal">
      <div className="aspect-video w-full overflow-hidden rounded-b-xl bg-zinc-900">
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-zinc-800 via-zinc-700/60 to-zinc-800" />
      </div>
      <div className="p-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-zinc-800" />
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
      <div className="p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  )
})

export const SkeletonGrid = ({ count = 8, variant = 'video' }: { count?: number; variant?: 'video' | 'poster' }) => {
  const Item = variant === 'poster' ? SkeletonPosterCard : SkeletonVideoCard
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  )
}
