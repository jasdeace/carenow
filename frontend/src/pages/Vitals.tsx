import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HeartPulse, Droplets, Scale } from 'lucide-react'

export default function Vitals() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // BP State
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [pulse, setPulse] = useState('')

  // Glucose State
  const [glucose, setGlucose] = useState('')
  const [glucoseTiming, setGlucoseTiming] = useState('fasting')

  // Weight State
  const [weight, setWeight] = useState('')

  const handleBPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    setLoading(true)
    try {
      await api.logVitalBP(profile.id, Number(sys), Number(dia), pulse ? Number(pulse) : undefined)
      setSuccessMsg(t('vitals.success_saved'))
      setSys(''); setDia(''); setPulse('')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGlucoseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    setLoading(true)
    try {
      await api.logVitalGlucose(profile.id, Number(glucose), glucoseTiming)
      setSuccessMsg(t('vitals.success_saved'))
      setGlucose('')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    setLoading(true)
    try {
      await api.logVitalWeight(profile.id, Number(weight))
      setSuccessMsg(t('vitals.success_saved'))
      setWeight('')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/20 px-4 pt-8 space-y-6 max-w-md mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t('vitals.title')}</h1>
        <p className="text-lg text-muted-foreground">{t('vitals.subtitle')}</p>
      </div>

      {successMsg && (
        <div className="bg-primary/20 text-primary border border-primary/50 p-4 rounded-xl text-center font-medium">
          {successMsg}
        </div>
      )}

      {/* Blood Pressure Card */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            <HeartPulse className="text-rose-500 w-8 h-8" />
            {t('vitals.bp_title')}
          </CardTitle>
          <CardDescription>{t('vitals.bp_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBPSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-lg">{t('vitals.sys')}</Label>
                <Input type="number" required value={sys} onChange={e => setSys(e.target.value)} className="h-16 text-2xl text-center" placeholder="120" />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-lg">{t('vitals.dia')}</Label>
                <Input type="number" required value={dia} onChange={e => setDia(e.target.value)} className="h-16 text-2xl text-center" placeholder="80" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-lg">{t('vitals.pulse')}</Label>
              <Input type="number" value={pulse} onChange={e => setPulse(e.target.value)} className="h-16 text-2xl" placeholder="72 (Optional)" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-16 text-xl rounded-xl">
              {t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Glucose Card */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Droplets className="text-blue-500 w-8 h-8" />
            {t('vitals.glucose_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGlucoseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-lg">{t('vitals.glucose_level')}</Label>
              <Input type="number" required value={glucose} onChange={e => setGlucose(e.target.value)} className="h-16 text-2xl" placeholder="mg/dL" />
            </div>
            <div className="space-y-2">
              <Label className="text-lg">{t('vitals.timing')}</Label>
              <Select value={glucoseTiming} onValueChange={setGlucoseTiming}>
                <SelectTrigger className="h-16 text-xl">
                  <SelectValue placeholder="Timing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fasting">{t('vitals.fasting')}</SelectItem>
                  <SelectItem value="pre_meal">{t('vitals.pre_meal')}</SelectItem>
                  <SelectItem value="post_meal">{t('vitals.post_meal')}</SelectItem>
                  <SelectItem value="bedtime">{t('vitals.bedtime')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-16 text-xl rounded-xl">
              {t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Weight Card */}
      <Card className="rounded-2xl shadow-md border-0 bg-background mb-10">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Scale className="text-primary w-8 h-8" />
            {t('vitals.weight_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWeightSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-lg">{t('vitals.weight_kg')}</Label>
              <Input type="number" required step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="h-16 text-2xl" placeholder="kg" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-16 text-xl rounded-xl">
              {t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}
