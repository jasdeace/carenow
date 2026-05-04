import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { processImageOCR } from '../lib/ocrService'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Pill, Plus, Camera, Loader2, Check, Trash2 } from 'lucide-react'

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
  const [ocrLoading, setOcrLoading] = useState(false)
  
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

  const handleDeleteMed = async (medId: string) => {
    try {
      await api.deleteMedication(medId)
      loadMeds()
    } catch (e) {
      console.error(e)
    }
  }

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.loved_one_id) {
      alert('Error: No active care profile found. If you are a caregiver, please add medications via the Giver Dashboard.');
      return;
    }
    try {
      console.log('Attempting to save medication:', { medName, dosageAmt, dosageUnit });
      await api.addMedication(profile.loved_one_id, medName, String(dosageAmt), dosageUnit, profile.id)
      setIsAddOpen(false)
      setMedName(''); setDosageAmt(''); setDosageUnit('mg')
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
            setMedName(result.parsedData.medicationName || '')
            setDosageAmt(result.parsedData.dosageAmount || '')
            setDosageUnit(result.parsedData.dosageUnit || 'mg')
          } else {
            // Very rough Tesseract fallback parse
            const text = result.rawText
            setMedName(text.split('\n')[0] || 'Unknown Med')
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
                <div className="space-y-2">
                  <Label htmlFor="medName">{t('meds.med_name')}</Label>
                  <Input 
                    id="medName"
                    name="medName"
                    required 
                    value={medName} 
                    onChange={e => setMedName(e.target.value)} 
                    className="h-14 text-lg" 
                  />
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="dosageAmt">{t('meds.dosage_amt')}</Label>
                    <Input 
                      id="dosageAmt"
                      name="dosageAmt"
                      required 
                      type="text" 
                      value={dosageAmt} 
                      onChange={e => setDosageAmt(e.target.value)} 
                      className="h-14 text-lg" 
                      placeholder="e.g. 10 or 10/60" 
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="dosageUnit">{t('meds.dosage_unit')}</Label>
                    <Input 
                      id="dosageUnit"
                      name="dosageUnit"
                      required 
                      value={dosageUnit} 
                      onChange={e => setDosageUnit(e.target.value)} 
                      className="h-14 text-lg" 
                    />
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
            <Card key={med.id} className="rounded-2xl shadow-sm border-0 bg-background">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium">{med.name_ko || med.name_en}</h3>
                    <p className="text-muted-foreground">{med.dosage_amount}{med.dosage_unit}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteMed(med.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
