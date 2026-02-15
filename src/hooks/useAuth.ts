import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../integrations/supabase/client'

export type Role = 'user' | 'admin'
export type Profile = { id: string; username: string; avatar_url?: string | null; role: Role }

type AuthState = {
  profile: Profile | null
  user: User | null
  session: Session | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  setProfile: (p: Profile | null) => void
}

export const useAuth = create<AuthState>((set, get) => ({
  profile: null,
  user: null,
  session: null,
  loading: true,
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) {
      await get().refreshProfile()
    }
  },
  async logout() {
    await supabase.auth.signOut()
    set({ profile: null, user: null, session: null })
  },
  async refreshProfile() {
    set({ loading: true })
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session ?? null
    const user = session?.user ?? null
    if (!user) {
      set({ profile: null, user: null, session: null, loading: false })
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role')
      .eq('id', user.id)
      .maybeSingle()
    if (error) {
      set({ loading: false })
      throw error
    }
    if (!data) {
      const username = user.email?.split('@')[0] || 'user'
      const { data: inserted } = await supabase
        .from('profiles')
        .insert({ id: user.id, username, role: 'user' })
        .select('id, username, avatar_url, role')
        .single()
      set({ profile: inserted as Profile, user, session, loading: false })
    } else {
      set({ profile: data as Profile, user, session, loading: false })
    }
  },
  setProfile(p) {
    set({ profile: p })
  }
}))
