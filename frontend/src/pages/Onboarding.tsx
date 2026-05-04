import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, fetchProfile } = useAuthStore()
  
  const [name, setName] = useState('')
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    setError(null)

    // Extract phone from the auth metadata (set during signup)
    const phoneFromAuth = user.user_metadata?.phone_kr || ''
    
    const { error } = await supabase
      .from('users')
      .update({
        name_ko: name,
        phone_kr: phoneFromAuth,
        role: role
      })
      .eq('id', user.id)

    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }

    try {
      if (role === 'loved_one') {
        await api.createCareCircleForLovedOne(user.id, name)
      }
      await fetchProfile(user.id)
      navigate('/')
    } catch (apiError: any) {
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 bg-secondary/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.onboarding_title')}</CardTitle>
          <CardDescription>{t('auth.onboarding_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.name')}</Label>
              <Input 
                id="name" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.name_placeholder')}
                className="h-14 text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">{t('auth.role')}</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger id="role" className="h-14 text-lg">
                  <SelectValue placeholder={t('auth.role_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loved_one">{t('roles.loved_one')}</SelectItem>
                  <SelectItem value="caregiver">{t('roles.caregiver')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            
            <Button className="w-full text-lg h-12 mt-4" type="submit" disabled={loading || !role}>
              {loading ? t('common.loading') : t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
