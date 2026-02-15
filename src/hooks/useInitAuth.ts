import { useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useAuth } from './useAuth'

export function useInitAuth() {
  const refreshProfile = useAuth(s => s.refreshProfile)
  const setProfile = useAuth(s => s.setProfile)
  const loading = useAuth(s => s.loading)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await refreshProfile()
      } catch {
        // ignore
      }
    })()
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      if (!mounted) return
      try {
        await refreshProfile()
      } catch {
        setProfile(null)
      }
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [refreshProfile, setProfile])

  return { loading }
}
