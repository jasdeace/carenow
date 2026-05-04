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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId) => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name_ko, phone_kr, role, tier')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
    } else {
      // Resolve loved_one_id for ALL users (anyone can take meds regardless of role)
      let loved_one_id: string | null = null
      const { data: loData } = await supabase
        .from('loved_ones')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      loved_one_id = loData?.id || null

      // Auto-provision a care circle + loved_one entry if none exists
      if (!loved_one_id) {
        try {
          const displayName = data.name_ko || data.email || 'User'
          const { data: circleData } = await supabase
            .from('care_circles')
            .insert({ name: `${displayName}'s Circle`, created_by: userId })
            .select('id')
            .single()
          if (circleData) {
            const { data: newLo } = await supabase
              .from('loved_ones')
              .insert({ circle_id: circleData.id, user_id: userId, display_name_ko: displayName })
              .select('id')
              .single()
            loved_one_id = newLo?.id || null
          }
        } catch (e) {
          console.error('Auto-provision loved_one failed:', e)
        }
      }

      set({ profile: { ...data, loved_one_id } })
    }
    set({ isLoading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))
