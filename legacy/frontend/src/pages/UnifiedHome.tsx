import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import TakerHome from './TakerHome'
import GiverHome from './GiverHome'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notificationService } from '../lib/notifications'

export default function UnifiedHome() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()

  // Both tabs are always available to every user — no role distinction.
  const [mode, setMode] = useState<'taker' | 'giver'>('taker')

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

      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-2 pb-3 px-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'taker' | 'giver')} className="w-full max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="taker" className="text-base">{t('home.taker_tab')}</TabsTrigger>
            <TabsTrigger value="giver" className="text-base">{t('home.giver_tab')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 w-full">
        {mode === 'taker' ? <TakerHome /> : <div className="px-4 pt-4"><GiverHome /></div>}
      </div>
    </div>
  )
}
