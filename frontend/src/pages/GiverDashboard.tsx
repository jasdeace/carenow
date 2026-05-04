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
import { Activity, Pill, HeartPulse, CheckCircle2, Loader2, AlertCircle, ArrowLeft, Trash2, Check } from 'lucide-react'

export default function GiverDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { takerId } = useParams<{ takerId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)

  const dateLocale = i18n.language === 'ko' ? ko : enUS

  useEffect(() => {
    if (takerId) fetchDashboardData()
  }, [takerId])

  const fetchDashboardData = async () => {
    if (!takerId) return
    try {
      setLoading(true)
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
      await api.addMedication(takerId!, name, String(dosage), unit, user?.id || '', false) // false = pending, taker must accept
      form.reset()
      await fetchDashboardData() // Refresh
    } catch (err: any) {
      console.error(err)
      alert(`Failed to add medication: ${err.message || 'Unknown error'}`)
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!takerId) {
    return <div className="flex h-screen items-center justify-center">Taker not found</div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/10 pb-10">
      {/* Header Profile Section */}
      <div className="bg-background border-b px-4 py-6 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <Avatar className="h-14 w-14 border-2 border-primary">
              <AvatarFallback>LO</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{t('caregiver.dashboard_title')}</h1>
              <p className="text-sm text-muted-foreground">{t('caregiver.overview')}</p>
            </div>
          </div>
          {dashboardData?.checkinDone ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-sm px-3 py-1">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {t('caregiver.status_ok')}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-sm px-3 py-1">
              <AlertCircle className="w-4 h-4 mr-1" />
              {t('caregiver.status_pending')}
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 pt-6 space-y-6">
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t('caregiver.tab_overview')}</TabsTrigger>
            <TabsTrigger value="health">{t('caregiver.tab_health')}</TabsTrigger>
            <TabsTrigger value="circle">{t('caregiver.tab_circle')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Status Summary Cards */}
            <h2 className="text-xl font-semibold">{t('caregiver.todays_status')}</h2>
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-card">
                <CardHeader className="p-3 pb-2">
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Activity className="w-4 h-4 text-primary" /> {t('caregiver.checkin_status')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="font-semibold text-lg text-primary">{dashboardData?.checkinDone ? t('common.done') : t('common.pending')}</p>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardHeader className="p-3 pb-2">
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Pill className="w-4 h-4 text-blue-500" /> {t('caregiver.meds_taken')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="font-semibold text-lg">{dashboardData?.medsTaken || 0} / {dashboardData?.medsTotal || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardHeader className="p-3 pb-2">
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <HeartPulse className="w-4 h-4 text-rose-500" /> {t('caregiver.last_vital')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="font-semibold text-lg">{dashboardData?.lastBP || '--'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Adherence Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('caregiver.weekly_adherence')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center w-full py-4 px-2">
                  {(dashboardData?.adherence || []).map((entry: any, index: number) => {
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

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('caregiver.activity_feed')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-4">
                    {dashboardData?.activities?.map((activity: any, i: number) => (
                      <div key={activity.id}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <p className="text-sm font-medium">
                              {i18n.language === 'ko' ? activity.desc_ko : activity.desc_en}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(activity.time, 'p', { locale: dateLocale })}
                          </span>
                        </div>
                        {i < dashboardData.activities.length - 1 && <Separator className="my-2" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="health" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('caregiver.health_overview')}</CardTitle>
                <CardDescription>{t('caregiver.connect_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMed} className="space-y-4 mb-6 p-4 bg-secondary/20 rounded-xl">
                  <div className="space-y-2">
                    <label htmlFor="giverMedName" className="text-sm font-medium">{t('caregiver.med_name')}</label>
                    <input id="giverMedName" name="medName" required className="w-full h-10 px-3 rounded-md border bg-background" />
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label htmlFor="giverDosageAmt" className="text-sm font-medium">{t('caregiver.dosage')}</label>
                      <input id="giverDosageAmt" name="dosageAmt" type="text" required className="w-full h-10 px-3 rounded-md border bg-background" placeholder="10 or 10/60" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <label htmlFor="giverDosageUnit" className="text-sm font-medium">{t('caregiver.unit')}</label>
                      <input id="giverDosageUnit" name="dosageUnit" required className="w-full h-10 px-3 rounded-md border bg-background" defaultValue="mg" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-2">{t('caregiver.add_medication')}</Button>
                </form>

                <div className="space-y-3 mt-4">
                  <h3 className="font-semibold text-lg border-b pb-2">{t('caregiver.active_meds')}</h3>
                  {dashboardData?.medications?.length > 0 ? (
                    dashboardData.medications.map((med: any) => (
                      <div key={med.id} className="p-3 bg-secondary/10 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Pill className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{med.name_ko || med.name_en}</p>
                            <p className="text-sm text-muted-foreground">{med.dosage_amount}{med.dosage_unit}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={med.medication_logs?.some((l: any) => l.status === 'taken' && new Date(l.taken_at).toDateString() === new Date().toDateString()) ? 'default' : 'secondary'}>
                            {med.medication_logs?.some((l: any) => l.status === 'taken' && new Date(l.taken_at).toDateString() === new Date().toDateString()) ? t('caregiver.taken') : t('common.pending')}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteMed(med.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">{t('caregiver.no_active_meds')}</p>
                  )}
                </div>

                {/* Pending Meds waiting for Taker acceptance */}
                {dashboardData?.pendingMeds?.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h3 className="font-semibold text-lg border-b pb-2 text-yellow-600">{t('caregiver.awaiting_acceptance')}</h3>
                    {dashboardData.pendingMeds.map((med: any) => (
                      <div key={med.id} className="p-3 bg-yellow-50/50 dark:bg-yellow-950/10 border border-yellow-500/20 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Pill className="w-5 h-5 text-yellow-600" />
                          <div>
                            <p className="font-medium">{med.name_ko || med.name_en}</p>
                            <p className="text-sm text-muted-foreground">{med.dosage_amount}{med.dosage_unit}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{t('common.pending')}</Badge>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteMed(med.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="circle">
            <Card>
              <CardHeader>
                <CardTitle>{t('caregiver.manage_circle')}</CardTitle>
                <CardDescription>{t('caregiver.connect_new_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                {t('common.pending')}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
