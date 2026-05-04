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
import LabResults from './pages/LabResults'
import Profile from './pages/Profile'

function ProtectedRoute({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) {
  const { user, profile, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/login" />
  
  if (requireProfile && profile && !profile.role) {
    return <Navigate to="/onboarding" />
  }

  return <>{children}</>
}

function AppLayout() {
  return (
    <div className="pb-16">
      <Outlet />
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
        
        <Route element={<ProtectedRoute requireProfile={true}><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<UnifiedHome />} />
          <Route path="/vitals" element={<Vitals />} />
          <Route path="/medications" element={<Medications />} />
          <Route path="/labs" element={<LabResults />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/giver/dashboard/:takerId" element={<ProtectedRoute requireProfile={true}><GiverDashboard /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
