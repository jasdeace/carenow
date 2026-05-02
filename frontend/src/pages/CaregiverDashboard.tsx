import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Pill, HeartPulse, CheckCircle2, UserPlus, Loader2, AlertCircle } from 'lucide-react'

export default function CaregiverDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')
  
  const [loading, setLoading] = useState(true)
  const [lovedOneId, setLovedOneId] = useState<string | null>(null)
  
  // Connect UI State
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)

  const dateLocale = i18n.language === 'ko' ? ko : enUS

  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    if (user?.id) fetchConnection()
  }, [user?.id])

  useEffect(() => {
    if (lovedOneId) fetchDashboardData()
  }, [lovedOneId])

  const fetchDashboardData = async () => {
    if (!lovedOneId) return
    try {
      const [checkin, bpData, meds] = await Promise.all([
        api.getTodayCheckin(lovedOneId),
        api.getVitalsBP(lovedOneId),
        api.getTodayMedications(lovedOneId)
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
        // Empty adherence for MVP dynamic fill
        adherence: [
          { day: 'Mon', rate: 100 }, { day: 'Tue', rate: 100 }, { day: 'Wed', rate: 100 },
          { day: 'Thu', rate: 100 }, { day: 'Fri', rate: 100 }, { day: 'Sat', rate: 0 }, { day: 'Sun', rate: 0 }
        ]
      })

    } catch (e) {
      console.error(e)
    }
  }

  const fetchConnection = async () => {
    if (!user?.id) return
    try {
      const id = await api.getCaregiverLovedOneId(user.id)
      setLovedOneId(id)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !inviteCode) return
    setJoining(true)
    try {
      await api.joinCareCircle(user.id, inviteCode)
      await fetchConnection()
    } catch (e: any) {
      console.error(e)
      alert(t('caregiver.join_error') + ': ' + e.message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!lovedOneId) {
    return (
      <div className="flex h-screen w-full items-center justify-center px-4 bg-secondary/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('caregiver.connect_title')}</CardTitle>
            <CardDescription>{t('caregiver.connect_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinCircle} className="space-y-4">
              <Input 
                value={inviteCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteCode(e.target.value)}
                placeholder={t('caregiver.invite_code_placeholder')}
                required
                className="h-14 text-center text-lg"
              />
              <Button type="submit" className="w-full h-14 text-lg" disabled={joining}>
                {joining ? <Loader2 className="w-6 h-6 animate-spin" /> : t('caregiver.connect_btn')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/10 pb-10">
      {/* Header Profile Section */}
      <div className="bg-background border-b px-4 py-6 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>LO</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Loved One</h1>
              <p className="text-muted-foreground">{t('caregiver.dashboard_title')}</p>
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
              Waiting
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
                  <p className="font-semibold text-lg text-primary">{dashboardData?.checkinDone ? 'Done' : 'Pending'}</p>
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
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData?.adherence || []}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                        {(dashboardData?.adherence || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.rate === 100 ? 'hsl(var(--primary))' : entry.rate > 0 ? '#facc15' : 'hsl(var(--muted))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
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

          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle>{t('caregiver.health_overview')}</CardTitle>
                <CardDescription>Detailed vitals and lab results will appear here.</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                Coming Soon
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="circle">
            <Card>
              <CardHeader>
                <CardTitle>{t('caregiver.manage_circle')}</CardTitle>
                <CardDescription>Invite family members to join the care circle.</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                Coming Soon
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
