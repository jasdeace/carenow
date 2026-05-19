import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { api } from '../lib/api'
import { formatPhone } from '../lib/phoneUtils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, UserPlus, Heart, ChevronRight, Trash2 } from 'lucide-react'

export default function GiverHome() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [takers, setTakers] = useState<any[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) fetchTakers()
  }, [user?.id])

  const fetchTakers = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const list = await api.getGiverTakersList(user.id)
      setTakers(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (e: React.MouseEvent, taker: any) => {
    e.stopPropagation() // Prevent card click (navigation)
    if (!user?.id) return

    const name = taker.display_name_ko || 'Taker'
    const confirmed = window.confirm(t('caregiver.disconnect_confirm', { name }))
    if (!confirmed) return

    setDisconnecting(taker.id)
    try {
      // Resolve the circle_id from the loved_one record, then leave it
      const circleId = taker.circle_id || await api.getTakerCircleId(taker.id)
      if (!circleId) throw new Error('Circle not found')
      await api.leaveCareCircle(user.id, circleId)
      await fetchTakers()
    } catch (err: any) {
      console.error(err)
      alert(t('caregiver.disconnect_error') + ': ' + err.message)
    } finally {
      setDisconnecting(null)
    }
  }

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !inviteCode) return
    setJoining(true)
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inviteCode)
      
      if (isUUID) {
        await api.joinCareCircle(user.id, inviteCode)
      } else {
        const normalized = inviteCode.replace(/\D/g, '')
        if (!normalized) throw new Error('Invalid phone number format')
        await api.joinCareCircleByPhone(user.id, normalized)
      }
      
      setInviteCode('')
      await fetchTakers()
    } catch (e: any) {
      console.error(e)
      alert(t('caregiver.join_error') + ': ' + e.message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="flex flex-col space-y-6 w-full max-w-md mx-auto">
      
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-1">{t('caregiver.my_takers')}</h2>
        {takers.length === 0 ? (
          <Card className="bg-secondary/20 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Heart className="w-12 h-12 mb-3 text-muted-foreground/50" />
              <p>{t('caregiver.no_takers')}</p>
              <p className="text-sm">{t('caregiver.no_takers_hint')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {takers.map(taker => (
              <Card 
                key={taker.id} 
                className={`transition-colors ${!taker.accepted_at ? 'opacity-70 cursor-not-allowed border-amber-200 bg-amber-50/10' : 'cursor-pointer hover:bg-secondary/20'}`}
                onClick={() => {
                  if (taker.accepted_at) {
                    navigate(`/giver/dashboard/${taker.id}`)
                  }
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {taker.display_name_ko?.charAt(0) || 'T'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{taker.display_name_ko || 'Taker'}</h3>
                        {!taker.accepted_at && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-300 text-amber-700 bg-amber-50">{t('common.pending')}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {taker.accepted_at ? t('caregiver.view_dashboard') : t('caregiver.awaiting_acceptance')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 text-destructive border-destructive/20 hover:bg-destructive/10 rounded-full flex items-center gap-1"
                      onClick={(e) => handleDisconnect(e, taker)}
                      disabled={disconnecting === taker.id}
                    >
                      {disconnecting === taker.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm font-medium">{t('common.delete')}</span>
                        </>
                      )}
                    </Button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="mt-8 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{t('caregiver.connect_new')}</CardTitle>
          </div>
          <CardDescription>{t('caregiver.connect_new_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinCircle} className="space-y-3 flex flex-col">
            <Input 
              value={inviteCode}
              onChange={(e) => setInviteCode(formatPhone(e.target.value))}
              placeholder="010-XXXX-XXXX"
              required
              className="h-12 text-lg"
            />
            <Button type="submit" className="w-full h-12" disabled={joining}>
              {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : t('common.connect')}
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}
