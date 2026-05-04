import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { HeartPulse, Droplets, Scale, Minus, Plus, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

export default function Vitals() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Panels Open State
  const [bpOpen, setBpOpen] = useState(true)
  const [glucoseOpen, setGlucoseOpen] = useState(true)
  const [weightOpen, setWeightOpen] = useState(true)

  // Visibility from Profile settings
  const showBP = localStorage.getItem('vitals_show_bp') !== 'false'
  const showGlucose = localStorage.getItem('vitals_show_glucose') !== 'false'
  const showWeight = localStorage.getItem('vitals_show_weight') !== 'false'

  // BP State
  const [sys, setSys] = useState('120')
  const [dia, setDia] = useState('80')
  const [pulse, setPulse] = useState('72')
  const [bpHistory, setBpHistory] = useState<any[]>([])
  const [bpRaw, setBpRaw] = useState<any[]>([])

  // Glucose State
  const [glucose, setGlucose] = useState('100')
  const [glucoseTiming, setGlucoseTiming] = useState('fasting')
  const [glucoseHistory, setGlucoseHistory] = useState<any[]>([])
  const [glucoseRaw, setGlucoseRaw] = useState<any[]>([])

  // Weight State
  const [weight, setWeight] = useState('60.0')
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  const [weightRaw, setWeightRaw] = useState<any[]>([])

  useEffect(() => {
    if (profile?.loved_one_id) {
      loadHistory()
    }
  }, [profile?.loved_one_id])

  const loadHistory = async () => {
    if (!profile?.loved_one_id) return
    try {
      const [bp, gluc, wgt] = await Promise.all([
        api.getVitalsBP(profile.loved_one_id),
        api.getVitalsGlucose(profile.loved_one_id),
        api.getVitalsWeight(profile.loved_one_id)
      ])

      if (bp && bp.length > 0) {
        setBpRaw(bp)
        const sorted = [...bp].reverse().map(b => ({
          time: format(new Date(b.measured_at || b.created_at), 'MM/dd'),
          sys: b.systolic,
          dia: b.diastolic
        }))
        setBpHistory(sorted)
      } else {
        setBpRaw([])
        setBpHistory([])
      }

      if (gluc && gluc.length > 0) {
        setGlucoseRaw(gluc)
        const sorted = [...gluc].reverse().map(g => ({
          time: format(new Date(g.measured_at || g.created_at), 'MM/dd'),
          glucose: g.value_mmol
        }))
        setGlucoseHistory(sorted)
      } else {
        setGlucoseRaw([])
        setGlucoseHistory([])
      }

      if (wgt && wgt.length > 0) {
        setWeightRaw(wgt)
        const sorted = [...wgt].reverse().map(w => ({
          time: format(new Date(w.measured_at || w.created_at), 'MM/dd'),
          weight: w.weight_kg
        }))
        setWeightHistory(sorted)
      } else {
        setWeightRaw([])
        setWeightHistory([])
      }

    } catch (e) {
      console.error(e)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  const handleBPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.loved_one_id) return
    setLoading(true)
    try {
      await api.logVitalBP(profile.loved_one_id, Number(sys), Number(dia), pulse ? Number(pulse) : undefined)
      showSuccess('혈압이 기록되었습니다.')
      loadHistory()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGlucoseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.loved_one_id) return
    setLoading(true)
    try {
      await api.logVitalGlucose(profile.loved_one_id, Number(glucose), glucoseTiming)
      showSuccess('혈당이 기록되었습니다.')
      loadHistory()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.loved_one_id) return
    setLoading(true)
    try {
      await api.logVitalWeight(profile.loved_one_id, Number(weight))
      showSuccess('체중이 기록되었습니다.')
      loadHistory()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBP = async (id: string) => {
    try {
      await api.deleteVitalBP(id)
      loadHistory()
    } catch (e) { console.error(e) }
  }

  const handleDeleteGlucose = async (id: string) => {
    try {
      await api.deleteVitalGlucose(id)
      loadHistory()
    } catch (e) { console.error(e) }
  }

  const handleDeleteWeight = async (id: string) => {
    try {
      await api.deleteVitalWeight(id)
      loadHistory()
    } catch (e) { console.error(e) }
  }

  const timingLabel = (t: string) => {
    const map: Record<string, string> = { fasting: '공복', pre_meal: '식전', post_meal: '식후', bedtime: '취침 전' }
    return map[t] || t
  }

  // numpad input style
  const numInputClass = "w-full h-16 text-2xl text-center bg-secondary/50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-primary/50"

  return (
    <div className="flex flex-col min-h-screen bg-secondary/20 px-4 pt-8 pb-24 space-y-6 max-w-md mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t('vitals.title')}</h1>
        <p className="text-lg text-muted-foreground">{t('vitals.subtitle')}</p>
      </div>

      {successMsg && (
        <div className="bg-primary/20 text-primary border border-primary/50 p-4 rounded-xl text-center font-medium animate-in fade-in">
          {successMsg}
        </div>
      )}

      {/* Blood Pressure Card */}
      {showBP && <Card className="rounded-2xl shadow-md border-0 bg-background overflow-hidden transition-all duration-300">
        <CardHeader className="pb-3 flex flex-row items-center justify-between cursor-pointer" onClick={() => setBpOpen(!bpOpen)}>
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <HeartPulse className="text-rose-500 w-8 h-8" />
              {t('vitals.bp_title')}
            </CardTitle>
            <CardDescription className="mt-1">{t('vitals.bp_desc')}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full">
            {bpOpen ? <Minus className="w-8 h-8 text-muted-foreground" /> : <Plus className="w-8 h-8 text-primary" />}
          </Button>
        </CardHeader>
        {bpOpen && (
          <CardContent>
            {bpHistory.length > 0 && (() => {
              const allVals = bpHistory.flatMap(b => [b.sys, b.dia])
              const yMin = Math.max(0, Math.floor((Math.min(...allVals) - 20) / 10) * 10)
              const yMax = Math.ceil((Math.max(...allVals) + 20) / 10) * 10
              return (
                <div className="h-44 w-full mb-4 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bpHistory} margin={{ left: -10, right: 5 }}>
                      <XAxis dataKey="time" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={[yMin, yMax]} fontSize={11} tickLine={false} axisLine={false} width={35} />
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="sys" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} name="수축기" />
                      <Line type="monotone" dataKey="dia" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="이완기" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            })()}

            {/* BP History List */}
            {bpRaw.length > 0 && (
              <div className="mb-5 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">기록 내역</h3>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {bpRaw.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between bg-secondary/30 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-sm flex-wrap min-w-0">
                        <span className="font-bold text-rose-500">{entry.systolic}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-bold text-blue-500">{entry.diastolic}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground whitespace-nowrap">{format(new Date(entry.measured_at || entry.created_at), 'M/d HH:mm')}</span>
                        {entry.pulse && <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground whitespace-nowrap">맥박 {entry.pulse}</span>
                        </>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-full ml-1" onClick={() => handleDeleteBP(entry.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleBPSubmit} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-lg">{t('vitals.sys')}</Label>
                  <input type="number" inputMode="numeric" pattern="[0-9]*" value={sys} onChange={e => setSys(e.target.value)} className={numInputClass} />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-lg">{t('vitals.dia')}</Label>
                  <input type="number" inputMode="numeric" pattern="[0-9]*" value={dia} onChange={e => setDia(e.target.value)} className={numInputClass} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-lg">{t('vitals.pulse')}</Label>
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={pulse} onChange={e => setPulse(e.target.value)} className={numInputClass} />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-16 text-xl rounded-xl mt-4">
                {t('common.save')}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>}

      {/* Glucose Card */}
      {showGlucose && <Card className="rounded-2xl shadow-md border-0 bg-background overflow-hidden transition-all duration-300">
        <CardHeader className="pb-3 flex flex-row items-center justify-between cursor-pointer" onClick={() => setGlucoseOpen(!glucoseOpen)}>
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Droplets className="text-blue-500 w-8 h-8" />
              {t('vitals.glucose_title')}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full">
            {glucoseOpen ? <Minus className="w-8 h-8 text-muted-foreground" /> : <Plus className="w-8 h-8 text-primary" />}
          </Button>
        </CardHeader>
        {glucoseOpen && (
          <CardContent>
            {glucoseHistory.length > 0 && (
              <div className="h-40 w-full mb-4 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={glucoseHistory}>
                    <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="glucose" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="혈당" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Glucose History List */}
            {glucoseRaw.length > 0 && (
              <div className="mb-5 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">기록 내역</h3>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {glucoseRaw.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-blue-500 min-w-[50px]">{entry.value_mmol}</span>
                        <div className="text-sm text-muted-foreground">
                          <div>{format(new Date(entry.measured_at || entry.created_at), 'MM/dd HH:mm')}</div>
                          <div>{timingLabel(entry.measurement_timing)}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDeleteGlucose(entry.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleGlucoseSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-lg">{t('vitals.glucose_level')}</Label>
                <input type="number" inputMode="numeric" pattern="[0-9]*" value={glucose} onChange={e => setGlucose(e.target.value)} className={numInputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-lg">{t('vitals.timing')}</Label>
                <select value={glucoseTiming} onChange={e => setGlucoseTiming(e.target.value)} className="w-full h-16 text-2xl text-center bg-secondary/50 rounded-xl appearance-none">
                  <option value="fasting">{t('vitals.fasting')}</option>
                  <option value="pre_meal">{t('vitals.pre_meal')}</option>
                  <option value="post_meal">{t('vitals.post_meal')}</option>
                  <option value="bedtime">{t('vitals.bedtime')}</option>
                </select>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-16 text-xl rounded-xl mt-4">
                {t('common.save')}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>}

      {/* Weight Card */}
      {showWeight && <Card className="rounded-2xl shadow-md border-0 bg-background overflow-hidden transition-all duration-300 mb-10">
        <CardHeader className="pb-3 flex flex-row items-center justify-between cursor-pointer" onClick={() => setWeightOpen(!weightOpen)}>
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Scale className="text-primary w-8 h-8" />
              {t('vitals.weight_title')}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full">
            {weightOpen ? <Minus className="w-8 h-8 text-muted-foreground" /> : <Plus className="w-8 h-8 text-primary" />}
          </Button>
        </CardHeader>
        {weightOpen && (
          <CardContent>
            {weightHistory.length > 0 && (
              <div className="h-40 w-full mb-4 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightHistory}>
                    <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="체중 (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Weight History List */}
            {weightRaw.length > 0 && (
              <div className="mb-5 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">기록 내역</h3>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {weightRaw.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-emerald-500 min-w-[60px]">{entry.weight_kg} kg</span>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(entry.measured_at || entry.created_at), 'MM/dd HH:mm')}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDeleteWeight(entry.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleWeightSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-lg">{t('vitals.weight_kg')}</Label>
                <input type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className={numInputClass} />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-16 text-xl rounded-xl mt-4">
                {t('common.save')}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>}

    </div>
  )
}
