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
import { Pill, Plus, Camera, Loader2 } from 'lucide-react'

export default function Medications() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  
  const [meds, setMeds] = useState<any[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Add Med Form State
  const [medName, setMedName] = useState('')
  const [dosageAmt, setDosageAmt] = useState('')
  const [dosageUnit, setDosageUnit] = useState('정')
  const [ocrLoading, setOcrLoading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile?.id) loadMeds()
  }, [profile?.id])

  const loadMeds = async () => {
    if (!profile?.id) return
    try {
      const data = await api.getMedications(profile.id)
      setMeds(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    // For MVP, we'd add to the database here using a new api method
    // Optimistic update
    setMeds([...meds, { 
      id: Math.random().toString(), 
      name_ko: medName, 
      dosage_amount: Number(dosageAmt), 
      dosage_unit: dosageUnit,
      is_active: true
    }])
    setIsAddOpen(false)
    setMedName(''); setDosageAmt(''); setDosageUnit('정')
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
          const result = await processImageOCR(base64String, tier)
          
          // Basic heuristic to extract med name from raw text for MVP
          if (result.parsedData) {
            setMedName(result.parsedData.medicationName || '')
            setDosageAmt(result.parsedData.dosageAmount || '')
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
                  <Label>{t('meds.med_name')}</Label>
                  <Input required value={medName} onChange={e => setMedName(e.target.value)} className="h-14 text-lg" />
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>{t('meds.dosage_amt')}</Label>
                    <Input required type="number" value={dosageAmt} onChange={e => setDosageAmt(e.target.value)} className="h-14 text-lg" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>{t('meds.dosage_unit')}</Label>
                    <Input required value={dosageUnit} onChange={e => setDosageUnit(e.target.value)} className="h-14 text-lg" />
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
        {meds.length === 0 ? (
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
