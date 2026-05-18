import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { normalizePhone, formatPhone } from '../lib/phoneUtils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { User, LogOut, Globe, HeartPulse, Loader2, ShieldCheck, FileText, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, Sparkles, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { user, profile, fetchProfile, signOut } = useAuthStore()


  const [phone, setPhone] = useState(formatPhone(profile?.phone_kr || ''))
  const [isSaving, setIsSaving] = useState(false)

  // Vitals toggle state
  const [showBP, setShowBP] = useState(() => localStorage.getItem('vitals_show_bp') !== 'false')
  const [showGlucose, setShowGlucose] = useState(() => localStorage.getItem('vitals_show_glucose') !== 'false')
  const [showWeight, setShowWeight] = useState(() => localStorage.getItem('vitals_show_weight') !== 'false')

  // Token history
  const [showTokenHistory, setShowTokenHistory] = useState(false)
  const [tokenHistory, setTokenHistory] = useState<any[]>([])
  const [tokenHistoryLoading, setTokenHistoryLoading] = useState(false)

  useEffect(() => {
    if (profile?.phone_kr) setPhone(formatPhone(profile.phone_kr))
  }, [profile?.phone_kr])

  useEffect(() => {
    if (user?.id) loadCircleInfo()
  }, [user?.id])

  const loadCircleInfo = async () => {
    if (!user?.id) return
    try {
      const cId = await api.getLovedOneCircleId(user.id)
      if (!cId) {
        // Every user has their own care circle for meds, vitals and labs
        await api.createCareCircleForLovedOne(user.id, profile?.name_ko || 'User')
      }
    } catch (e) {
      console.error('Failed to load circle info:', e)
    }
  }

  const handleSavePhone = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      const normalized = normalizePhone(phone)
      const { error } = await supabase.from('users').update({ phone_kr: normalized }).eq('id', user.id)
      if (error) throw error
      await fetchProfile(user.id)
      alert(t('profile.phone_saved'))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.id) return
    const confirmed = window.confirm('정말 계정을 삭제하시겠습니까? 모든 건강 데이터와 설정이 영구적으로 삭제되며 복구할 수 없습니다.')
    if (!confirmed) return

    setIsSaving(true)
    try {
      await api.deleteAccount(user.id)
      await signOut()
    } catch (e) {
      console.error(e)
      alert('계정 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
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



  return (
    <div className="flex flex-col bg-secondary/20 px-4 pt-6 pb-6 space-y-4 max-w-md mx-auto">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-bold text-foreground">{t('profile.title')}</h1>
        <p className="text-lg text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      {/* Token Balance & History */}
      <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 overflow-hidden">
        <CardContent className="p-0">
          <button className="w-full p-4 flex items-center justify-between" onClick={async () => {
            if (!showTokenHistory) {
              setTokenHistoryLoading(true)
              try {
                const data = await api.getTokenHistory(user?.id || '')
                setTokenHistory(data)
              } catch (e) { console.error(e) }
              setTokenHistoryLoading(false)
            }
            setShowTokenHistory(!showTokenHistory)
          }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">AI 토큰</p>
                <p className="text-xs text-muted-foreground">식단 분석, 검사 상담에 사용</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-2xl font-bold text-violet-600">{profile?.token_balance ?? 0}</span>
                <span className="text-sm text-muted-foreground ml-1">개</span>
              </div>
              {showTokenHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {showTokenHistory && (
            <div className="border-t px-4 pb-4 pt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="text-xs font-medium text-muted-foreground">사용 내역</p>
              {tokenHistoryLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
              ) : tokenHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">아직 사용 내역이 없습니다</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {tokenHistory.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between py-2 px-2 rounded-lg bg-background/60">
                      <div className="flex items-center gap-2">
                        {tx.amount < 0 ? (
                          <ArrowUpCircle className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-medium">
                            {tx.reason === 'nutrition_chat' ? 'AI 영양사 채팅' :
                             tx.reason === 'meal_analysis' ? '식단 사진 분석' :
                             tx.reason === 'lab_consultation' ? '검사결과 상담' :
                             tx.reason === 'signup_bonus' ? '가입 보너스' :
                             tx.reason === 'admin_topup' ? '관리자 충전' :
                             tx.reason}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${tx.amount < 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <User className="text-primary w-6 h-6" />
            {t('profile.my_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('profile.name')}</Label>
            <Input disabled value={profile?.name_ko || ''} className="h-12 bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label>{t('profile.phone')}</Label>
            <div className="flex gap-2">
              <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="010-1234-5678" className="h-12" />
              <Button onClick={handleSavePhone} disabled={isSaving || normalizePhone(phone) === profile?.phone_kr} className="h-12 px-6">
                {t('profile.save')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vitals Settings */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <HeartPulse className="text-rose-500 w-6 h-6" />
            {t('profile.vitals_settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-base">{t('profile.show_bp')}</span>
            <Switch checked={showBP} onCheckedChange={handleToggleBP} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-base">{t('profile.show_glucose')}</span>
            <Switch checked={showGlucose} onCheckedChange={handleToggleGlucose} />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-base">{t('profile.show_weight')}</span>
            <Switch checked={showWeight} onCheckedChange={handleToggleWeight} />
          </div>
        </CardContent>
      </Card>

      {/* Legal & About */}
      <Card className="rounded-2xl shadow-md border-0 bg-background">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ShieldCheck className="text-blue-500 w-6 h-6" />
            서비스 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-2">
          <Link to="/terms" className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-base font-medium">이용약관</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Link to="/privacy" className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
              <span className="text-base font-medium">개인정보처리방침</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Link to="/sensitive-info" className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <HeartPulse className="w-5 h-5 text-muted-foreground" />
              <span className="text-base font-medium">민감정보 수집 및 이용 동의</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      <div className="space-y-3 pt-4">
        <Button onClick={() => signOut()} variant="ghost" className="w-full h-14 text-muted-foreground hover:bg-secondary/50 rounded-xl">
          <LogOut className="w-5 h-5 mr-2" />
          {t('profile.signout')}
        </Button>
        
        <Button onClick={handleDeleteAccount} disabled={isSaving} variant="ghost" className="w-full h-14 text-destructive hover:bg-destructive/10 rounded-xl">
          <AlertTriangle className="w-5 h-5 mr-2" />
          계정 삭제 (데이터 파기)
        </Button>
        
        <div className="text-center text-xs text-muted-foreground py-4">
          CareNow v1.0.0 (Production Build)
        </div>
      </div>
    </div>
  )
}
