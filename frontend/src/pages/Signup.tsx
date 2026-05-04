import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPhone, normalizePhone } from '../lib/phoneUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function Signup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(t('auth.password_mismatch'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.password_too_short'))
      return
    }

    const normalized = normalizePhone(phone)
    if (!normalized || normalized.length < 10) {
      setError(t('auth.invalid_phone'))
      return
    }

    setLoading(true)
    const fakeEmail = `${normalized}@carelink.app`
    
    const { error: signupError } = await supabase.auth.signUp({ 
      email: fakeEmail, 
      password,
      options: {
        data: { phone_kr: normalized }
      }
    })
    
    setLoading(false)
    if (signupError) {
      if (signupError.message.includes('already registered')) {
        setError(t('auth.already_registered'))
      } else {
        setError(signupError.message)
      }
    } else {
      navigate('/onboarding')
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 bg-secondary/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.signup_title')}</CardTitle>
          <CardDescription>{t('auth.signup_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('auth.phone')}</Label>
              <Input 
                id="phone" type="tel" required 
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder={t('auth.phone_placeholder')}
                className="h-14 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input 
                id="password" type="password" required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password_placeholder')}
                className="h-14 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirm_password')}</Label>
              <Input 
                id="confirmPassword" type="password" required 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirm_password_placeholder')}
                className="h-14 text-lg"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full text-lg h-12" type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('auth.signup_btn')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t('auth.has_account')}{' '}
            <Link to="/login" className="underline">{t('auth.login_btn')}</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
