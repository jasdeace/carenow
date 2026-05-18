import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, ChevronUp, ChevronDown, Sparkles, Clock } from 'lucide-react'

interface Props {
  todayEntries: any[]
  dailySummary: { caloriesIn: number, burned: number, protein: number, carbs: number, fat: number }
  onEntriesChanged: () => void
}

export default function NutriChat({ todayEntries, dailySummary, onEntriesChanged }: Props) {
  const { user, profile, fetchProfile } = useAuthStore()
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: '안녕하세요! 🍽️ 오늘 드신 음식이나 운동을 말씀해주시면 기록해 드릴게요. 예: "점심에 김치찌개 먹었어", "테니스 1시간 했어"' }
  ])
  const [loading, setLoading] = useState(false)
  const [chatLoaded, setChatLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Load saved chat on mount
  useEffect(() => {
    if (user?.id && !chatLoaded) {
      api.getNutritionChat(user.id, todayStr).then(data => {
        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages)
        }
        setChatLoaded(true)
      }).catch(() => { setChatLoaded(true) })
    }
  }, [user?.id])

  const handleSend = async () => {
    if (!input.trim() || !user?.id || loading) return
    if ((profile?.token_balance ?? 0) < 1) {
      alert('토큰이 부족합니다.')
      return
    }

    const userMsg = input.trim()
    const newMsgs = [...messages, { role: 'user' as const, text: userMsg }]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const result = await api.nutritionChat(user.id, userMsg, todayEntries, dailySummary, newMsgs)
      const finalMsgs = [...newMsgs, { role: 'ai' as const, text: result.reply || '처리되었습니다.' }]
      setMessages(finalMsgs)

      // Deduct token (non-blocking)
      try {
        await api.deductToken(user.id, 1, 'nutrition_chat')
        await fetchProfile(user.id)
      } catch (tokenErr) {
        console.warn('Token deduction failed:', tokenErr)
      }

      // Save chat history (non-blocking)
      api.saveNutritionChat(user.id, todayStr, finalMsgs).catch(() => {})

      // If any actions were executed, refresh entries without clearing chat
      if (result.actions && result.actions.length > 0) {
        onEntriesChanged()
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', text: '오류가 발생했습니다. 다시 시도해주세요.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!expanded) {
    return (
      <div onClick={() => setExpanded(true)}
        className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <span className="font-semibold text-sm">AI 영양사</span>
            <span className="text-xs text-muted-foreground">• 토큰 {profile?.token_balance ?? 0}개</span>
          </div>
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {messages[messages.length - 1]?.text || '채팅으로 식단을 기록하세요'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-background border rounded-2xl shadow-lg overflow-hidden flex flex-col" style={{ height: '50vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-violet-50/50 dark:bg-violet-950/20 shrink-0 cursor-pointer"
        onClick={() => setExpanded(false)}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <span className="font-semibold text-sm">AI 영양사</span>
          <span className="text-xs text-muted-foreground">토큰 {profile?.token_balance ?? 0}개</span>
        </div>
        <ChevronDown className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Auto-deletion notice */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/30 rounded-lg px-3 py-1.5">
          <Clock className="w-3 h-3" />
          <span>채팅 기록은 24시간 후 자동 삭제됩니다</span>
        </div>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary/40 rounded-tl-sm'
            }`}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary/40 rounded-2xl rounded-tl-sm px-3 py-2 flex gap-1">
              <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{animationDelay:'0.1s'}} />
              <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{animationDelay:'0.2s'}} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t bg-background shrink-0 flex gap-2">
        <Textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }}}
          placeholder="예: 점심에 비빔밥 먹었어" className="min-h-[44px] max-h-24 resize-none rounded-xl text-sm" />
        <Button size="icon" onClick={handleSend} disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-full shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
