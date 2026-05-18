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
import { AlertCircle, HeartPulse, Check, Eye, Trash2, User, Loader2 } from 'lucide-react'

export default function TakerHome() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  
  const [meds, setMeds] = useState<any[]>([])
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([])
  const [latestBP, setLatestBP] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Viewers state
  const [viewers, setViewers] = useState<any[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)

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
    if (user?.id) {
      loadDashboardData()
    }
    if (profile?.id) {
      loadViewers()
    }
  }, [user?.id, profile?.id])

  const loadViewers = async () => {
    if (!profile?.id) return
    try {
      const circleId = await api.getLovedOneCircleId(profile.id)
      if (circleId) {
        const allMembers = await api.getCareCircleViewers(circleId)
        setViewers(allMembers.filter((m: any) => m.user_id !== user?.id))
      }
    } catch (e) {
      console.error('Failed to load viewers:', e)
    }
  }

  const loadDashboardData = async () => {
    if (!user?.id) return
    try {
      const [medsData, checkinData, progressData, bpData] = await Promise.all([
        api.getTodayMedications(user.id),
        api.getTodayCheckin(user.id),
        api.getWeeklyAdherence(user.id),
        api.getVitalsBP(user.id)
      ])
      setMeds(medsData || [])
      setHasCheckedIn(!!checkinData)
      setWeeklyProgress(progressData || [])
      setLatestBP(bpData && bpData.length > 0 ? bpData[0] : null)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    }
  }

  // Helper: check if a specific dose (medication + time) was taken on the selected date
  const isDoseTakenOnDate = (med: any, timeStr: string, date: Date) => {
    const dateString = date.toDateString()
    return med.medication_logs?.some((l: any) => {
      if (l.status !== 'taken') return false
      
      if (l.scheduled_at) {
        const schedDateObj = new Date(l.scheduled_at)
        if (schedDateObj.toDateString() !== dateString) return false
        
        const schedTime = schedDateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        return schedTime === timeStr.substring(0, 5)
      } else {
        return new Date(l.taken_at).toDateString() === dateString
      }
    }) || false
  }

  // Flatten meds into individual dose items for the UI
  const doseItems = meds.flatMap(med => {
    const schedules = med.medication_schedules || [{ time_of_day: '09:00:00' }]
    return schedules.map((s: any) => ({
      ...med,
      schedule_id: s.id,
      display_time: s.time_of_day?.substring(0, 5) || '09:00',
      is_taken: isDoseTakenOnDate(med, s.time_of_day || '09:00', selectedDate)
    }))
  }).sort((a, b) => a.display_time.localeCompare(b.display_time))




  const handleTakeMed = async (med: any) => {
    const [hours, minutes] = med.display_time.split(':')
    const scheduledAt = new Date(selectedDate)
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    // Override taken_at with scheduled time so it aligns nicely historically
    const takenAtOverride = scheduledAt.toISOString()

    // Optimistic UI update
    setMeds(prevMeds => prevMeds.map(m => {
      if (m.id === med.id) {
        const newLog = { 
          id: Math.random().toString(), 
          status: 'taken', 
          taken_at: takenAtOverride,
          scheduled_at: scheduledAt.toISOString()
        }
        return { ...m, medication_logs: [...(m.medication_logs || []), newLog] }
      }
      return m
    }))

    try {
      await api.takeMedication(med.id, scheduledAt.toISOString(), takenAtOverride)
      
      // Backend handles missed reminders now.
      
      loadDashboardData()
    } catch (error) {
      console.error(error)
      loadDashboardData() // Rollback
    }
  }

  const handleUndoMed = async (med: any) => {
    const dateString = selectedDate.toDateString()
    const log = med.medication_logs?.find((l: any) => {
      if (l.scheduled_at) {
        const schedDateObj = new Date(l.scheduled_at)
        return schedDateObj.toDateString() === dateString && schedDateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) === med.display_time
      } else {
        return new Date(l.taken_at).toDateString() === dateString
      }
    })

    if (!log) return

    // Optimistic UI
    setMeds(prevMeds => prevMeds.map(m => {
      if (m.id === med.id) {
        return { ...m, medication_logs: m.medication_logs.filter((l: any) => l.id !== log.id) }
      }
      return m
    }))

    try {
      await api.undoMedication(log.id)
      loadDashboardData()
    } catch (error) {
      console.error(error)
      loadDashboardData()
    }
  }

  const handleCheckin = async () => {
    if (user?.id) {
      setHasCheckedIn(true)
      try {
        await api.submitDailyCheckin(user.id, 5) // 5 = excellent mood
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleBPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !sys || !dia) return
    setIsSubmittingBP(true)
    try {
      await api.logVitalBP(user.id, Number(sys), Number(dia), pulse ? Number(pulse) : undefined)
      const bpData = await api.getVitalsBP(user.id)
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

  const handleRemoveViewer = async (v: any) => {
    setRemovingId(v.id)
    try {
      await api.removeCareCircleMember(v.id)
      setViewers(prev => prev.filter(item => item.id !== v.id))
    } catch (e) {
      console.error(e)
      alert(t('caregiver.disconnect_error'))
    } finally {
      setRemovingId(null)
    }
  }

  const handleAcceptViewer = async (v: any) => {
    setRemovingId(v.id)
    try {
      await api.acceptCareCircleMember(v.id)
      setViewers(prev => prev.map(item => item.id === v.id ? { ...item, accepted_at: new Date().toISOString() } : item))
    } catch (e) {
      console.error(e)
      alert(t('meds.accept_failed'))
    } finally {
      setRemovingId(null)
    }
  }

  const getUserInfo = (v: any) => {
    const raw = v.users
    return Array.isArray(raw) ? raw[0] : raw
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return t('home.greeting_morning', { name: profile?.name_ko || 'User' })
    if (hour < 18) return t('home.greeting_afternoon', { name: profile?.name_ko || 'User' })
    return t('home.greeting_evening', { name: profile?.name_ko || 'User' })
  }

  return (
    <div className="flex flex-col bg-secondary/20 px-4 pt-6 pb-6 space-y-4 max-w-md mx-auto">
      
      {/* Header / Greeting */}
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-lg font-bold text-foreground">{getGreeting()}</h1>
        <p className="text-xs text-muted-foreground shrink-0">
          {format(currentTime, 'PPP (EEEE)', { locale: dateLocale })}
        </p>
      </div>

      {/* Daily Check-in */}
      <Button
        variant={hasCheckedIn ? "secondary" : "default"}
        className={`w-full h-12 text-base rounded-xl shadow-md transition-all ${
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
            {selectedDate.toDateString() === new Date().toDateString() ? t('home.meds_title') : `${selectedDate.getMonth()+1}월 ${selectedDate.getDate()}일 복용 기록`}
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {doseItems.filter(d => d.is_taken).length} / {doseItems.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {doseItems.length === 0 ? (
            <p className="text-lg text-muted-foreground">{t('home.meds_empty')}</p>
          ) : (
            doseItems.map((dose, idx) => (
              <div key={`${dose.id}-${idx}`} className={`flex flex-col p-4 rounded-xl space-y-3 border transition-all ${dose.is_taken ? 'bg-secondary/20 border-transparent opacity-80' : 'bg-primary/5 border-primary/10'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-lg font-bold ${dose.is_taken ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary border-primary/20'}`}>
                      {dose.display_time}
                    </Badge>
                    <span className="text-xl font-medium">{dose.name_ko}</span>
                  </div>
                  <span className="text-lg text-muted-foreground">{dose.dosage_amount}{dose.dosage_unit}</span>
                </div>
                {dose.is_taken ? (
                  <Button
                    variant="outline"
                    className="w-full h-11 text-base rounded-xl border-yellow-500/50 text-yellow-600 bg-yellow-50/30"
                    onClick={() => handleUndoMed(dose)}
                  >
                    {t('common.undo')}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="w-full h-11 text-base rounded-xl shadow-md"
                    onClick={() => handleTakeMed(dose)}
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
              
              const entryDate = new Date()
              entryDate.setDate(entryDate.getDate() - (6 - index))
              const isSelected = selectedDate.toDateString() === entryDate.toDateString()

              return (
                <div key={index} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setSelectedDate(entryDate)}>
                  <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>{dayName}</span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-secondary' : ''
                  } ${
                    isFull ? 'bg-primary border-primary text-primary-foreground shadow-md' : 
                    isPartial ? 'bg-yellow-100 border-yellow-400 text-yellow-600' : 
                    'bg-secondary/50 border-secondary text-muted-foreground'
                  }`}>
                    {isFull ? <Check className="w-5 h-5" /> : 
                     isPartial ? <span className="text-xs font-bold">{entry.rate}%</span> : 
                     <span className="text-sm font-medium">-</span>}
                  </div>
                  <span className={`text-[10px] ${isSelected ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{dateStr}</span>
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
              <Button type="submit" disabled={isSubmittingBP || !sys || !dia} className="w-full h-10 text-base rounded-xl">
                {t('common.save')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Connection Management (Who sees my data) */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <Eye className="text-primary w-6 h-6" />
            {t('profile.who_sees')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {viewers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('profile.no_viewers')}</p>
          ) : (
            viewers.map((v) => {
              const info = getUserInfo(v)
              const isPending = !v.accepted_at
              return (
                <div key={v.id} className={`flex flex-col p-3 rounded-xl border ${isPending ? 'bg-amber-50/50 border-amber-200' : 'bg-secondary/20 border-transparent'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPending ? 'bg-amber-100' : 'bg-primary/10'}`}>
                        <User className={`w-5 h-5 ${isPending ? 'text-amber-600' : 'text-primary'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{info?.name_ko || info?.email || 'Caregiver'}</p>
                          {isPending && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-300 text-amber-700 bg-amber-50">{t('common.pending')}</Badge>}
                        </div>
                        {info?.phone_kr && <p className="text-[10px] text-muted-foreground">{info.phone_kr}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isPending ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-amber-600 hover:bg-amber-100 h-8 px-3 rounded-full text-xs font-bold" 
                            onClick={() => handleAcceptViewer(v)}
                            disabled={removingId === v.id}
                          >
                            {removingId === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t('common.accept')}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10 h-8 px-2 rounded-full" 
                            onClick={() => handleRemoveViewer(v)}
                            disabled={removingId === v.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:bg-destructive/10 h-8 px-2 rounded-full" 
                          onClick={() => handleRemoveViewer(v)}
                          disabled={removingId === v.id}
                        >
                          {removingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

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
