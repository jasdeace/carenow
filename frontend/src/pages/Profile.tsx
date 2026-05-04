import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { normalizePhone, formatPhone } from '../lib/phoneUtils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Copy, Check, User, LogOut, Globe, Eye, HeartPulse, Droplets, Scale, Trash2 } from 'lucide-react'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { user, profile, fetchProfile, signOut } = useAuthStore()
  
  const [circleId, setCircleId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [phone, setPhone] = useState(formatPhone(profile?.phone_kr || ''))
  const [email, setEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Vitals toggle state (stored in localStorage for now)
  const [showBP, setShowBP] = useState(() => localStorage.getItem('vitals_show_bp') !== 'false')
  const [showGlucose, setShowGlucose] = useState(() => localStorage.getItem('vitals_show_glucose') !== 'false')
  const [showWeight, setShowWeight] = useState(() => localStorage.getItem('vitals_show_weight') !== 'false')

  // Care circle viewers
  const [viewers, setViewers] = useState<any[]>([])

  useEffect(() => {
    if (profile?.phone_kr) setPhone(formatPhone(profile.phone_kr))
    const realEmail = profile?.email && !profile.email.endsWith('@carelink.app') ? profile.email : ''
    setEmail(realEmail)
  }, [profile?.phone_kr, profile?.email])

  useEffect(() => {
    if (user?.id) {
      api.getLovedOneCircleId(user.id).then(id => {
        if (id) {
          setCircleId(id)
          loadViewers(id)
        } else {
          api.createCareCircleForLovedOne(user.id, profile?.name_ko || 'User')
            .then(() => api.getLovedOneCircleId(user.id!))
            .then(realCircleId => {
              setCircleId(realCircleId)
              if (realCircleId) loadViewers(realCircleId)
            })
            .catch(e => console.error(e))
        }
      }).catch(console.error)
    }
  }, [user?.id])

  const loadViewers = async (cId: string) => {
    try {
      const data = await api.getCareCircleViewers(cId)
      setViewers(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveViewer = async (memberId: string) => {
    try {
      await api.removeCareCircleMember(memberId)
      alert(t('profile.removed'))
      if (circleId) loadViewers(circleId)
    } catch (e) {
      console.error(e)
    }
  }

  const copyToClipboard = () => {
    if (circleId) {
      navigator.clipboard.writeText(circleId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSavePhone = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      const normalized = normalizePhone(phone)
      const { error } = await supabase
        .from('users')
        .update({ phone_kr: normalized })
        .eq('id', user.id)
      if (error) throw error
      await fetchProfile(user.id)
      alert(t('profile.phone_saved'))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEmail = async () => {
    if (!user?.id || !email) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ email })
        .eq('id', user.id)
      if (error) throw error
      await fetchProfile(user.id)
      alert(t('profile.email_saved'))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRoleChange = async (newRole: string) => {
    if (!user?.id || newRole === profile?.role) return
    try {
      await api.updateUserRole(user.id, newRole as 'loved_one' | 'caregiver')
      await fetchProfile(user.id)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleToggleBP = (v: boolean) => {
    setShowBP(v)
    localStorage.setItem('vitals_show_bp', v.toString())
  }
  const handleToggleGlucose = (v: boolean) => {
    setShowGlucose(v)
    localStorage.setItem('vitals_show_glucose', v.toString())
  }
  const handleToggleWeight = (v: boolean) => {
    setShowWeight(v)
    localStorage.setItem('vitals_show_weight', v.toString())
  }

  const currentRealEmail = profile?.email && !profile.email.endsWith('@carelink.app') ? profile.email : null

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/20 px-4 pt-8 pb-24 space-y-6 max-w-md mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t('profile.title')}</h1>
        <p className="text-lg text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      {/* Language Toggle */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-primary" />
            <span className="text-lg font-medium">{t('profile.language')}</span>
          </div>
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-32 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ko">{t('profile.language_ko')}</SelectItem>
              <SelectItem value="en">{t('profile.language_en')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* My Info */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            <User className="text-primary w-8 h-8" />
            {t('profile.my_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-lg">{t('profile.name')}</Label>
            <Input disabled value={profile?.name_ko || ''} className="h-14 text-lg bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-lg">{t('profile.change_role')}</Label>
            <Select value={profile?.role || 'loved_one'} onValueChange={handleRoleChange}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loved_one">{t('profile.role_taker')}</SelectItem>
                <SelectItem value="caregiver">{t('profile.role_giver')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-lg">{t('profile.phone')}</Label>
            <div className="flex gap-2">
              <Input 
                value={phone} 
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-XXXX-XXXX" 
                className="h-14 text-lg" 
              />
              <Button onClick={handleSavePhone} disabled={isSaving || normalizePhone(phone) === profile?.phone_kr} className="h-14 px-6 text-lg">
                {t('profile.save')}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-lg">{t('profile.email')}</Label>
            <div className="flex gap-2">
              <Input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('profile.email_placeholder')}
                className="h-14 text-lg" 
              />
              <Button onClick={handleSaveEmail} disabled={isSaving || !email || email === currentRealEmail} className="h-14 px-6 text-lg">
                {t('profile.save')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('profile.email_hint')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Circle Code */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">{t('profile.circle_code')}</CardTitle>
          <CardDescription>{t('profile.circle_code_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input readOnly value={circleId || t('common.loading')} className="h-14 text-lg bg-secondary/50" />
            <Button onClick={copyToClipboard} variant="outline" className="h-14 px-4">
              {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vitals Display Settings */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            <HeartPulse className="text-rose-500 w-7 h-7" />
            {t('profile.vitals_settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <HeartPulse className="w-5 h-5 text-rose-500" />
              <span className="text-lg">{t('profile.show_bp')}</span>
            </div>
            <Switch checked={showBP} onCheckedChange={handleToggleBP} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Droplets className="w-5 h-5 text-blue-500" />
              <span className="text-lg">{t('profile.show_glucose')}</span>
            </div>
            <Switch checked={showGlucose} onCheckedChange={handleToggleGlucose} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-emerald-500" />
              <span className="text-lg">{t('profile.show_weight')}</span>
            </div>
            <Switch checked={showWeight} onCheckedChange={handleToggleWeight} />
          </div>
        </CardContent>
      </Card>

      {/* Who Sees My Data */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Eye className="text-primary w-7 h-7" />
            {t('profile.who_sees')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {viewers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t('profile.no_viewers')}</p>
          ) : (
            viewers.map((v) => {
              const userInfo = v.users as any
              const displayName = userInfo?.name_ko || userInfo?.email || '알 수 없음'
              return (
                <div key={v.id} className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-base">{displayName}</p>
                      {userInfo?.phone_kr && (
                        <p className="text-sm text-muted-foreground">{formatPhone(userInfo.phone_kr)}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 h-9 px-3 rounded-full" onClick={() => handleRemoveViewer(v.id)}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    {t('profile.remove_viewer')}
                  </Button>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Button onClick={() => signOut()} variant="destructive" className="w-full h-16 text-xl rounded-xl mt-8">
        <LogOut className="w-6 h-6 mr-2" />
        {t('profile.signout')}
      </Button>
    </div>
  )
}
