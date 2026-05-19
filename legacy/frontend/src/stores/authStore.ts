import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string | null
  name_ko: string | null
  phone_kr: string | null
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

// Cache the profile so warm app starts render instantly instead of
// blocking the first paint on a network round-trip.
const PROFILE_CACHE_KEY = 'carenow_profile_cache'

function loadCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

function cacheProfile(profile: UserProfile | null) {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
    else localStorage.removeItem(PROFILE_CACHE_KEY)
  } catch {
    /* storage unavailable — non-fatal */
  }
}

// Guard against concurrent fetchProfile calls
let _fetchInProgress: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: loadCachedProfile(),
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => {
    cacheProfile(profile)
    set({ profile })
  },

  fetchProfile: async (userId) => {
    if (_fetchInProgress) {
      await _fetchInProgress
      return
    }

    const doFetch = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name_ko, phone_kr, tier, token_balance')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      cacheProfile(data)
      set({ profile: data })
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
    cacheProfile(null)
    set({ user: null, profile: null })
  },
}))
