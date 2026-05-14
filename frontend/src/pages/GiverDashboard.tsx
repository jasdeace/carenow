import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Activity, Pill, HeartPulse, CheckCircle2, Loader2, AlertCircle, ArrowLeft, Trash2, Check, UserMinus, Plus, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function GiverDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { takerId } = useParams<{ takerId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isAccepted, setIsAccepted] = useState(false)
  
  // Add Med Form State
  const [addScheduleTimes, setAddScheduleTimes] = useState<string[]>(['09:00'])
  
  // Edit Med State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingMed, setEditingMed] = useState<any>(null)
  const [editMedName, setEditMedName] = useState('')
  const [editDosageAmt, setEditDosageAmt] = useState('')
  const [editDosageUnit, setEditDosageUnit] = useState('mg')
  const [editScheduleTimes, setEditScheduleTimes] = useState<string[]>(['09:00'])

  const dateLocale = i18n.language === 'ko' ? ko : enUS

  useEffect(() => {
    if (takerId) fetchDashboardData()
  }, [takerId])

  const fetchDashboardData = async () => {
    if (!takerId) return
    try {
      setLoading(true)
      
      // Verify acceptance first
      const takerList = await api.getGiverTakersList(user!.id)
      const currentTaker = takerList.find(t => t.id === takerId)
      
      if (!currentTaker?.accepted_at) {
        setIsAccepted(false)
        setLoading(false)
        return
      }
      
      setIsAccepted(true)

      const [checkin, bpData, meds, adherence, pendingMeds] = await Promise.all([
        api.getTodayCheckin(takerId),
        api.getVitalsBP(takerId),
        api.getTodayMedications(takerId),
        api.getWeeklyAdherence(takerId),
        api.getPendingMedications(takerId)
      ])

      // Calculate meds taken today
      const totalMeds = meds?.length || 0
      // MVP simplistic calc: if it has logs today, assume taken
      const takenMeds = meds?.filter(m => m.medication_logs?.some((l: any) => l.status === 'taken' && new Date(l.taken_at).toDateString() === new Date().toDateString())).length || 0

      // Activity Feed aggregation
      const activities: any[] = []
      if (checkin) activities.push({ id: 'chk1', time: new Date(checkin.checked_in_at), desc_ko: '체크인 완료', desc_en: 'Completed daily check-in' })
      if (bpData && bpData.length > 0) {
        const latestBP = bpData[0]
        activities.push({ id: 'bp1', time: new Date(latestBP.measured_at || latestBP.created_at), desc_ko: `혈압 측정: ${latestBP.systolic}/${latestBP.diastolic}`, desc_en: `BP measured: ${latestBP.systolic}/${latestBP.diastolic}` })
      }
      meds?.forEach(m => {
        m.medication_logs?.forEach((l: any) => {
          if (l.status === 'taken') {
            activities.push({ id: `med-${l.id}`, time: new Date(l.taken_at), desc_ko: `${m.name_ko} 복용 완료`, desc_en: `Took ${m.name_en || m.name_ko}` })
          }
        })
      })

      // Sort activities newest first
      activities.sort((a, b) => b.time.getTime() - a.time.getTime())

      setDashboardData({
        checkinDone: !!checkin,
        medsTaken: takenMeds,
        medsTotal: totalMeds,
        lastBP: bpData?.[0] ? `${bpData[0].systolic}/${bpData[0].diastolic}` : '--/--',
        activities,
        adherence: adherence || [],
        medications: meds || [],
        pendingMeds: pendingMeds || []
      })

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMed = async (medId: string) => {
    try {
      await api.deleteMedication(medId)
      fetchDashboardData() // Refresh
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const name = (form.elements.namedItem('medName') as HTMLInputElement).value
    const dosage = (form.elements.namedItem('dosageAmt') as HTMLInputElement).value
    const unit = (form.elements.namedItem('dosageUnit') as HTMLInputElement).value
    
    try {
      await api.addMedication(takerId!, name, String(dosage), unit, user?.id || '', addScheduleTimes, false) // false = pending, taker must accept
      form.reset()
      setAddScheduleTimes(['09:00'])
      await fetchDashboardData() // Refresh
    } catch (err: any) {
      console.error(err)
      alert(`Failed to add medication: ${err.message || 'Unknown error'}`)
    }
  }

  const handleEditOpen = (med: any) => {
    setEditingMed(med)
    setEditMedName(med.name_ko || med.name_en || '')
    setEditDosageAmt(String(med.dosage_amount || ''))
    setEditDosageUnit(med.dosage_unit || 'mg')
    setEditScheduleTimes(med.medication_schedules?.map((s: any) => s.time_of_day?.substring(0, 5)) || ['09:00'])
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMed) return
    try {
      await api.updateMedication(editingMed.id, editMedName, editDosageAmt, editDosageUnit, editScheduleTimes)
      setIsEditOpen(false)
      setEditingMed(null)
      alert('약 정보가 수정되었습니다.');
      await fetchDashboardData()
    } catch (err: any) {
      console.error(err)
      alert(`Failed to update medication: ${err.message || 'Unknown error'}`)
    }
  }

  const addTimeSlot = (isEdit: boolean) => {
    if (isEdit) setEditScheduleTimes([...editScheduleTimes, '09:00'])
    else setAddScheduleTimes([...addScheduleTimes, '09:00'])
  }
  
  const removeTimeSlot = (idx: number, isEdit: boolean) => {
    if (isEdit) setEditScheduleTimes(editScheduleTimes.filter((_, i) => i !== idx))
    else setAddScheduleTimes(addScheduleTimes.filter((_, i) => i !== idx))
  }
  
  const updateTimeSlot = (idx: number, val: string, isEdit: boolean) => {
    if (isEdit) {
      const next = [...editScheduleTimes]
      next[idx] = val
      setEditScheduleTimes(next)
    } else {
      const next = [...addScheduleTimes]
      next[idx] = val
      setAddScheduleTimes(next)
    }
  }

  const [filterType, setFilterType] = useState<string | null>(null)

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!takerId) {
    return <div className="flex h-screen items-center justify-center bg-background">Taker not found</div>
  }

  if (!isAccepted) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="shrink-0 bg-secondary/20" style={{ height: 'env(safe-area-inset-top, 0px)' }} />
        <div className="flex-1 flex flex-col px-4 pt-12 items-center text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('caregiver.awaiting_acceptance')}</h1>
            <p className="text-muted-foreground text-sm px-8">돌봄 대상자(Taker)가 요청을 수락해야 건강 데이터를 볼 수 있습니다.</p>
          </div>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    )
  }

  const filteredActivities = filterType 
    ? dashboardData?.activities?.filter((a: any) => {
        if (filterType === 'bp') return a.id.startsWith('bp')
        if (filterType === 'meds') return a.id.startsWith('med')
        if (filterType === 'checkin') return a.id.startsWith('chk')
        return true
      })
    : dashboardData?.activities

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Top Safe Area Spacer */}
      <div className="shrink-0 bg-background" style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      
      {/* Header Profile Section - Now part of flex flow but can be sticky if desired */}
      <div className="bg-background border-b px-4 py-3 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2 h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarFallback className="text-xs">LO</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-base font-bold leading-tight">{t('caregiver.dashboard_title')}</h1>
              <p className="text-[10px] text-muted-foreground">{t('caregiver.overview')}</p>
            </div>
          </div>
          {dashboardData?.checkinDone ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {t('caregiver.status_ok')}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[10px] px-2 py-0">
              <AlertCircle className="w-3 h-3 mr-1" />
              {t('caregiver.status_pending')}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-secondary/10 px-4 pt-4 pb-10 space-y-4">
        <div className="max-w-2xl mx-auto w-full space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="overview" className="text-xs">{t('caregiver.tab_overview')}</TabsTrigger>
              <TabsTrigger value="health" className="text-xs">{t('caregiver.tab_health')}</TabsTrigger>
              <TabsTrigger value="circle" className="text-xs">{t('caregiver.tab_circle')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Status Summary Cards */}
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t('caregiver.todays_status')}</h2>
              <div className="grid grid-cols-3 gap-2">
                <Card 
                  className={`bg-card transition-all active:scale-95 cursor-pointer border-2 ${filterType === 'checkin' ? 'border-primary' : 'border-transparent'}`}
                  onClick={() => setFilterType(filterType === 'checkin' ? null : 'checkin')}
                >
                  <CardHeader className="p-2 pb-1">
                    <CardDescription className="flex items-center gap-1 text-[10px]">
                      <Activity className={`w-3 h-3 ${filterType === 'checkin' ? 'text-primary' : 'text-muted-foreground'}`} /> {t('caregiver.checkin_status')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    <p className={`font-bold text-sm ${dashboardData?.checkinDone ? 'text-primary' : 'text-muted-foreground'}`}>{dashboardData?.checkinDone ? t('common.done') : t('common.pending')}</p>
                  </CardContent>
                </Card>
                <Card 
                  className={`bg-card transition-all active:scale-95 cursor-pointer border-2 ${filterType === 'meds' ? 'border-blue-500' : 'border-transparent'}`}
                  onClick={() => setFilterType(filterType === 'meds' ? null : 'meds')}
                >
                  <CardHeader className="p-2 pb-1">
                    <CardDescription className="flex items-center gap-1 text-[10px]">
                      <Pill className={`w-3 h-3 ${filterType === 'meds' ? 'text-blue-500' : 'text-muted-foreground'}`} /> {t('caregiver.meds_taken')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    <p className="font-bold text-sm">{dashboardData?.medsTaken || 0} / {dashboardData?.medsTotal || 0}</p>
                  </CardContent>
                </Card>
                <Card 
                  className={`bg-card transition-all active:scale-95 cursor-pointer border-2 ${filterType === 'bp' ? 'border-rose-500' : 'border-transparent'}`}
                  onClick={() => setFilterType(filterType === 'bp' ? null : 'bp')}
                >
                  <CardHeader className="p-2 pb-1">
                    <CardDescription className="flex items-center gap-1 text-[10px]">
                      <HeartPulse className={`w-3 h-3 ${filterType === 'bp' ? 'text-rose-500' : 'text-muted-foreground'}`} /> {t('caregiver.last_vital')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    <p className="font-bold text-sm">{dashboardData?.lastBP || '--'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly Adherence Chart */}
              <Card className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold">{t('caregiver.weekly_adherence')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex justify-between items-center w-full py-2">
                    {(dashboardData?.adherence || []).map((entry: any, index: number) => {
                      const parts = entry.day.split(' ')
                      const dayName = parts[0]
                      const dateStr = parts[1] || ''
                      const isFull = entry.rate === 100
                      const isPartial = entry.rate > 0 && entry.rate < 100
                      
                      return (
                        <div key={index} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-muted-foreground font-medium">{dayName}</span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                            isFull ? 'bg-primary border-primary text-primary-foreground' : 
                            isPartial ? 'bg-yellow-100 border-yellow-400 text-yellow-600' : 
                            'bg-secondary/50 border-secondary text-muted-foreground'
                          }`}>
                            {isFull ? <Check className="w-4 h-4" /> : 
                             isPartial ? <span className="text-[8px] font-bold">{entry.rate}%</span> : 
                             <span className="text-xs font-medium">-</span>}
                          </div>
                          <span className="text-[8px] text-muted-foreground">{dateStr}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Feed / Detailed History */}
              <Card className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold">
                    {filterType ? `${filterType.toUpperCase()} 상세 내역` : t('caregiver.activity_feed')}
                  </CardTitle>
                  {filterType && (
                    <Button variant="ghost" size="sm" onClick={() => setFilterType(null)} className="h-6 text-[10px]">
                      전체보기
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 pt-0 space-y-3">
                      {filteredActivities?.length > 0 ? (
                        filteredActivities.map((activity: any, i: number) => (
                          <div key={activity.id} className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-3">
                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                  activity.id.startsWith('bp') ? 'bg-rose-500' :
                                  activity.id.startsWith('med') ? 'bg-blue-500' :
                                  activity.id.startsWith('chk') ? 'bg-primary' : 'bg-muted'
                                }`} />
                                <div>
                                  <p className="text-xs font-medium leading-tight">
                                    {i18n.language === 'ko' ? activity.desc_ko : activity.desc_en}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {format(activity.time, 'MM/dd HH:mm', { locale: dateLocale })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {i < filteredActivities.length - 1 && <Separator className="my-2 opacity-50" />}
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center text-xs text-muted-foreground">
                          기록이 없습니다.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="space-y-4 mt-4 animate-in fade-in duration-300">
              <Card className="border-0 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold">{t('caregiver.health_overview')}</CardTitle>
                  <CardDescription className="text-[10px]">{t('caregiver.connect_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <form onSubmit={handleAddMed} className="space-y-3 mb-6 p-3 bg-secondary/20 rounded-xl">
                    <div className="space-y-1">
                      <label htmlFor="giverMedName" className="text-[10px] font-bold text-muted-foreground uppercase">{t('caregiver.med_name')}</label>
                      <input id="giverMedName" name="medName" required className="w-full h-9 px-3 text-sm rounded-md border bg-background" />
                    </div>
                    <div className="flex gap-2">
                      <div className="space-y-1 flex-1">
                        <label htmlFor="giverDosageAmt" className="text-[10px] font-bold text-muted-foreground uppercase">{t('caregiver.dosage')}</label>
                        <input id="giverDosageAmt" name="dosageAmt" type="text" required className="w-full h-9 px-3 text-sm rounded-md border bg-background" placeholder="10" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <label htmlFor="giverDosageUnit" className="text-[10px] font-bold text-muted-foreground uppercase">{t('caregiver.unit')}</label>
                        <input id="giverDosageUnit" name="dosageUnit" required className="w-full h-9 px-3 text-sm rounded-md border bg-background" defaultValue="mg" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">복용 시간</label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => addTimeSlot(false)} className="h-6 text-[10px] text-primary">
                          <Plus className="w-3 h-3 mr-1" /> 추가
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {addScheduleTimes.map((time, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <input 
                              type="time" 
                              value={time} 
                              onChange={(e) => updateTimeSlot(idx, e.target.value, false)}
                              className="h-8 flex-1 px-2 text-xs rounded-md border bg-background"
                            />
                            {addScheduleTimes.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeTimeSlot(idx, false)} className="h-8 w-8 text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-9 text-xs mt-1">{t('caregiver.add_medication')}</Button>
                  </form>

                  <div className="space-y-2 mt-4">
                    <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider border-b pb-1 mb-2">{t('caregiver.active_meds')}</h3>
                    {dashboardData?.medications?.length > 0 ? (
                      dashboardData.medications.map((med: any) => (
                        <div key={med.id} className={`p-2 rounded-lg flex flex-col space-y-1 border ${med.is_active ? 'bg-background border-secondary' : 'bg-secondary/5 opacity-60 border-dashed'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-full ${med.is_active ? 'bg-blue-50 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                                <Pill className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-bold">{med.name_ko || med.name_en}</p>
                                  {!med.is_active && <Badge variant="secondary" className="text-[8px] h-3 px-1 py-0">OFF</Badge>}
                                </div>
                                <p className="text-[10px] text-muted-foreground">{med.dosage_amount}{med.dosage_unit}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={async () => {
                                  await api.toggleMedicationActive(med.id, !med.is_active)
                                  fetchDashboardData()
                                }}
                                className={`w-7 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${med.is_active ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                              >
                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${med.is_active ? 'translate-x-3' : 'translate-x-0'}`} />
                              </button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditOpen(med)} className="h-7 w-7 text-primary hover:bg-primary/10">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteMed(med.id)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1 pl-8">
                            {med.medication_schedules?.map((s: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-[8px] px-1 py-0 h-4 bg-background">
                                {s.time_of_day?.substring(0, 5)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4 text-xs">{t('caregiver.no_active_meds')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="circle" className="animate-in fade-in duration-300 mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                    <UserMinus className="w-4 h-4" />
                    {t('caregiver.manage_circle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/10">
                    <h3 className="font-bold text-xs text-destructive mb-1">{t('caregiver.disconnect')}</h3>
                    <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed">
                      {t('caregiver.disconnect_confirm', { name: '' }).replace('?', '')}
                    </p>
                    <Button 
                      variant="destructive" 
                      className="w-full h-9 text-xs"
                      onClick={async () => {
                        if (!user?.id || !takerId) return
                        const confirmed = window.confirm(t('caregiver.disconnect_confirm', { name: '' }))
                        if (!confirmed) return
                        try {
                          const circleId = await api.getTakerCircleId(takerId)
                          if (circleId) {
                            await api.leaveCareCircle(user.id, circleId)
                            navigate('/')
                          }
                        } catch (e) {
                          console.error(e)
                        }
                      }}
                    >
                      <UserMinus className="w-3.5 h-3.5 mr-2" />
                      {t('caregiver.disconnect')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Med Dialog for Caregiver */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-11/12 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">약 정보 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="editName" className="text-xs">약 이름</Label>
              <Input id="editName" value={editMedName} onChange={e => setEditMedName(e.target.value)} required className="h-10 text-sm" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label className="text-xs">용량</Label>
                <Input value={editDosageAmt} onChange={e => setEditDosageAmt(e.target.value)} required className="h-10 text-sm" />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs">단위</Label>
                <Input value={editDosageUnit} onChange={e => setEditDosageUnit(e.target.value)} required className="h-10 text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">복용 시간</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => addTimeSlot(true)} className="h-8 text-xs text-primary">
                  <Plus className="w-3 h-3 mr-1" /> 추가
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {editScheduleTimes.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <Input 
                      type="time" 
                      value={time} 
                      onChange={(e) => updateTimeSlot(idx, e.target.value, true)}
                      className="h-9 text-xs"
                    />
                    {editScheduleTimes.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeTimeSlot(idx, true)} className="h-9 w-9 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full h-12 mt-2">저장하기</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

