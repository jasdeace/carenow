import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { processImageOCR } from '../lib/ocrService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Plus, Camera, Loader2, Save } from 'lucide-react'

export default function LabResults() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  
  const [labs, setLabs] = useState<any[]>([])
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrText, setOcrText] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setOcrLoading(true)
    setOcrText('')

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        
        // Use premium for high quality extraction if subscribed, else free (Tesseract)
        const tier = profile?.tier === 'premium' ? 'premium' : 'free'
        try {
          const result = await processImageOCR(base64String, tier)
          
          // Since this is lab results, we dump the text to a textarea for manual review/editing
          if (result.parsedData) {
            setOcrText(JSON.stringify(result.parsedData, null, 2))
          } else {
            setOcrText(result.rawText)
          }
        } catch (err) {
          console.error('OCR failed', err)
          alert(t('labs.ocr_failed'))
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

  const handleSaveLab = () => {
    // Optimistic save
    setLabs([
      ...labs, 
      { id: Math.random().toString(), date: new Date().toISOString().split('T')[0], content: ocrText }
    ])
    setIsUploadOpen(false)
    setOcrText('')
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/20 px-4 pt-8 space-y-6 max-w-md mx-auto">
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
                    capture="environment" 
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
                  <p className="text-sm font-medium">{t('labs.review_desc')}</p>
                  <Textarea 
                    value={ocrText} 
                    onChange={e => setOcrText(e.target.value)}
                    className="min-h-[300px] text-sm p-4"
                  />
                  <Button onClick={handleSaveLab} className="w-full h-16 text-xl rounded-xl flex gap-2 mt-4">
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
            <Card key={lab.id} className="rounded-2xl shadow-sm border-0 bg-background">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Result: {lab.date}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/30 p-3 rounded-lg text-sm max-h-32 overflow-hidden relative">
                  {lab.content.slice(0, 150)}...
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-secondary/30 to-transparent" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
