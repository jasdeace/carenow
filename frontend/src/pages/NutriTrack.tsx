import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Utensils, Dumbbell, Flame, TrendingUp, ChevronRight, ChevronLeft, Edit2 } from 'lucide-react'
import NutriAddEntry from '../components/nutrition/NutriAddEntry'
import NutriChat from '../components/nutrition/NutriChat'

export default function NutriTrack() {
  const { user } = useAuthStore()
  const [entries, setEntries] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showWeekly, setShowWeekly] = useState(false)
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editCal, setEditCal] = useState('')

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(new Date())
  const dateStr = selectedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  const isToday = dateStr === todayStr
  const koDays = ['일','월','화','수','목','금','토']

  const loadEntries = async () => {
    if (!user?.id) return
    try {
      const data = await api.getNutritionEntries(user.id, dateStr)
      setEntries(data)
    } catch (e) { console.error(e) }
  }

  const loadWeekly = async () => {
    if (!user?.id) return
    try {
      const data = await api.getWeeklyNutrition(user.id)
      setWeeklyData(data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadEntries() }, [user?.id, dateStr])
  useEffect(() => { loadWeekly() }, [user?.id])

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    try { await api.deleteNutritionEntry(id); loadEntries() } catch (e) { console.error(e) }
  }

  const handleEditSave = async (id: string) => {
    try {
      await api.updateNutritionEntry(id, { calories: Number(editCal) || 0 })
      setEditingId(null); loadEntries()
    } catch (e) { console.error(e) }
  }

  const goDate = (offset: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    // Don't allow future dates
    if (d > new Date()) return
    setSelectedDate(d)
  }

  const formatDateLabel = (d: Date) => {
    if (d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }) === todayStr) return '오늘'
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }) === yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })) return '어제'
    return `${d.getMonth()+1}월 ${d.getDate()}일 (${koDays[d.getDay()]})`
  }

  // Calculate day's summary
  const meals = entries.filter(e => e.entry_type === 'meal')
  const activities = entries.filter(e => e.entry_type === 'activity')
  const caloriesIn = meals.reduce((s, e) => s + (e.calories || 0), 0)
  const caloriesBurned = activities.reduce((s, e) => s + Math.abs(e.calories || 0), 0)
  const netCalories = caloriesIn - caloriesBurned
  const totalProtein = meals.reduce((s, e) => s + Number(e.protein_g || 0), 0)
  const totalCarbs = meals.reduce((s, e) => s + Number(e.carbs_g || 0), 0)
  const totalFat = meals.reduce((s, e) => s + Number(e.fat_g || 0), 0)
  const TARGET = 2000

  // Circular progress
  const pct = Math.min(100, Math.round((caloriesIn / TARGET) * 100))
  const r = 54, c = 2 * Math.PI * r
  const dashOffset = c - (pct / 100) * c

  return (
    <div className="flex flex-col bg-secondary/20 px-4 pt-6 pb-6 space-y-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">식단 관리</h1>
          <p className="text-lg text-muted-foreground">영양 기록</p>
        </div>
        <Button size="icon" className="w-14 h-14 rounded-full shadow-lg" onClick={() => setShowAdd(true)}>
          <Plus className="w-8 h-8" />
        </Button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-background rounded-xl shadow-sm border px-3 py-2">
        <button onClick={() => goDate(-1)} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setSelectedDate(new Date())} className="flex flex-col items-center">
          <span className="text-base font-semibold">{formatDateLabel(selectedDate)}</span>
          {!isToday && (
            <span className="text-[10px] text-muted-foreground">{selectedDate.getMonth()+1}/{selectedDate.getDate()}</span>
          )}
        </button>
        <button onClick={() => goDate(1)} className={`p-2 rounded-lg transition-colors ${isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-secondary/50'}`}
          disabled={isToday}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary */}
      <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-6">
            {/* Calorie Ring */}
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary/30" />
                <circle cx="60" cy="60" r={r} fill="none" stroke="url(#grad)" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={c} strokeDashoffset={dashOffset}
                  className="transition-all duration-700" />
                <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#06b6d4" />
                </linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{caloriesIn}</span>
                <span className="text-[10px] text-muted-foreground">/ {TARGET} kcal</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Utensils className="w-3 h-3" /> 섭취</span>
                <span className="text-sm font-bold text-emerald-600">{caloriesIn} kcal</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="w-3 h-3" /> 소모</span>
                <span className="text-sm font-bold text-orange-500">{caloriesBurned} kcal</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-xs font-medium">순 칼로리</span>
                <span className={`text-sm font-bold ${netCalories > TARGET ? 'text-red-500' : 'text-foreground'}`}>{netCalories} kcal</span>
              </div>
              {/* Macro bars */}
              <div className="flex gap-2 pt-1">
                <div className="flex-1"><div className="text-[9px] text-center text-muted-foreground mb-0.5">단백질</div>
                  <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min(100,totalProtein/60*100)}%`}} /></div>
                  <div className="text-[9px] text-center font-medium mt-0.5">{totalProtein.toFixed(0)}g</div></div>
                <div className="flex-1"><div className="text-[9px] text-center text-muted-foreground mb-0.5">탄수화물</div>
                  <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{width:`${Math.min(100,totalCarbs/250*100)}%`}} /></div>
                  <div className="text-[9px] text-center font-medium mt-0.5">{totalCarbs.toFixed(0)}g</div></div>
                <div className="flex-1"><div className="text-[9px] text-center text-muted-foreground mb-0.5">지방</div>
                  <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden"><div className="h-full bg-rose-500 rounded-full" style={{width:`${Math.min(100,totalFat/65*100)}%`}} /></div>
                  <div className="text-[9px] text-center font-medium mt-0.5">{totalFat.toFixed(0)}g</div></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Button */}
      <button onClick={() => setShowWeekly(!showWeekly)}
        className="flex items-center justify-between w-full px-4 py-3 bg-background rounded-xl border shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-sm font-medium">주간 기록</span></div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showWeekly ? 'rotate-90' : ''}`} />
      </button>

      {/* Weekly Chart */}
      {showWeekly && weeklyData.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-0 bg-background overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4">
            <div className="flex items-end justify-between gap-1 h-32">
              {weeklyData.map((d, i) => {
                const maxCal = Math.max(...weeklyData.map(w => w.caloriesIn || 1), TARGET)
                const barH = Math.max(4, (d.caloriesIn / maxCal) * 100)
                const burnH = Math.max(0, (d.caloriesBurned / maxCal) * 100)
                const dayDate = new Date(d.date)
                const isDayToday = d.date === todayStr
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-muted-foreground">{d.caloriesIn || '-'}</span>
                    <div className="w-full flex flex-col items-center gap-0.5" style={{height:'80px'}}>
                      <div className={`w-5 rounded-t-sm ${isDayToday ? 'bg-emerald-500' : 'bg-emerald-300'}`} style={{height:`${barH}%`, minHeight:'4px'}} />
                      {burnH > 0 && <div className="w-5 rounded-b-sm bg-orange-300" style={{height:`${burnH}%`, minHeight:'2px'}} />}
                    </div>
                    <span className={`text-[10px] font-medium ${isDayToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {koDays[dayDate.getDay()]}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 justify-center mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> 섭취</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-300" /> 소모</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold px-1">{isToday ? '오늘의 기록' : `${selectedDate.getMonth()+1}/${selectedDate.getDate()} 기록`}</h2>
        {entries.length === 0 ? (
          <Card className="bg-background border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground text-center space-y-2">
              <Utensils className="w-10 h-10 opacity-20" />
              <p>아직 기록이 없습니다</p>
              <p className="text-xs">사진 촬영이나 채팅으로 기록해보세요</p>
            </CardContent>
          </Card>
        ) : (
          entries.map(entry => (
            <Card key={entry.id} className="rounded-xl shadow-sm border-0 bg-background overflow-hidden">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  entry.entry_type === 'meal' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                  {entry.entry_type === 'meal' ? <Utensils className="w-5 h-5 text-emerald-600" /> : <Dumbbell className="w-5 h-5 text-orange-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.description || entry.activity_name || '기록'}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.entry_type === 'meal' && entry.meal_type && (
                      <span>{entry.meal_type === 'breakfast' ? '아침' : entry.meal_type === 'lunch' ? '점심' : entry.meal_type === 'dinner' ? '저녁' : '간식'} • </span>
                    )}
                    {entry.entry_type === 'activity' && entry.duration_minutes && <span>{entry.duration_minutes}분 • </span>}
                    {entry.is_manually_edited && <span>✏️ </span>}
                    {new Date(entry.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {editingId === entry.id ? (
                    <div className="flex items-center gap-1">
                      <input type="number" value={editCal} onChange={e => setEditCal(e.target.value)}
                        className="w-16 h-8 text-sm text-right border rounded px-1" autoFocus />
                      <button onClick={() => handleEditSave(entry.id)} className="text-xs text-primary font-medium">✓</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold ${entry.entry_type === 'activity' ? 'text-orange-500' : 'text-emerald-600'}`}>
                        {entry.entry_type === 'activity' ? '-' : ''}{Math.abs(entry.calories)} kcal
                      </span>
                      <button onClick={() => { setEditingId(entry.id); setEditCal(String(Math.abs(entry.calories))) }}
                        className="p-1 text-muted-foreground hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(entry.id)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* AI Chat — only show for today */}
      {isToday && (
        <NutriChat
          todayEntries={entries}
          dailySummary={{ caloriesIn, burned: caloriesBurned, protein: totalProtein, carbs: totalCarbs, fat: totalFat }}
          onEntriesChanged={loadEntries}
        />
      )}

      {/* Add Entry Dialog */}
      <NutriAddEntry open={showAdd} onClose={() => setShowAdd(false)} onAdded={loadEntries} todayStr={dateStr} />

      {/* Bottom spacer */}
      <div className="h-4" />
    </div>
  )
}
