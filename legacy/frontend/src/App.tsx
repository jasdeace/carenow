import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import BottomNav from './components/BottomNav'

// Route components are code-split so the initial bundle only carries
// what the first screen needs — the rest loads on demand.
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const UnifiedHome = lazy(() => import('./pages/UnifiedHome'))
const GiverDashboard = lazy(() => import('./pages/GiverDashboard'))
const Vitals = lazy(() => import('./pages/Vitals'))
const Medications = lazy(() => import('./pages/Medications'))
const AIHub = lazy(() => import('./pages/AIHub'))
const Profile = lazy(() => import('./pages/Profile'))
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'))
const SensitiveInfoPolicy = lazy(() => import('./pages/legal/SensitiveInfoPolicy'))

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-[3px] border-primary/25 border-t-primary animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) {
  const { user, profile, isLoading } = useAuthStore()
  if (isLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" />

  // Session is valid but the profile hasn't arrived yet (fresh login,
  // no cache). Wait rather than bouncing to onboarding by mistake.
  if (requireProfile && !profile) return <FullScreenLoader />

  if (requireProfile && profile && !profile.name_ko) {
    return <Navigate to="/onboarding" />
  }

  return <>{children}</>
}

function AppLayout() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Fixed top safe area */}
      <div className="shrink-0 bg-secondary/20" style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      {/* Scrollable content — inner Suspense keeps BottomNav mounted during route transitions */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <Suspense fallback={<FullScreenLoader />}>
          <Outlet />
        </Suspense>
      </div>
      {/* Bottom nav sits at the bottom of the flex container, never scrolls */}
      <BottomNav />
    </div>
  )
}

function App() {
  const { setUser, setProfile, fetchProfile } = useAuthStore()

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      // Session check is local and fast — unblock rendering right away.
      // The profile refresh below runs in the background (cache shows first).
      useAuthStore.setState({ isLoading: false })
      if (session?.user) fetchProfile(session.user.id)
      // Lift the native splash once React can paint the first real screen.
      if (Capacitor.isNativePlatform()) {
        requestAnimationFrame(() => SplashScreen.hide())
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<ProtectedRoute requireProfile={false}><Onboarding /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/sensitive-info" element={<SensitiveInfoPolicy />} />

          <Route element={<ProtectedRoute requireProfile={true}><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<UnifiedHome />} />
            <Route path="/vitals" element={<Vitals />} />
            <Route path="/medications" element={<Medications />} />
            <Route path="/ai" element={<AIHub />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/giver/dashboard/:takerId" element={<ProtectedRoute requireProfile={true}><GiverDashboard /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
