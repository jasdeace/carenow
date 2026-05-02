import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AlertCircle, HeartPulse, MessageCircle } from 'lucide-react'

export default function LovedOneHome() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuthStore()
  
  const [meds, setMeds] = useState<any[]>([])
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const dateLocale = i18n.language === 'ko' ? ko : enUS

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (profile?.id) {
      loadDashboardData()
    }
  }, [profile?.id])

  const loadDashboardData = async () => {
    if (!profile?.id) return
    try {
      const [medsData, checkinData] = await Promise.all([
        api.getTodayMedications(profile.id),
        api.getTodayCheckin(profile.id)
      ])
      // Mocking meds for display if none exist
      setMeds(medsData?.length ? medsData : [
        { id: '1', name_ko: '혈압약', dosage_amount: 1, dosage_unit: '정', status: 'pending' },
        { id: '2', name_ko: '당뇨약', dosage_amount: 1, dosage_unit: '정', status: 'taken' }
      ])
      setHasCheckedIn(!!checkinData)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    }
  }

  const handleTakeMed = async (id: string) => {
    // Optimistic update
    setMeds(meds.map(m => m.id === id ? { ...m, status: 'taken' } : m))
    if (profile?.id) {
      try {
        await api.logMedicationDose(id, profile.id, 'taken')
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleCheckin = async () => {
    if (profile?.id) {
      setHasCheckedIn(true)
      try {
        await api.submitDailyCheckin(profile.id, 5) // 5 = excellent mood
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleSOS = () => {
    // Logic to trigger SOS alert
    alert('SOS Triggered!')
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return t('home.greeting_morning', { name: profile?.name_ko || 'User' })
    if (hour < 18) return t('home.greeting_afternoon', { name: profile?.name_ko || 'User' })
    return t('home.greeting_evening', { name: profile?.name_ko || 'User' })
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/20 pb-20 px-4 pt-8 space-y-6 max-w-md mx-auto">
      
      {/* Header / Greeting */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{getGreeting()}</h1>
        <p className="text-xl text-muted-foreground">
          {format(currentTime, 'PPP (EEEE)', { locale: dateLocale })}
        </p>
      </div>

      {/* Daily Check-in */}
      <Button 
        variant={hasCheckedIn ? "secondary" : "default"}
        className={`w-full h-24 text-2xl rounded-2xl shadow-lg transition-all ${
          hasCheckedIn ? 'opacity-80' : 'bg-primary hover:bg-primary/90'
        }`}
        onClick={handleCheckin}
        disabled={hasCheckedIn}
      >
        {hasCheckedIn ? t('home.checkin_done') : t('home.checkin_btn')}
      </Button>

      {/* Medications */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center justify-between">
            {t('home.meds_title')}
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {meds.filter(m => m.status === 'taken').length} / {meds.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meds.length === 0 ? (
            <p className="text-lg text-muted-foreground">{t('home.meds_empty')}</p>
          ) : (
            meds.map((med) => (
              <div key={med.id} className="flex flex-col p-4 bg-secondary/40 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-medium">{med.name_ko}</span>
                  <span className="text-lg text-muted-foreground">{med.dosage_amount}{med.dosage_unit}</span>
                </div>
                <Button 
                  variant={med.status === 'taken' ? "outline" : "default"}
                  className="w-full h-16 text-xl rounded-xl"
                  onClick={() => handleTakeMed(med.id)}
                  disabled={med.status === 'taken'}
                >
                  {med.status === 'taken' ? t('home.already_taken') : t('home.took_it')}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Shortcuts */}
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" className="h-20 text-lg rounded-2xl flex flex-col items-center justify-center gap-2 border-primary/20 bg-background">
          <HeartPulse className="w-8 h-8 text-primary" />
          <span>{t('home.vitals_shortcut')}</span>
        </Button>
        <Button variant="outline" className="h-20 text-lg rounded-2xl flex flex-col items-center justify-center gap-2 border-primary/20 bg-background relative">
          <MessageCircle className="w-8 h-8 text-primary" />
          <span>{t('home.messages')}</span>
          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white">
            2
          </span>
        </Button>
      </div>

      {/* SOS Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-full h-20 text-2xl rounded-2xl mt-4 shadow-lg shadow-destructive/20 flex gap-3">
            <AlertCircle className="w-8 h-8" />
            {t('home.sos_btn')}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-11/12 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-destructive">{t('home.sos_confirm_title')}</DialogTitle>
            <DialogDescription className="text-lg pt-2">
              {t('home.sos_confirm_desc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-3 pt-4">
            <Button variant="destructive" className="w-full h-16 text-xl" onClick={handleSOS}>
              {t('home.sos_trigger')}
            </Button>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full h-16 text-xl">
                {t('home.sos_cancel')}
              </Button>
            </DialogTrigger>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  )
}
