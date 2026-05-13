import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { api, cleanDrugName } from '../lib/api'
import { processImageOCR } from '../lib/ocrService'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Pill, Plus, Camera, Loader2, Check, Trash2, Search, Info } from 'lucide-react'

export default function Medications() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  
  const [meds, setMeds] = useState<any[]>([])
  const [pendingMeds, setPendingMeds] = useState<any[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Add Med Form State
  const [medName, setMedName] = useState('')
  const [dosageAmt, setDosageAmt] = useState('')
  const [dosageUnit, setDosageUnit] = useState('mg')
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(['09:00'])
  const [ocrLoading, setOcrLoading] = useState(false)
  
  // Drug API search state
  const [drugResults, setDrugResults] = useState<any[]>([])
  const [drugSearching, setDrugSearching] = useState(false)
  const [showDrugResults, setShowDrugResults] = useState(false)
  const searchTimeoutRef = useRef<any>(null)
  
  // Drug detail dialog
  const [drugDetail, setDrugDetail] = useState<any>(null)
  const [drugDetailLoading, setDrugDetailLoading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile?.loved_one_id) loadMeds()
  }, [profile?.loved_one_id])

  const loadMeds = async () => {
    if (!profile?.loved_one_id) return
    try {
      const [activeData, pendingData] = await Promise.all([
        api.getMedications(profile.loved_one_id),
        api.getPendingMedications(profile.loved_one_id)
      ])
      setMeds(activeData || [])
      setPendingMeds(pendingData || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleAcceptMed = async (medId: string) => {
    try {
      await api.acceptMedication(medId)
      loadMeds() // Refresh both lists
    } catch (err: any) {
      console.error(err)
      alert(`Failed to accept medication: ${err.message || 'Unknown error'}`)
    }
  }

  const handleToggleActive = async (medId: string, currentStatus: boolean) => {
    try {
      await api.toggleMedicationActive(medId, !currentStatus)
      loadMeds()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteMed = async (medId: string) => {
    try {
      await api.deleteMedication(medId)
      loadMeds()
    } catch (e) {
      console.error(e)
    }
  }

  const addScheduleTime = () => setScheduleTimes([...scheduleTimes, '09:00'])
  const removeScheduleTime = (index: number) => setScheduleTimes(scheduleTimes.filter((_, i) => i !== index))
  const updateScheduleTime = (index: number, val: string) => {
    const next = [...scheduleTimes]
    next[index] = val
    setScheduleTimes(next)
  }

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.loved_one_id) {
      alert('Error: No active care profile found. If you are a caregiver, please add medications via the Giver Dashboard.');
      return;
    }
    try {
      console.log('Attempting to save medication:', { medName, dosageAmt, dosageUnit, scheduleTimes });
      await api.addMedication(profile.loved_one_id, medName, String(dosageAmt), dosageUnit, profile.id, scheduleTimes)
      setIsAddOpen(false)
      setMedName(''); setDosageAmt(''); setDosageUnit('mg'); setScheduleTimes(['09:00'])
      alert('새로운 약이 추가되었습니다.');
      await loadMeds() // Refresh real data
    } catch (err: any) {
      console.error(err)
      alert(`Failed to add medication: ${err.message || 'Unknown error'}`)
    }
  }

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setOcrLoading(true)

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        
        // Determine tier. Assuming free for MVP testing if not set
        const tier = profile?.tier === 'premium' ? 'premium' : 'free'
        
        try {
          const result = await processImageOCR([base64String], tier)
          
          // Basic heuristic to extract med name from raw text for MVP
          if (result.parsedData) {
            setMedName(cleanDrugName(result.parsedData.medicationName || ''))
            setDosageAmt(result.parsedData.dosageAmount || '')
            setDosageUnit(result.parsedData.dosageUnit || 'mg')
          } else {
            // Very rough Tesseract fallback parse
            const text = result.rawText
            setMedName(cleanDrugName(text.split('\n')[0] || 'Unknown Med'))
            setDosageAmt('1')
          }
        } catch (err) {
          console.error('OCR failed', err)
          alert(t('meds.ocr_failed'))
        } finally {
          setOcrLoading(false)
          setTimeout(() => {
            document.getElementById('medName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById('medName')?.focus();
          }, 300);
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error(err)
      setOcrLoading(false)
    }
  }

  const handleMedNameChange = (value: string) => {
    setMedName(value)
    setShowDrugResults(true)
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    
    if (value.trim().length < 2) {
      setDrugResults([])
      return
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setDrugSearching(true)
      try {
        const result = await api.searchDrugInfo(value.trim())
        setDrugResults(result.drugs || [])
      } catch (err) {
        console.error('Drug search failed:', err)
        setDrugResults([])
      } finally {
        setDrugSearching(false)
      }
    }, 400)
  }

  const selectDrug = (drug: any) => {
    setMedName(cleanDrugName(drug.itemName))
    setShowDrugResults(false)
    setDrugResults([])
  }

  const lookupDrugDetail = async (medNameKo: string) => {
    if (!medNameKo) return
    setDrugDetailLoading(true)
    setDrugDetail(null)
    try {
      const result = await api.searchDrugInfo(medNameKo)
      if (result.drugs && result.drugs.length > 0) {
        setDrugDetail(result.drugs[0])
      } else {
        setDrugDetail({ itemName: medNameKo, notFound: true })
      }
    } catch (err) {
      console.error('Drug detail lookup failed:', err)
      setDrugDetail({ itemName: medNameKo, notFound: true })
    } finally {
      setDrugDetailLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/20 px-4 pt-8 space-y-6 max-w-md mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('meds.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('meds.subtitle')}</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="w-14 h-14 rounded-full shadow-lg">
              <Plus className="w-8 h-8" />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-11/12 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">{t('meds.add_title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              
              {/* OCR Button */}
              <div className="space-y-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageCapture}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-20 text-lg flex flex-col gap-1 border-primary/50 text-primary bg-primary/5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrLoading}
                >
                  {ocrLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                  {ocrLoading ? t('common.loading') : t('meds.scan_prescription')}
                </Button>
                <p className="text-xs text-center text-muted-foreground">{t('meds.scan_desc')}</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
              </div>

              {/* Manual Form */}
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="medName">{t('meds.med_name')}</Label>
                  <div className="relative">
                    <Input 
                      id="medName"
                      name="medName"
                      required 
                      value={medName} 
                      onChange={e => handleMedNameChange(e.target.value)}
                      onFocus={() => medName.trim().length >= 2 && setShowDrugResults(true)}
                      onBlur={() => setTimeout(() => setShowDrugResults(false), 200)}
                      className="h-14 text-lg pr-10" 
                      placeholder="약 이름을 입력하세요"
                      autoComplete="off"
                    />
                    {drugSearching && <Loader2 className="w-5 h-5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                    {!drugSearching && medName.trim().length >= 2 && <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />}
                  </div>
                  {showDrugResults && drugResults.length > 0 && (
                    <div className="absolute z-50 w-full bg-background border rounded-xl shadow-lg max-h-48 overflow-y-auto mt-1">
                      {drugResults.map((drug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors border-b last:border-b-0 flex flex-col"
                          onMouseDown={() => selectDrug(drug)}
                        >
                          <span className="font-medium text-sm">{drug.itemName}</span>
                          <span className="text-xs text-muted-foreground truncate">{drug.entpName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <Label>{t('meds.dosage_amt')} / {t('meds.dosage_unit')}</Label>
                  <div className="flex gap-2">
                    <Input 
                      required 
                      type="text" 
                      value={dosageAmt} 
                      onChange={e => setDosageAmt(e.target.value)} 
                      className="h-12 flex-[2] text-lg" 
                      placeholder="e.g. 10 or 10/60" 
                    />
                    <Input 
                      required 
                      value={dosageUnit} 
                      onChange={e => setDosageUnit(e.target.value)} 
                      className="h-12 flex-1 text-lg" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>복용 시간 (하루 {scheduleTimes.length}회)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addScheduleTime} className="h-8 text-primary">
                      <Plus className="w-4 h-4 mr-1" /> 추가
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {scheduleTimes.map((time, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Input 
                          type="time" 
                          value={time} 
                          onChange={(e) => updateScheduleTime(idx, e.target.value)}
                          className="h-10 text-sm"
                        />
                        {scheduleTimes.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeScheduleTime(idx)} className="h-10 w-10 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full h-16 text-xl rounded-xl mt-4">
                  {t('common.save')}
                </Button>
              </form>

            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4 pb-20">
        {/* Pending Meds from Giver */}
        {pendingMeds.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-yellow-600 flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{t('common.new')}</Badge>
              {t('profile.giver_added_meds')}
            </h2>
            {pendingMeds.map(med => (
              <Card key={med.id} className="rounded-2xl shadow-sm border-2 border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">{med.name_ko || med.name_en}</h3>
                      <p className="text-muted-foreground">{med.dosage_amount}{med.dosage_unit}</p>
                    </div>
                  </div>
                  <Button onClick={() => handleAcceptMed(med.id)} size="sm" className="h-10 px-4 gap-1">
                    <Check className="w-4 h-4" />
                    {t('common.accept')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Active Meds */}
        {meds.length === 0 && pendingMeds.length === 0 ? (
          <Card className="bg-background border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-2 text-muted-foreground">
              <Pill className="w-12 h-12 opacity-20" />
              <p>{t('meds.empty')}</p>
            </CardContent>
          </Card>
        ) : (
          meds.map(med => (
            <Card key={med.id} className={`rounded-2xl shadow-sm border-0 overflow-hidden transition-all ${med.is_active ? 'bg-background' : 'bg-secondary/40 opacity-75'}`}>
              <CardContent className="p-0">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => lookupDrugDetail(med.name_ko || med.name_en)}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${med.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-medium">{med.name_ko || med.name_en}</h3>
                        {!med.is_active && <Badge variant="secondary" className="text-[10px] h-4">비활성</Badge>}
                      </div>
                      <p className="text-muted-foreground">{med.dosage_amount}{med.dosage_unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1 mr-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">{med.is_active ? 'ON' : 'OFF'}</span>
                      <button 
                        onClick={() => handleToggleActive(med.id, med.is_active)}
                        className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${med.is_active ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${med.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMed(med.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                
                {/* Expanded Section for schedules */}
                <div className="px-4 pb-4 pt-0 border-t border-secondary/50 mt-1">
                  <div className="flex flex-wrap gap-2 pt-3">
                    {med.medication_schedules?.map((s: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 text-primary/50" /> {s.time_of_day?.substring(0, 5)}
                      </Badge>
                    ))}
                    <Button variant="ghost" size="icon" onClick={() => lookupDrugDetail(med.name_ko || med.name_en)} className="w-6 h-6 ml-auto">
                      <Info className="w-4 h-4 text-primary/60" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Drug Detail Dialog */}
      <Dialog open={!!drugDetail || drugDetailLoading} onOpenChange={(open) => !open && setDrugDetail(null)}>
        <DialogContent className="w-11/12 rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              {drugDetail?.itemName || '약 정보 조회중...'}
            </DialogTitle>
          </DialogHeader>
          {drugDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : drugDetail?.notFound ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>'{drugDetail.itemName}'에 대한 정보를 찾을 수 없습니다.</p>
              <p className="text-xs mt-2">정확한 약품명으로 다시 검색해보세요.</p>
            </div>
          ) : drugDetail ? (
            <div className="space-y-4">
              {drugDetail.itemImage && (
                <img src={drugDetail.itemImage} alt={drugDetail.itemName} className="w-full rounded-xl border" />
              )}
              {drugDetail.entpName && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">제조사</h4>
                  <p className="text-sm mt-1">{drugDetail.entpName}</p>
                </div>
              )}
              {drugDetail.efcyQesitm && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">효능</h4>
                  <p className="text-sm mt-1" dangerouslySetInnerHTML={{ __html: drugDetail.efcyQesitm }} />
                </div>
              )}
              {drugDetail.useMethodQesitm && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">용법·용량</h4>
                  <p className="text-sm mt-1" dangerouslySetInnerHTML={{ __html: drugDetail.useMethodQesitm }} />
                </div>
              )}
              {drugDetail.atpnQesitm && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">⚠️ 주의사항</h4>
                  <p className="text-sm mt-1 text-yellow-700 dark:text-yellow-400" dangerouslySetInnerHTML={{ __html: drugDetail.atpnQesitm }} />
                </div>
              )}
              {drugDetail.intrcQesitm && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">상호작용</h4>
                  <p className="text-sm mt-1" dangerouslySetInnerHTML={{ __html: drugDetail.intrcQesitm }} />
                </div>
              )}
              {drugDetail.seQesitm && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">부작용</h4>
                  <p className="text-sm mt-1 text-destructive/80" dangerouslySetInnerHTML={{ __html: drugDetail.seQesitm }} />
                </div>
              )}
              {drugDetail.depositMethodQesitm && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">보관법</h4>
                  <p className="text-sm mt-1" dangerouslySetInnerHTML={{ __html: drugDetail.depositMethodQesitm }} />
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
