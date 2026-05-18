import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import TakerHome from './TakerHome'
import GiverHome from './GiverHome'
import { notificationService } from '../lib/notifications'

export default function UnifiedHome() {
  const { profile } = useAuthStore()

  // Register for push notifications globally when profile is loaded
  useEffect(() => {
    if (profile?.id) {
      notificationService.requestPermissionsAndRegister(profile.id)
    }
  }, [profile?.id])

  return (
    <div className="flex flex-col bg-secondary/10 pb-6">
      <div className="bg-background pt-3 pb-1 px-4 flex items-center justify-center gap-2">
        <img src="/carelink_logo.png" alt="CareLink" className="w-7 h-7 rounded-lg shadow-sm" />
        <span className="text-lg font-bold text-primary tracking-tight">CareLink</span>
      </div>

      {/* Your own health */}
      <TakerHome />

      {/* People you're connected to */}
      <div className="px-4 pb-6">
        <GiverHome />
      </div>
    </div>
  )
}
