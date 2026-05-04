import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AlertCircle, HeartPulse, Check } from 'lucide-react'

export default function TakerHome() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  
  const [meds, setMeds] = useState<any[]>([])
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([])
  const [latestBP, setLatestBP] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [pulse, setPulse] = useState('')
  const [isSubmittingBP, setIsSubmittingBP] = useState(false)
  const showBP = localStorage.getItem('vitals_show_bp') !== 'false'

  const dateLocale = i18n.language === 'ko' ? ko : enUS

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (profile?.loved_one_id) {
      loadDashboardData()
    }
  }, [profile?.loved_one_id])

  const loadDashboardData = async () => {
    if (!profile?.loved_one_id) return
    try {
      const [medsData, checkinData, progressData, bpData] = await Promise.all([
        api.getTodayMedications(profile.loved_one_id),
        api.getTodayCheckin(profile.loved_one_id),
        api.getWeeklyAdherence(profile.loved_one_id),
        api.getVitalsBP(profile.loved_one_id)
      ])
      setMeds(medsData || [])
      setHasCheckedIn(!!checkinData)
      setWeeklyProgress(progressData || [])
      setLatestBP(bpData && bpData.length > 0 ? bpData[0] : null)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    }
  }

  // Helper: check if a medication was taken today based on its logs
  const isTakenToday = (med: any) => {
    const today = new Date().toDateString()
    return med.medication_logs?.some((l: any) => l.status === 'taken' && new Date(l.taken_at).toDateString() === today) || false
  }

  const handleTakeMed = async (id: string) => {
    // Optimistic: append a fake log so UI updates instantly
    setMeds(meds.map(m => m.id === id ? {
      ...m,
      medication_logs: [...(m.medication_logs || []), { id: 'opt', status: 'taken', taken_at: new Date().toISOString() }]
    } : m))
    if (profile?.id) {
      try {
        await api.logMedicationDose(id, profile.id, 'taken')
        if (profile.loved_one_id) {
          const progress = await api.getWeeklyAdherence(profile.loved_one_id)
          setWeeklyProgress(progress || [])
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleUndoMed = async (id: string) => {
    // Optimistic: remove today's logs
    const today = new Date().toDateString()
    setMeds(meds.map(m => m.id === id ? {
      ...m,
      medication_logs: (m.medication_logs || []).filter((l: any) => !(l.status === 'taken' && new Date(l.taken_at).toDateString() === today))
    } : m))
    try {
      await api.undoMedicationDose(id)
      if (profile?.loved_one_id) {
        const progress = await api.getWeeklyAdherence(profile.loved_one_id)
        setWeeklyProgress(progress || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCheckin = async () => {
    if (profile?.loved_one_id) {
      setHasCheckedIn(true)
      try {
        await api.submitDailyCheckin(profile.loved_one_id, 5) // 5 = excellent mood
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleBPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.loved_one_id || !sys || !dia) return
    setIsSubmittingBP(true)
    try {
      await api.logVitalBP(profile.loved_one_id, Number(sys), Number(dia), pulse ? Number(pulse) : undefined)
      const bpData = await api.getVitalsBP(profile.loved_one_id)
      setLatestBP(bpData && bpData.length > 0 ? bpData[0] : null)
      setSys('')
      setDia('')
      setPulse('')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmittingBP(false)
    }
  }

  const handleSOS = () => {
    // Open native phone dialer for emergency
    window.location.href = 'tel:119'
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
              {meds.filter(m => isTakenToday(m)).length} / {meds.length}
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
                {isTakenToday(med) ? (
                  <Button 
                    variant="outline"
                    className="w-full h-16 text-xl rounded-xl border-yellow-500/50 text-yellow-600"
                    onClick={() => handleUndoMed(med.id)}
                  >
                    {t('common.undo')}
                  </Button>
                ) : (
                  <Button 
                    variant="default"
                    className="w-full h-16 text-xl rounded-xl"
                    onClick={() => handleTakeMed(med.id)}
                  >
                    {t('home.took_it')}
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Weekly Progress */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">{t('home.weekly_progress')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center w-full py-4 px-2">
            {weeklyProgress.map((entry: any, index: number) => {
              const parts = entry.day.split(' ')
              const dayName = parts[0]
              const dateStr = parts[1] || ''
              const isFull = entry.rate === 100
              const isPartial = entry.rate > 0 && entry.rate < 100
              
              return (
                <div key={index} className="flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">{dayName}</span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isFull ? 'bg-primary border-primary text-primary-foreground shadow-md' : 
                    isPartial ? 'bg-yellow-100 border-yellow-400 text-yellow-600' : 
                    'bg-secondary/50 border-secondary text-muted-foreground'
                  }`}>
                    {isFull ? <Check className="w-5 h-5" /> : 
                     isPartial ? <span className="text-xs font-bold">{entry.rate}%</span> : 
                     <span className="text-sm font-medium">-</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Vitals Shortcut */}
      <Button onClick={() => navigate('/vitals')} variant="outline" className="w-full h-16 text-lg rounded-2xl flex items-center justify-center gap-2 border-primary/20 bg-background">
        <HeartPulse className="w-6 h-6 text-primary" />
        <span>건강수치 대시보드 보기</span>
      </Button>

      {/* BP Input Card */}
      {showBP && (
        <Card className="rounded-2xl shadow-md border-0 bg-background">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <HeartPulse className="text-rose-500 w-6 h-6" />
              혈압 기록
            </CardTitle>
            {latestBP && (
              <div className="text-sm text-muted-foreground flex gap-1 items-baseline">
                최근: <span className="font-bold text-rose-500 ml-1">{latestBP.systolic}</span>/
                <span className="font-bold text-blue-500">{latestBP.diastolic}</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBPSubmit} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground ml-1">{t('vitals.sys')}</label>
                  <input type="number" inputMode="numeric" pattern="[0-9]*" value={sys} onChange={e => setSys(e.target.value)} className="w-full h-12 text-xl text-center bg-secondary/50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-primary/50" placeholder="120" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground ml-1">{t('vitals.dia')}</label>
                  <input type="number" inputMode="numeric" pattern="[0-9]*" value={dia} onChange={e => setDia(e.target.value)} className="w-full h-12 text-xl text-center bg-secondary/50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-primary/50" placeholder="80" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground ml-1">{t('vitals.pulse')}</label>
                  <input type="number" inputMode="numeric" pattern="[0-9]*" value={pulse} onChange={e => setPulse(e.target.value)} className="w-full h-12 text-xl text-center bg-secondary/50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-primary/50" placeholder="72" />
                </div>
              </div>
              <Button type="submit" disabled={isSubmittingBP || !sys || !dia} className="w-full h-12 text-lg rounded-xl">
                {t('common.save')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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
