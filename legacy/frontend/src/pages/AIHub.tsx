import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LabResults from './LabResults'
import NutriTrack from './NutriTrack'
import { Sparkles } from 'lucide-react'

export default function AIHub() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const [tab, setTab] = useState<'nutrition' | 'labs'>('nutrition')

  return (
    <div className="flex flex-col bg-secondary/10">
      {/* Header */}
      <div className="bg-background pt-4 pb-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold text-primary tracking-tight">AI</span>
        </div>
        <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-950/30 px-3 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-sm font-semibold text-violet-600">{profile?.token_balance ?? 0}</span>
          <span className="text-xs text-violet-400">토큰</span>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-2 pb-4 px-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'nutrition' | 'labs')} className="w-full max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="nutrition" className="text-base">{t('ai.diet_tab')}</TabsTrigger>
            <TabsTrigger value="labs" className="text-base">{t('ai.labs_tab')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 w-full">
        {tab === 'nutrition' ? <NutriTrack /> : <LabResults />}
      </div>
    </div>
  )
}
