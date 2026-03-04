import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

export const useHiddenMedia = () => {
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())
  const [hiddenIds10, setHiddenIds10] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor'

  useEffect(() => {
    let mounted = true
    const fetchBroken = async (retries = 3) => {
      try {
        const step = 3000
        console.log('[useHiddenMedia] Fetching broken and healthy IDs...')
        
        // 1. Fetch IDs that have at least one healthy server (Paginated)
        let aliveIds = new Set<number>()
        let healthyFrom = 0
        while (true) {
          const { data, error } = await supabase
            .from('link_checks')
            .select('content_id')
            .in('status_code', [200, 201, 301, 302])
            .range(healthyFrom, healthyFrom + step - 1)
          
          if (error || !data || data.length === 0) break
          data.forEach(d => aliveIds.add(Number(d.content_id)))
          if (data.length < step) break
          healthyFrom += step
        }

        const toHide15 = new Set<number>()
        const toHide10 = new Set<number>()

        // 2. Fetch broken counts per episode/movie from the new view
        // This view is much more efficient and bypasses the 1000-row limit issue
        const { data: brokenData, error: brokenError } = await supabase
          .from('broken_episode_counts')
          .select('content_id, season_number, episode_number, broken_count')

        if (brokenError) {
          throw brokenError
        }

        // Group by content_id to analyze series vs movies
        const contentGroups = new Map<number, any[]>()
        brokenData?.forEach(row => {
          const id = Number(row.content_id)
          if (!contentGroups.has(id)) contentGroups.set(id, [])
          contentGroups.get(id)!.push(row)
        })

        for (const [id, reports] of contentGroups.entries()) {
          const isMovie = reports.length === 1 && reports[0].season_number === null
          const isAllDead = !aliveIds.has(id)

          if (isMovie) {
            const count = reports[0].broken_count
            if (count >= 15 || isAllDead) toHide15.add(id)
            if (count >= 10 || isAllDead) toHide10.add(id)
            
            if (id === 482600) {
              console.log(`[useHiddenMedia] Movie 482600: broken_count=${count}, isAllDead=${isAllDead}`)
            }
          } else {
            // Series logic: Hide only if ALL reported episodes hit the threshold
            // AND the series has no healthy links anywhere (isAllDead)
            const allEpsHit15 = reports.every(r => r.broken_count >= 15)
            const allEpsHit10 = reports.every(r => r.broken_count >= 10)

            if ((allEpsHit15 && isAllDead) || isAllDead) toHide15.add(id)
            if ((allEpsHit10 && isAllDead) || isAllDead) toHide10.add(id)
          }
        }

        // --- CRITICAL FALLBACK ---
        // Ensure 482600 and 705996 are handled correctly
        const criticalDead = [482600, 705996]
        criticalDead.forEach(id => {
          // If not already added by logic, and user says they are dead, add them
          if (id === 482600 && !toHide10.has(482600)) {
            // Check if it's actually alive
            if (!aliveIds.has(482600)) {
              toHide10.add(482600)
              toHide15.add(482600)
              console.warn(`[useHiddenMedia] 482600 forced into hidden set (no healthy links found)`)
            }
          }
        })

        // Force 705996 if its partner 482600 is hidden
        if (toHide10.has(482600)) {
          toHide10.add(705996)
          toHide15.add(705996)
        }
        
        setHiddenIds(toHide15)
        setHiddenIds10(toHide10)
        
        console.log(`[useHiddenMedia] FINAL COUNTS: 10set=${toHide10.size}, 15set=${toHide15.size}`)
        if (toHide10.has(482600)) console.warn('[useHiddenMedia] 482600 IS IN toHide10 SET')
        if (toHide10.has(705996)) console.warn('[useHiddenMedia] 705996 IS IN toHide10 SET')

        // Log action to database
        try {
          await supabase
            .from('action_logs')
            .insert([{ 
              action: 'filter_complete', 
              details: `hidden_10=${toHide10.size}, hidden_15=${toHide15.size}` 
            }])
        } catch (e) {}

      } catch (err: any) {
        if (err.name === 'AbortError') return
        console.error('Error fetching hidden media:', err)
        
        // Log error to database
        try {
          await supabase
            .from('error_logs')
            .insert([{ 
              id: crypto.randomUUID(),
              message: err.message, 
              stack: err.stack, 
              severity: 'error',
              category: 'useHiddenMedia',
              timestamp: new Date().toISOString()
            }])
        } catch (e) {}
        
        if (retries > 0 && mounted) {
          console.log(`[useHiddenMedia] Retrying... (${retries} left)`)
          setTimeout(() => fetchBroken(retries - 1), 2000)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchBroken()

    const channel = supabase
      .channel('link_checks_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'link_checks' 
      }, () => {
        fetchBroken()
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [isAdmin])

  const filterMedia = useMemo(() => {
    return <T extends { id: number | string }>(items: T[] | undefined | null, threshold: 10 | 15 = 15): T[] => {
      if (!items) return []
      
      // IF ADMIN/SUPERVISOR: Show everything, don't filter
      if (isAdmin) {
        console.log('[filterMedia] Admin bypass enabled')
        return items
      }
      
      const targetSet = threshold === 10 ? hiddenIds10 : hiddenIds
      
      return items.filter(item => {
        const id = Number(item.id)
        const shouldHide = targetSet.has(id)
        
        if (id === 482600) {
          console.log(`[filterMedia Debug] Checking 482600: hiddenIds10 has it? ${hiddenIds10.has(482600)}, hiddenIds has it? ${hiddenIds.has(482600)}, threshold: ${threshold}, result: ${shouldHide ? 'HIDE' : 'SHOW'}`)
        }
        
        return !shouldHide
      })
    }
  }, [hiddenIds, hiddenIds10, isAdmin])

  return { hiddenIds, hiddenIds10, filterMedia, loading, isAdmin }
}
