import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'

import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import LovedOneHome from './pages/LovedOneHome'
import CaregiverDashboard from './pages/CaregiverDashboard'
import BottomNav from './components/BottomNav'
import Vitals from './pages/Vitals'
import Medications from './pages/Medications'
import LabResults from './pages/LabResults'

function ProtectedRoute({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) {
  const { user, profile, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" />
  
  if (requireProfile && profile && !profile.role) {
    return <Navigate to="/onboarding" />
  }

  return <>{children}</>
}

function RoleBasedLayout() {
  const { profile } = useAuthStore()
  if (profile?.role === 'loved_one') {
    return (
      <div className="pb-16">
        <Outlet />
        <BottomNav />
      </div>
    )
  }
  return <CaregiverDashboard />
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
        
        <Route element={<ProtectedRoute requireProfile={true}><RoleBasedLayout /></ProtectedRoute>}>
          <Route path="/" element={<LovedOneHome />} />
          <Route path="/vitals" element={<Vitals />} />
          <Route path="/medications" element={<Medications />} />
          <Route path="/labs" element={<LabResults />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
