import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPhone, normalizePhone } from '../lib/phoneUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const normalized = normalizePhone(phone)
    const fakeEmail = `${normalized}@carelink.app`

    const { error } = await supabase.auth.signInWithPassword({ 
      email: fakeEmail, 
      password 
    })
    setLoading(false)
    if (error) {
      setError(t('auth.login_failed'))
    } else {
      navigate('/')
    }
  }

  return (
    <div className="flex flex-col h-screen w-full items-center justify-center px-4 bg-secondary/30">
      <div className="flex flex-col items-center mb-8">
        <img src="/carelink_logo.png" alt="CareLink Logo" className="w-20 h-20 rounded-3xl shadow-xl mb-4" />
        <h1 className="text-4xl font-extrabold text-primary tracking-tighter">CareLink</h1>
        <p className="text-muted-foreground text-sm font-medium mt-1">Care Circle Connection & Med Management</p>
      </div>

      <Card className="w-full max-w-sm shadow-2xl border-0">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.login_title')}</CardTitle>
          <CardDescription>{t('auth.login_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
                className="h-14 text-lg"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full text-lg h-12" type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('auth.login_btn')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t('auth.no_account')}{' '}
            <Link to="/signup" className="underline">{t('auth.signup_link')}</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
