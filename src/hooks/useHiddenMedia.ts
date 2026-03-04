import { useState, useMemo, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

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
        setLoading(true)
        
        // 1. Fetch broken items from materialized view/table
        const { data: brokenData, error: brokenError } = await supabase
          .from('broken_content_stats')
          .select('*')

        // 2. Fetch "Alive" IDs (content that has at least one working link)
        // This is a safety check to avoid hiding things that might still work
        const { data: aliveData } = await supabase
          .from('link_checks')
          .select('content_id')
          .eq('status', 'online')

        const aliveIds = new Set(aliveData?.map(r => Number(r.content_id)) || [])

        const toHide10 = new Set<number>()
        const toHide15 = new Set<number>()

        if (brokenError) {
          if (brokenError.code === 'PGRST116') return // Table empty
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

        return !shouldHide
      })
    }
  }, [hiddenIds, hiddenIds10, isAdmin])

  return { hiddenIds, hiddenIds10, filterMedia, loading, isAdmin }
}
