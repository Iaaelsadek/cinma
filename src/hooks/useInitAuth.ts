import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useInitAuth() {
  const refreshProfile = useAuth(s => s.refreshProfile)
  const setProfile = useAuth(s => s.setProfile)
  const loading = useAuth(s => s.loading)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // Force timeout for initial auth check to prevent white screen
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        await Promise.race([refreshProfile(), timeoutPromise])
      } catch (e: any) {
        // Ignore AbortError and other non-critical errors during init
        if (mounted) {
          if (e?.name !== 'AbortError') {
             // console.debug('Auth initialization silent fail:', e)
          }
          // Ensure we stop loading state if timeout occurs or any error happens
          useAuth.getState().setLoading(false)
        }
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return
      
      if (event === 'SIGNED_OUT') {
        setProfile(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          await refreshProfile()
        } catch {
          // ignore
        }
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [refreshProfile, setProfile])

  return { loading }
}
