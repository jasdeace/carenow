import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string | null
  name_ko: string | null
  phone_kr: string | null
  role: 'loved_one' | 'caregiver' | 'primary' | 'viewer' | null
  tier: 'free' | 'premium'
  loved_one_id: string | null  // The loved_ones table primary key (different from users.id)
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

// Guard against concurrent fetchProfile calls (the race condition root cause)
let _fetchInProgress: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId) => {
    // If a fetch is already in progress for this user, wait for it instead of starting a new one
    if (_fetchInProgress) {
      await _fetchInProgress
      return
    }

    const doFetch = async () => {
      set({ isLoading: true })
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name_ko, phone_kr, role, tier')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        set({ isLoading: false })
        return
      }

      // Resolve loved_one_id — just look it up, never auto-create here
      const { data: loData } = await supabase
        .from('loved_ones')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      set({ profile: { ...data, loved_one_id: loData?.id || null } })
      set({ isLoading: false })
    }

    _fetchInProgress = doFetch()
    try {
      await _fetchInProgress
    } finally {
      _fetchInProgress = null
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))
