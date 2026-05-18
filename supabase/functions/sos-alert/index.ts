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

// Send a batch of messages through the Expo push service.
async function sendExpoPush(messages: any[]) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })
  return res.json()
}

const isExpoToken = (t?: string) => !!t && t.startsWith('ExponentPushToken')

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { senderUserId } = await req.json()
    if (!senderUserId) throw new Error('Missing senderUserId')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: sender } = await supabase
      .from('users')
      .select('name_ko, name')
      .eq('id', senderUserId)
      .maybeSingle()
    const senderName = sender?.name_ko || sender?.name || '가족'

    const { data: lovedOne } = await supabase
      .from('loved_ones')
      .select('circle_id')
      .eq('user_id', senderUserId)
      .maybeSingle()
    if (!lovedOne?.circle_id) throw new Error('No care circle found for this user')

    const { data: members, error: memberError } = await supabase
      .from('care_circle_members')
      .select('user_id')
      .eq('circle_id', lovedOne.circle_id)
      .neq('user_id', senderUserId)
    if (memberError) throw memberError

    const watcherIds = (members || []).map((m: any) => m.user_id)
    if (watcherIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: watchers } = await supabase
      .from('users')
      .select('id, fcm_token')
      .in('id', watcherIds)

    const title = '🚨 긴급 도움 요청'
    const body = `${senderName}님이 긴급 도움을 요청했습니다. 지금 확인해주세요.`

    const messages = (watchers || [])
      .filter((w: any) => isExpoToken(w.fcm_token))
      .map((w: any) => ({
        to: w.fcm_token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        data: { type: 'sos' },
      }))

    let result = null
    if (messages.length > 0) result = await sendExpoPush(messages)

    return new Response(
      JSON.stringify({ success: true, sent: messages.length, total: watcherIds.length, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
