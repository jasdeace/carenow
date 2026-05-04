import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import TakerHome from './TakerHome'
import GiverHome from './GiverHome'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function UnifiedHome() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  
  const [mode, setMode] = useState<'taker' | 'giver'>(profile?.role === 'caregiver' ? 'giver' : 'taker')

  useEffect(() => {
    if (profile?.role) {
      setMode(profile.role === 'caregiver' ? 'giver' : 'taker')
    }
  }, [profile?.role])

  return (
    <div className="flex flex-col min-h-screen bg-secondary/10 pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-2 pb-4 px-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'taker' | 'giver')} className="w-full max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="taker" className="text-base">{t('home.taker_tab')}</TabsTrigger>
            <TabsTrigger value="giver" className="text-base">{t('home.giver_tab')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 w-full">
        {mode === 'taker' ? <TakerHome /> : <GiverHome />}
      </div>
    </div>
  )
}
