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
        await refreshProfile()
      } catch (e: any) {
        // Ignore AbortError and other non-critical errors during init
        if (e?.name !== 'AbortError' && mounted) {
          console.debug('Auth initialization silent fail:', e)
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
