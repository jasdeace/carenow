import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, Loader2, Utensils, Dumbbell, PenLine, ImageIcon } from 'lucide-react'
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera'

interface Props {
  open: boolean
  onClose: () => void
  onAdded: () => void
  todayStr: string
}

const ACTIVITIES = [
  { name: '걷기', icon: '🚶' },
  { name: '달리기', icon: '🏃' },
  { name: '테니스', icon: '🎾' },
  { name: '헬스', icon: '🏋️' },
  { name: '수영', icon: '🏊' },
  { name: '자전거', icon: '🚴' },
  { name: '요가', icon: '🧘' },
  { name: '등산', icon: '⛰️' },
]

export default function NutriAddEntry({ open, onClose, onAdded, todayStr }: Props) {
  const { user, profile, fetchProfile } = useAuthStore()
  const [tab, setTab] = useState<'photo'|'manual'|'activity'>('photo')
  const [loading, setLoading] = useState(false)

  // Manual meal state
  const [mealDesc, setMealDesc] = useState('')
  const [mealType, setMealType] = useState('lunch')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  // Activity state
  const [actName, setActName] = useState('')
  const [actDuration, setActDuration] = useState('')
  const [actCalories, setActCalories] = useState('')

  // AI result preview
  const [aiResult, setAiResult] = useState<any>(null)

  const resetForm = () => {
    setMealDesc(''); setCalories(''); setProtein(''); setCarbs(''); setFat('')
    setActName(''); setActDuration(''); setActCalories('')
    setAiResult(null); setTab('photo')
  }

  const handleNativePhoto = async (source: CameraSource) => {
    if (!user?.id) return
    if ((profile?.token_balance ?? 0) < 1) {
      alert('토큰이 부족합니다. 토큰을 충전해주세요.')
      return
    }

    try {
      const photo = await CapacitorCamera.getPhoto({
        resultType: CameraResultType.Base64,
        source: source,
        quality: 80,
        width: 1200 // Let native capacitor handle the resizing
      })

      if (!photo.base64String) return

      setLoading(true)
      const b64 = `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`
      
      const result = await api.analyzeMealPhoto(b64)
      if (result?.analysis) {
        setAiResult(result.analysis)
        setMealDesc(result.analysis.description || '')
        setMealType(result.analysis.meal_type || 'lunch')
        setCalories(String(result.analysis.calories || 0))
        setProtein(String(result.analysis.protein_g || 0))
        setCarbs(String(result.analysis.carbs_g || 0))
        setFat(String(result.analysis.fat_g || 0))
        setTab('manual')
        await api.deductToken(user.id, 1, 'meal_analysis')
        await fetchProfile(user.id)
      }
    } catch (err: any) {
      // Ignore user cancellation errors
      if (err.message && err.message.toLowerCase().includes('user cancelled')) return;
      alert('분석 실패: ' + (err?.message || '다시 시도해주세요'))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMeal = async () => {
    if (!user?.id || !mealDesc.trim()) return
    setLoading(true)
    try {
      await api.addNutritionEntry({
        user_id: user.id, entry_date: todayStr, entry_type: 'meal',
        meal_type: mealType, description: mealDesc,
        calories: Number(calories) || 0, protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0, fat_g: Number(fat) || 0,
        ai_analysis: aiResult
      })
      resetForm(); onClose(); onAdded()
    } catch (err: any) {
      alert('저장 실패: ' + (err?.message || ''))
    } finally { setLoading(false) }
  }

  const handleSaveActivity = async () => {
    if (!user?.id || !actName.trim()) return
    setLoading(true)
    try {
      await api.addNutritionEntry({
        user_id: user.id, entry_date: todayStr, entry_type: 'activity',
        activity_name: actName, duration_minutes: Number(actDuration) || 0,
        calories: -(Number(actCalories) || 0)
      })
      resetForm(); onClose(); onAdded()
    } catch (err: any) {
      alert('저장 실패: ' + (err?.message || ''))
    } finally { setLoading(false) }
  }

  const tabs = [
    { key: 'photo', label: '📷 촬영', icon: Camera },
    { key: 'manual', label: '✍️ 직접입력', icon: PenLine },
    { key: 'activity', label: '🏃 활동', icon: Dumbbell },
  ] as const

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent className="w-11/12 rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">기록 추가</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Photo Tab */}
        {tab === 'photo' && (
          <div className="space-y-4 py-4">
            {loading ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-primary animate-pulse">AI가 음식을 분석하고 있습니다...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button variant="outline" className="w-full h-28 text-lg flex flex-col gap-2 border-primary/50 text-primary bg-primary/5"
                  onClick={() => handleNativePhoto(CameraSource.Camera)}>
                  <Camera className="w-8 h-8" />
                  카메라로 촬영
                </Button>
                <Button variant="outline" className="w-full h-28 text-lg flex flex-col gap-2 border-violet-400/50 text-violet-600 bg-violet-50/50 dark:bg-violet-950/20"
                  onClick={() => handleNativePhoto(CameraSource.Photos)}>
                  <ImageIcon className="w-8 h-8" />
                  갤러리에서 선택
                </Button>
                <p className="text-xs text-center text-muted-foreground">토큰 1개 차감 (잔여: {profile?.token_balance ?? 0}개)</p>
              </div>
            )}
          </div>
        )}

        {/* Manual Input Tab */}
        {tab === 'manual' && (
          <div className="space-y-4 py-2">
            {aiResult && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
                <p className="text-xs text-emerald-600 font-medium mb-1">🤖 AI 분석 결과 (수정 가능)</p>
                {aiResult.notes && <p className="text-xs text-muted-foreground">{aiResult.notes}</p>}
              </div>
            )}
            <div className="flex gap-2">
              {['breakfast','lunch','dinner','snack'].map(mt => (
                <button key={mt} onClick={() => setMealType(mt)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${mealType === mt ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/20 border-transparent'}`}>
                  {mt === 'breakfast' ? '아침' : mt === 'lunch' ? '점심' : mt === 'dinner' ? '저녁' : '간식'}
                </button>
              ))}
            </div>
            <div><Label>음식 설명</Label><Input value={mealDesc} onChange={e => setMealDesc(e.target.value)} placeholder="예: 비빔밥, 된장찌개" className="h-12 mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>칼로리 (kcal)</Label><Input type="number" value={calories} onChange={e => setCalories(e.target.value)} className="h-12 mt-1" /></div>
              <div><Label>단백질 (g)</Label><Input type="number" value={protein} onChange={e => setProtein(e.target.value)} className="h-12 mt-1" /></div>
              <div><Label>탄수화물 (g)</Label><Input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} className="h-12 mt-1" /></div>
              <div><Label>지방 (g)</Label><Input type="number" value={fat} onChange={e => setFat(e.target.value)} className="h-12 mt-1" /></div>
            </div>
            <Button onClick={handleSaveMeal} disabled={loading || !mealDesc.trim()} className="w-full h-14 text-lg rounded-xl">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Utensils className="w-5 h-5 mr-2" />}
              식사 저장
            </Button>
          </div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-2">
              {ACTIVITIES.map(a => (
                <button key={a.name} onClick={() => setActName(a.name)}
                  className={`py-3 rounded-xl text-center border transition-all ${actName === a.name ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/20 border-transparent'}`}>
                  <div className="text-xl">{a.icon}</div>
                  <div className="text-[11px] font-medium mt-1">{a.name}</div>
                </button>
              ))}
            </div>
            <div><Label>직접 입력</Label><Input value={actName} onChange={e => setActName(e.target.value)} placeholder="활동명" className="h-12 mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>시간 (분)</Label><Input type="number" value={actDuration} onChange={e => setActDuration(e.target.value)} placeholder="60" className="h-12 mt-1" /></div>
              <div><Label>소모 칼로리</Label><Input type="number" value={actCalories} onChange={e => setActCalories(e.target.value)} placeholder="300" className="h-12 mt-1" /></div>
            </div>
            <Button onClick={handleSaveActivity} disabled={loading || !actName.trim()} className="w-full h-14 text-lg rounded-xl">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Dumbbell className="w-5 h-5 mr-2" />}
              활동 저장
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
