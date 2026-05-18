import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'

import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import UnifiedHome from './pages/UnifiedHome'
import GiverDashboard from './pages/GiverDashboard'
import BottomNav from './components/BottomNav'
import Vitals from './pages/Vitals'
import Medications from './pages/Medications'
import AIHub from './pages/AIHub'
import Profile from './pages/Profile'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import TermsOfService from './pages/legal/TermsOfService'
import SensitiveInfoPolicy from './pages/legal/SensitiveInfoPolicy'

function ProtectedRoute({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) {
  const { user, profile, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" />
  
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
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <Outlet />
      </div>
      {/* Bottom nav sits at the bottom of the flex container, never scrolls */}
      <BottomNav />
    </div>
  )
}

function App() {
  const { setUser, setProfile, fetchProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else useAuthStore.setState({ isLoading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
