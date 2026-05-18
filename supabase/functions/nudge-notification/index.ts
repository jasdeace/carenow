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

async function sendExpoPush(message: any) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(message),
  })
  return res.json()
}

const isExpoToken = (t?: string) => !!t && t.startsWith('ExponentPushToken')

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { takerUserId, medName, senderName } = await req.json()
    if (!takerUserId) throw new Error('Missing takerUserId')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Hourly rate limit via loved_ones.last_nudged_at
    const { data: lovedOne } = await supabase
      .from('loved_ones')
      .select('id, last_nudged_at')
      .eq('user_id', takerUserId)
      .maybeSingle()

    if (lovedOne?.last_nudged_at) {
      const diff = Date.now() - new Date(lovedOne.last_nudged_at).getTime()
      if (diff < 60 * 60 * 1000) {
        return new Response(
          JSON.stringify({ success: false, message: '한 시간에 한 번만 재촉할 수 있습니다.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 },
        )
      }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', takerUserId)
      .single()

    if (!isExpoToken(userData?.fcm_token)) {
      throw new Error('Target user has no push token')
    }

    const title = '약 복용 알림'
    const body = medName
      ? `${senderName || '가족'}님이 ${medName} 복용을 잊지 말라고 알림을 보냈습니다.`
      : `${senderName || '가족'}님이 약 복용을 잊지 말라고 알림을 보냈습니다.`

    const result = await sendExpoPush({
      to: userData!.fcm_token,
      title,
      body,
      sound: 'default',
      priority: 'high',
      data: { type: 'nudge' },
    })

    if (lovedOne?.id) {
      await supabase
        .from('loved_ones')
        .update({ last_nudged_at: new Date().toISOString() })
        .eq('id', lovedOne.id)
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
