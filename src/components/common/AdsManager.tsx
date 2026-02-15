import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { FLAGS } from '../../lib/constants'

type AdRow = {
  id: number
  name: string
  type: 'popunder' | 'banner' | 'preroll' | 'midroll'
  code: string
  position?: 'top' | 'bottom' | 'sidebar' | 'player' | 'global' | string | null
  active?: boolean | null
  impressions?: number | null
  clicks?: number | null
}

type Props = {
  type: 'popunder' | 'banner' | 'preroll'
  position?: 'top' | 'bottom' | 'sidebar' | 'player' | 'global' | string
  onDone?: () => void
  durationSeconds?: number
}

async function fetchAd(type: AdRow['type'], position?: string) {
  let q = supabase.from('ads').select('*').eq('active', true).eq('type', type).order('created_at', { ascending: false })
  if (position) {
    q = q.eq('position', position)
  }
  const { data } = await q.limit(1)
  return (data?.[0] as AdRow | undefined) || null
}

async function incImpression(ad: AdRow) {
  try {
    await supabase.rpc?.('increment_ad_impressions', { ad_id: ad.id })
  } catch {
    try {
      await supabase.from('ads').update({ impressions: (ad.impressions || 0) + 1 }).eq('id', ad.id)
    } catch {}
  }
}

async function incClick(ad: AdRow) {
  try {
    await supabase.rpc?.('increment_ad_clicks', { ad_id: ad.id })
  } catch {
    try {
      await supabase.from('ads').update({ clicks: (ad.clicks || 0) + 1 }).eq('id', ad.id)
    } catch {}
  }
}

export const AdsManager = ({ type, position, onDone, durationSeconds = 8 }: Props) => {
  const [ad, setAd] = useState<AdRow | null>(null)
  const [countdown, setCountdown] = useState(durationSeconds)
  const onceRef = useRef(false)
  const visible = !!ad
  if (!FLAGS.ADS_ENABLED) return null
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const a = await fetchAd(type, position)
        if (!cancelled) setAd(a)
      } catch {
        if (!cancelled) setAd(null)
      }
    })()
    return () => { cancelled = true }
  }, [type, position])

  useEffect(() => {
    if (!ad) return
    incImpression(ad).catch(() => {})
  }, [ad])

  useEffect(() => {
    if (type !== 'popunder' || !ad) return
    const key = 'cinma_popunder_once'
    if (sessionStorage.getItem(key) === '1') return
    const handler = () => {
      if (onceRef.current) return
      onceRef.current = true
      sessionStorage.setItem(key, '1')
      const w = window.open('', '_blank', 'noopener,noreferrer')
      if (w) {
        try {
          w.document.write(ad.code || '<p>Ad</p>')
          w.document.close()
          incImpression(ad).catch(() => {})
          w.addEventListener('click', () => incClick(ad).catch(() => {}))
        } catch {}
      }
    }
    document.addEventListener('click', handler, { once: true })
    return () => document.removeEventListener('click', handler)
  }, [type, ad])

  if (!visible) return null

  if (type === 'banner') {
    return (
      <div
        className={`rounded-md border border-zinc-800 bg-zinc-900 p-3 text-center`}
        onClick={() => ad && incClick(ad)}
      >
        <div dangerouslySetInnerHTML={{ __html: ad?.code || '' }} />
      </div>
    )
  }

  if (type === 'preroll') {
    useEffect(() => {
      if (!ad) return
      setCountdown(durationSeconds)
      const t = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(t)
            onDone?.()
            return 0
          }
          return c - 1
        })
      }, 1000)
      return () => clearInterval(t)
    }, [ad, durationSeconds, onDone])
    return (
      <div className="relative z-10 flex h-full w-full items-center justify-center bg-black/90">
        <div className="absolute right-3 top-3 text-xs text-white/80">ينتهي خلال {countdown}s</div>
        <div className="absolute left-3 top-3">
          <button
            onClick={() => onDone?.()}
            className="rounded-md bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
          >
            تخطي
          </button>
        </div>
        <div className="max-w-3xl rounded-md border border-zinc-700 bg-zinc-900 p-4">
          <div dangerouslySetInnerHTML={{ __html: ad?.code || '<div class=\"text-white\">إعلان</div>' }} />
        </div>
      </div>
    )
  }

  return null
}
