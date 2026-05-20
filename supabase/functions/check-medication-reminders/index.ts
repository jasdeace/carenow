// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// @ts-ignore
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const isExpoToken = (t?: string | null) => !!t && t.startsWith('ExponentPushToken')

async function sendExpoPush(token: string, title: string, body: string, data: Record<string, string>) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: 'default',
      priority: 'high',
      data,
    }),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok && json?.data?.status === 'ok', status: res.status, json }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Seoul wall-clock — schedules are stored in local time, alerts must match.
    const seoul = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const curHour = seoul.getHours()
    const curMin = seoul.getMinutes()
    const todayStr = `${seoul.getFullYear()}-${String(seoul.getMonth() + 1).padStart(2, '0')}-${String(seoul.getDate()).padStart(2, '0')}`

    const { data: meds, error: medsError } = await supabase
      .from('medications')
      .select(`
        id, name_ko, user_id,
        medication_schedules ( id, time_of_day )
      `)
      .eq('is_active', true)
    if (medsError) throw medsError

    const debug: any[] = []
    let sent = 0

    for (const med of meds || []) {
      if (!med.user_id || !med.medication_schedules) continue

      for (const schedule of med.medication_schedules as any[]) {
        if (!schedule.time_of_day) continue
        const [schedHour, schedMin] = schedule.time_of_day.split(':').map(Number)

        // Cron fires every 5 min, so a 5-min window catches one tick exactly once.
        const diff = curHour * 60 + curMin - (schedHour * 60 + schedMin)
        const onTime = diff >= 0 && diff < 5
        const late = diff >= 60 && diff < 65
        if (!onTime && !late) continue

        // Skip if this exact dose was already taken today
        const { data: logs } = await supabase
          .from('medication_logs')
          .select('scheduled_at')
          .eq('medication_id', med.id)
          .eq('status', 'taken')
          .gte('taken_at', `${todayStr}T00:00:00+09:00`)

        const schedHHMM = schedule.time_of_day.substring(0, 5)
        const alreadyTaken = logs?.some((log: any) => {
          if (!log.scheduled_at) return true
          const seoulLog = new Date(log.scheduled_at).toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul',
          })
          return seoulLog === schedHHMM
        })
        if (alreadyTaken) continue

        // Dedup: one push per (medication, schedule, date, alert type).
        // sent_notifications.notification_key is UNIQUE — insert wins or fails.
        const notifKey = `med-${med.id}-${schedule.id}-${todayStr}-${late ? 'late' : 'ontime'}`
        const { error: dupErr } = await supabase
          .from('sent_notifications')
          .insert({ notification_key: notifKey })
        if (dupErr) {
          // Conflict = already sent for this tick window. Other errors we log but skip too.
          continue
        }

        const { data: user } = await supabase
          .from('users')
          .select('fcm_token')
          .eq('id', med.user_id)
          .maybeSingle()

        if (!isExpoToken(user?.fcm_token)) {
          debug.push({ med: med.name_ko, skipped: 'no_expo_token', userId: med.user_id })
          continue
        }

        const title = late ? '약 복용 잊지 않으셨나요?' : '약 복용 시간입니다'
        const body = late
          ? `${med.name_ko}을(를) 아직 복용하지 않으셨습니다. 잊지말고 복용해주세요.`
          : `${med.name_ko} 복용 시간입니다. 잊지 마세요!`

        const result = await sendExpoPush(user!.fcm_token!, title, body, {
          type: 'medication_reminder',
          medicationId: String(med.id),
        })
        sent++
        debug.push({
          med: med.name_ko,
          alert: late ? 'late' : 'ontime',
          schedTime: schedHHMM,
          ok: result.ok,
          status: result.status,
          expo: result.json?.data ?? result.json,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        serverTime: `${curHour}:${String(curMin).padStart(2, '0')}`,
        today: todayStr,
        medsChecked: meds?.length || 0,
        debug,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('check-medication-reminders error:', error)
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
