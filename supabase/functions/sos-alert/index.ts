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

async function getAccessToken(serviceAccount: any) {
  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const key = await crypto.subtle.importKey(
    "pkcs8",
    str2ab(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const encodedHeader = b64(JSON.stringify(jwtHeader));
  const encodedPayload = b64(JSON.stringify(jwtPayload));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  const jwt = `${encodedHeader}.${encodedPayload}.${b64sig(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

function b64(str: string) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64sig(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function str2ab(pem: string) {
  let str = pem.replace(/\\n/g, "\n").replace(/\\r/g, "");
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const headerStart = str.indexOf(pemHeader);
  const footerStart = str.indexOf(pemFooter);
  if (headerStart === -1 || footerStart === -1) throw new Error("Invalid PEM format");
  const pemContents = str.substring(headerStart + pemHeader.length, footerStart).replace(/[\s\n\r]/g, "");
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) binaryDer[i] = binaryDerString.charCodeAt(i);
  return binaryDer.buffer;
}

async function sendPush(accessToken: string, projectId: string, fcmToken: string, title: string, body: string) {
  return fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title, body },
        data: { type: 'sos' },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
              badge: 1,
              'interruption-level': 'time-sensitive'
            }
          }
        }
      }
    })
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { senderUserId } = await req.json()
    if (!senderUserId) throw new Error("Missing senderUserId")

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const serviceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountRaw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is missing")
    const serviceAccount = JSON.parse(serviceAccountRaw)

    // Who is raising the alarm
    const { data: sender } = await supabase
      .from('users')
      .select('name_ko, name')
      .eq('id', senderUserId)
      .maybeSingle()
    const senderName = sender?.name_ko || sender?.name || '가족'

    // The circle centered on this user's health data
    const { data: lovedOne } = await supabase
      .from('loved_ones')
      .select('circle_id')
      .eq('user_id', senderUserId)
      .maybeSingle()
    if (!lovedOne?.circle_id) throw new Error("No care circle found for this user")

    // Everyone watching this user, excluding the user themselves
    const { data: members, error: memberError } = await supabase
      .from('care_circle_members')
      .select('user_id')
      .eq('circle_id', lovedOne.circle_id)
      .neq('user_id', senderUserId)
    if (memberError) throw memberError

    const watcherIds = (members || []).map((m: any) => m.user_id)
    if (watcherIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: watchers } = await supabase
      .from('users')
      .select('id, fcm_token')
      .in('id', watcherIds)

    const title = '🚨 긴급 도움 요청'
    const body = `${senderName}님이 긴급 도움을 요청했습니다. 지금 확인해주세요.`

    const accessToken = await getAccessToken(serviceAccount)
    const projectId = serviceAccount.project_id

    let sent = 0
    for (const w of watchers || []) {
      if (!w.fcm_token) continue
      try {
        const resp = await sendPush(accessToken, projectId, w.fcm_token, title, body)
        if (resp.ok) sent++
        else console.error('FCM rejected for', w.id, await resp.text())
      } catch (e) {
        console.error('Push failed for', w.id, e)
      }
    }

    return new Response(JSON.stringify({ success: true, sent, total: watcherIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
