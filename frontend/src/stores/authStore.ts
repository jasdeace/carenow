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
  token_balance: number
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

// Guard against concurrent fetchProfile calls
let _fetchInProgress: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId) => {
    if (_fetchInProgress) {
      await _fetchInProgress
      return
    }

    const doFetch = async () => {
      set({ isLoading: true })
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name_ko, phone_kr, role, tier, token_balance')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        set({ isLoading: false })
        return
      }

      set({ profile: data })
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
