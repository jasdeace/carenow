import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string | null;
  name_ko: string | null;
  phone_kr: string | null;
  tier: 'free' | 'premium';
  token_balance: number;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  hydrateCachedProfile: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Cache the profile so warm app starts render instantly instead of
// blocking the first paint on a network round-trip.
const PROFILE_CACHE_KEY = 'carenow_profile_cache';

function cacheProfile(profile: UserProfile | null) {
  if (profile) AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  else AsyncStorage.removeItem(PROFILE_CACHE_KEY);
}

// Guard against concurrent fetchProfile calls
let _fetchInProgress: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => {
    cacheProfile(profile);
    set({ profile });
  },

  hydrateCachedProfile: async () => {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (raw) set({ profile: JSON.parse(raw) as UserProfile });
    } catch {
      /* non-fatal */
    }
  },

  fetchProfile: async (userId) => {
    if (_fetchInProgress) {
      await _fetchInProgress;
      return;
    }

    const doFetch = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name_ko, phone_kr, tier, token_balance')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      cacheProfile(data as UserProfile);
      set({ profile: data as UserProfile });
    };

    _fetchInProgress = doFetch();
    try {
      await _fetchInProgress;
    } finally {
      _fetchInProgress = null;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    cacheProfile(null);
    set({ user: null, profile: null });
  },
}));
