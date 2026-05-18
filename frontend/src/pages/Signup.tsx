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
  const [agreedTOS, setAgreedTOS] = useState(false)
  const [agreedSensitive, setAgreedSensitive] = useState(false)

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
    if (!agreedTOS || !agreedSensitive) {
      setError('모든 필수 동의 항목에 체크해 주세요.')
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

            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-2">
                <input 
                  type="checkbox" 
                  id="tos-agree" 
                  checked={agreedTOS}
                  onChange={(e) => setAgreedTOS(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="tos-agree" className="text-sm leading-tight text-muted-foreground">
                  <Link to="/terms" className="text-primary underline">이용약관</Link> 및 <Link to="/privacy" className="text-primary underline">개인정보처리방침</Link>에 동의합니다. (필수)
                </label>
              </div>

              <div className="flex items-start space-x-2">
                <input 
                  type="checkbox" 
                  id="sensitive-agree" 
                  checked={agreedSensitive}
                  onChange={(e) => setAgreedSensitive(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="sensitive-agree" className="text-sm leading-tight text-muted-foreground">
                  <Link to="/sensitive-info" className="text-primary underline">민감정보(건강정보) 수집 및 이용</Link>에 동의합니다. (필수)
                </label>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full text-lg h-12" type="submit" disabled={loading || !agreedTOS || !agreedSensitive}>
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
