import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { processImageOCR } from '../lib/ocrService'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Plus, Camera, Loader2, Save, Trash2, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react'

export default function LabResults() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const user = useAuthStore(s => s.user)
  
  
  const [labs, setLabs] = useState<any[]>([])
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrText, setOcrText] = useState('')
  
  const [chatLab, setChatLab] = useState<any>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([])
  const [isChatting, setIsChatting] = useState(false)
  const [manualDate, setManualDate] = useState('')
  const [expandedLabs, setExpandedLabs] = useState<Set<string>>(new Set())
  // Tracks the keyboard-aware visible viewport so the chat panel stays above the keyboard
  const [chatViewport, setChatViewport] = useState(() => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    top: window.visualViewport?.offsetTop ?? 0,
  }))
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.id) loadLabs()
  }, [user?.id])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatHistory])

  // Keep the chat panel sized to the visible viewport so the keyboard never covers it
  useEffect(() => {
    if (!chatLab) return
    const vp = window.visualViewport
    if (!vp) return
    const update = () => {
      setChatViewport({ height: vp.height, top: vp.offsetTop })
      // keep the latest message visible above the keyboard
      requestAnimationFrame(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight })
      })
    }
    update()
    vp.addEventListener('resize', update)
    vp.addEventListener('scroll', update)
    return () => {
      vp.removeEventListener('resize', update)
      vp.removeEventListener('scroll', update)
    }
  }, [chatLab])

  const loadLabs = async () => {
    if (!user?.id) return
    try {
      const data = await api.getLabResults(user?.id)
      setLabs(data.map((d: any) => ({
        id: d.id,
        date: d.recorded_at,
        content: d.raw_content,
        parsedData: d.parsed_data,
        chat_history: d.chat_history
      })))
    } catch (e) {
      console.error(e)
    }
  }

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 2400
          const MAX_HEIGHT = 2400
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          // High quality (0.9) to maintain medical accuracy
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
          resolve(dataUrl)
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setOcrLoading(true)
    setOcrText('')

    try {
      const base64Strings = await Promise.all(files.map(file => compressImage(file)))
      const tier = profile?.tier === 'premium' ? 'premium' : 'free'
      
      const result = await processImageOCR(base64Strings, tier)
      
      if (result.parsedData) {
        setOcrText(JSON.stringify(result.parsedData, null, 2))
        if (result.parsedData.reportDate && /^\d{4}-\d{2}-\d{2}$/.test(result.parsedData.reportDate)) {
          setManualDate(result.parsedData.reportDate)
        } else {
          setManualDate(new Date().toISOString().split('T')[0])
        }
      } else {
        setOcrText(result.rawText)
        setManualDate(new Date().toISOString().split('T')[0])
      }
    } catch (err: any) {
      console.error('OCR failed', err)
      alert(`OCR Failed: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setOcrLoading(false)
    }
  }

  const handleSaveLab = async () => {
    if (!user?.id) return
    let parsedContent = null
    try {
      parsedContent = JSON.parse(ocrText)
    } catch (e) {
      console.warn('Could not parse OCR text as JSON')
    }

    let reportDate = new Date().toISOString().split('T')[0]
    if (parsedContent?.reportDate && parsedContent.reportDate !== 'null' && parsedContent.reportDate.trim() !== '') {
      // Validate date format roughly (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsedContent.reportDate)) {
        reportDate = parsedContent.reportDate
      }
    }

    try {
      await api.saveLabResult(user?.id, manualDate || reportDate, ocrText, parsedContent)
      setIsUploadOpen(false)
      setOcrText('')
      setManualDate('')
      loadLabs()
    } catch (e: any) {
      console.error(e)
      alert(`Failed to save lab result. Error: ${e?.message || JSON.stringify(e)}`)
    }
  }

  const handleDeleteLab = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await api.deleteLabResult(id)
      loadLabs()
    } catch (e) {
      console.error(e)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedLabs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAskAI = async () => {
    if (!chatInput.trim() || !chatLab) return
    if (!user?.id) return
    if ((profile?.tier !== 'premium') && (profile?.token_balance ?? 0) < 1) {
      alert('토큰이 부족합니다. 프로필에서 토큰을 충전해주세요.')
      return
    }
    const userMsg = chatInput
    
    const newHistoryUser = [...chatHistory, { role: 'user', text: userMsg }] as any
    setChatHistory(newHistoryUser)
    setChatInput('')
    setIsChatting(true)
    
    try {
      const reply = await api.askAI(userMsg, chatLab.parsedData || chatLab.content, newHistoryUser)
      const finalHistory = [...newHistoryUser, { role: 'ai', text: reply }] as any
      setChatHistory(finalHistory)
      
      // Deduct token
      try {
        await api.deductToken(user.id, 1, 'lab_consultation')
        // Refresh profile to update token balance in UI
        const { fetchProfile } = useAuthStore.getState()
        fetchProfile(user.id)
      } catch (tokenErr) {
        console.warn('Token deduction failed:', tokenErr)
      }
      
      // Update local state FIRST so history persists even if DB save fails
      setLabs(prev => prev.map(l => l.id === chatLab.id ? { ...l, chat_history: finalHistory } : l))
      setChatLab((prev: any) => ({ ...prev, chat_history: finalHistory }))
      
      // Save to database in the background (don't block UX)
      api.updateLabResultChat(chatLab.id, finalHistory).catch(err => {
        console.error('Failed to save chat history to DB:', err)
      })
    } catch (e) {
      console.error(e)
      setChatHistory(prev => [...prev, { role: 'ai', text: '오류가 발생했습니다. 다시 시도해주세요.' }])
    } finally {
      setIsChatting(false)
    }
  }

  let previewData: any = null
  let normalizedPreviewMetrics: Record<string, string> | null = null

  const normalizeMetrics = (metricsRaw: any): Record<string, string> | null => {
    if (!metricsRaw) return null
    if (typeof metricsRaw === 'string') return { 'Result': metricsRaw }
    
    const res: Record<string, string> = {}
    
    const processItem = (key: string, val: any) => {
      if (val === null || val === undefined) return
      if (typeof val === 'object' && !Array.isArray(val)) {
        // Flatten nested objects or use a key if it's a specific metric
        if (val.value !== undefined) {
          res[key] = String(val.value) + (val.unit ? ` ${val.unit}` : '')
        } else {
          Object.entries(val).forEach(([k, v]) => processItem(k, v))
        }
      } else if (Array.isArray(val)) {
        val.forEach((item, idx) => {
          if (typeof item === 'object') {
            const name = item.metricName || item.name || `${key}_${idx}`
            const value = item.value !== undefined ? String(item.value) : JSON.stringify(item)
            res[name] = value
          } else {
            res[`${key}_${idx}`] = String(item)
          }
        })
      } else {
        res[key] = String(val)
      }
    }

    if (typeof metricsRaw === 'object') {
      Object.entries(metricsRaw).forEach(([k, v]) => processItem(k, v))
    }
    
    return Object.keys(res).length > 0 ? res : null
  }

  if (ocrText && !ocrLoading) {
    try {
      previewData = JSON.parse(ocrText)
      normalizedPreviewMetrics = normalizeMetrics(previewData?.metrics || previewData)
      // If it parsed the whole object, let's filter out known non-metric keys if metrics wasn't explicitly provided
      if (!previewData?.metrics && normalizedPreviewMetrics) {
        delete normalizedPreviewMetrics.type
        delete normalizedPreviewMetrics.reportDate
        delete normalizedPreviewMetrics.medicationName
        delete normalizedPreviewMetrics.rawTextSummary
        delete normalizedPreviewMetrics.dosageAmount
        delete normalizedPreviewMetrics.dosageUnit
        if (Object.keys(normalizedPreviewMetrics).length === 0) {
          normalizedPreviewMetrics = null
        }
      }
    } catch (e) {}
  }

  return (
    <div className="flex flex-col bg-secondary/20 px-4 pt-6 pb-6 space-y-4 max-w-md mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('labs.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('labs.subtitle')}</p>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="w-14 h-14 rounded-full shadow-lg">
              <Plus className="w-8 h-8" />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-11/12 rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{t('labs.upload_title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4 flex flex-col">
              
              {!ocrText && !ocrLoading && (
                <div className="space-y-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageCapture}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-32 text-xl flex flex-col gap-2 border-primary/50 text-primary bg-primary/5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-8 h-8" />
                    {t('labs.scan_btn')}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground pt-2">{t('labs.scan_desc')}</p>
                </div>
              )}

              {ocrLoading && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-lg text-primary animate-pulse">{t('labs.analyzing')}</p>
                </div>
              )}

              {ocrText && !ocrLoading && (
                <div className="space-y-4 flex-1">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">검사일자</label>
                    <input 
                      type="date" 
                      value={manualDate} 
                      onChange={e => setManualDate(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border bg-background text-base focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  <p className="text-sm font-medium">{t('labs.review_desc')}</p>
                  
                  {normalizedPreviewMetrics ? (
                    <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                      <div className="flex justify-between px-4 py-3 bg-secondary/20 border-b">
                        <span className="text-sm font-medium text-muted-foreground">검사명</span>
                        <span className="text-sm font-medium text-muted-foreground">수치</span>
                      </div>
                      <div className="divide-y max-h-[50vh] overflow-y-auto">
                        {Object.entries(normalizedPreviewMetrics).map(([key, val]: [string, any]) => {
                          const strVal = String(val)
                          const isAbnormal = strVal.includes(' H ') || strVal.includes(' L ') || strVal.endsWith(' H') || strVal.endsWith(' L') || strVal.includes(' H') || strVal.includes(' L')
                          return (
                            <div key={key} className="flex justify-between items-center px-4 py-3 bg-card hover:bg-secondary/10 transition-colors">
                              <span className="text-sm font-medium text-foreground">{key}</span>
                              <span className={`text-sm ${isAbnormal ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                {strVal}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <Textarea 
                      value={ocrText} 
                      onChange={e => setOcrText(e.target.value)}
                      className="min-h-[300px] text-sm p-4 font-mono bg-secondary/10"
                    />
                  )}

                  <Button onClick={handleSaveLab} className="w-full h-16 text-xl rounded-xl flex gap-2 mt-4 shadow-md hover:shadow-lg transition-all">
                    <Save className="w-6 h-6" />
                    {t('common.save')}
                  </Button>
                </div>
              )}

            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4 pb-20">
        {labs.length === 0 ? (
          <Card className="bg-background border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-2 text-muted-foreground">
              <FileText className="w-12 h-12 opacity-20" />
              <p>{t('labs.empty')}</p>
            </CardContent>
          </Card>
        ) : (
          labs.map(lab => (
            <Card key={lab.id} className="rounded-2xl shadow-sm border-0 bg-background overflow-hidden relative">
              <CardHeader className="pb-3 bg-secondary/20 flex flex-row justify-between items-center pr-2 cursor-pointer" onClick={() => toggleExpand(lab.id)}>
                <CardTitle className="text-lg flex items-center gap-2">
                  {expandedLabs.has(lab.id) ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-primary" />}
                  {lab.date}
                </CardTitle>
                <div className="flex items-center" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-primary/80" onClick={() => {
                    setChatLab(lab)
                    setChatHistory(lab.chat_history || [{ role: 'ai', text: '무엇이든 물어보세요! 이 검사 결과에 대해 설명해드릴 수 있습니다.' }])
                  }}>
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive/60 hover:text-destructive" onClick={() => handleDeleteLab(lab.id)}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2 p-0">
                {(() => {
                  let normMetrics = normalizeMetrics(lab.parsedData?.metrics)
                  if (!normMetrics && lab.parsedData) {
                    normMetrics = normalizeMetrics(lab.parsedData)
                    if (normMetrics) {
                      delete normMetrics.type
                      delete normMetrics.reportDate
                      delete normMetrics.medicationName
                      delete normMetrics.rawTextSummary
                      delete normMetrics.dosageAmount
                      delete normMetrics.dosageUnit
                      if (Object.keys(normMetrics).length === 0) normMetrics = null
                    }
                  }
                  
                  if (normMetrics && expandedLabs.has(lab.id)) {
                    return (
                      <div className="flex flex-col divide-y divide-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex justify-between px-4 py-2 bg-secondary/5">
                          <span className="text-xs text-muted-foreground font-medium">검사명</span>
                          <span className="text-xs text-muted-foreground font-medium">수치</span>
                        </div>
                        {Object.entries(normMetrics).map(([key, val]: [string, any]) => {
                          const strVal = String(val)
                          const isAbnormal = strVal.includes(' H ') || strVal.includes(' L ') || strVal.endsWith(' H') || strVal.endsWith(' L') || strVal.includes(' H') || strVal.includes(' L')
                          return (
                            <div key={key} className="flex justify-between items-center px-4 py-3">
                              <span className="text-sm font-medium text-foreground">{key}</span>
                              <span className={`text-sm ${isAbnormal ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                {strVal}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  } else if (normMetrics && !expandedLabs.has(lab.id)) {
                    return (
                      <div className="px-4 py-3 text-sm text-muted-foreground bg-secondary/5 flex items-center justify-between group cursor-pointer" onClick={() => toggleExpand(lab.id)}>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(normMetrics).slice(0, 3).map(k => (
                            <span key={k} className="bg-background px-2 py-0.5 rounded border text-[11px] font-medium">
                              {k}
                            </span>
                          ))}
                          {Object.keys(normMetrics).length > 3 && (
                            <span className="text-[11px] opacity-60">외 {Object.keys(normMetrics).length - 3}건...</span>
                          )}
                        </div>
                        <span className="text-primary text-xs font-semibold group-hover:underline">상세보기</span>
                      </div>
                    )
                  } else {
                    return (
                      <div className="p-4 mx-4 mb-4 bg-secondary/30 rounded-lg text-sm max-h-32 overflow-hidden relative">
                        {lab.content.slice(0, 150)}...
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-secondary/30 to-transparent" />
                      </div>
                    )
                  }
                })()}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      <Dialog open={!!chatLab} onOpenChange={(open) => !open && setChatLab(null)}>
        <DialogContent className="w-full max-w-md translate-y-0 rounded-none border-0 flex flex-col p-0 overflow-hidden gap-0"
          style={{
            // Sit the whole dialog inside the safe area so the header and
            // close button clear the status bar / home indicator.
            top: `calc(${chatViewport.top}px + env(safe-area-inset-top, 0px))`,
            height: `calc(${chatViewport.height}px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`,
            maxHeight: `calc(${chatViewport.height}px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`,
          }}>
          <DialogHeader className="p-4 border-b bg-secondary/10 shrink-0">
            <DialogTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              AI 검사결과 분석
            </DialogTitle>
          </DialogHeader>
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary/40 text-foreground rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatting && (
              <div className="flex w-full justify-start">
                <div className="max-w-[85%] rounded-2xl p-3 text-sm bg-secondary/40 rounded-tl-sm flex gap-1 items-center">
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-75" />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}
          </div>
          <div className="p-3 border-t bg-background shrink-0 flex items-center gap-2">
            <Textarea 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              onFocus={() => {
                // iOS keyboard: scroll chat to bottom after keyboard opens
                setTimeout(() => {
                  chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' })
                }, 300)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAskAI()
                }
              }}
              placeholder="질문을 입력하세요..." 
              className="min-h-[48px] max-h-32 resize-none rounded-xl"
            />
            <Button size="icon" onClick={handleAskAI} disabled={!chatInput.trim() || isChatting} className="w-12 h-12 rounded-full shrink-0">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

