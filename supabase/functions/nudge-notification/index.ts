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

async function sendPushNotification(fcmToken: string, title: string, body: string, serviceAccount: any) {
  const accessToken = await getAccessToken(serviceAccount);
  const project_id = serviceAccount.project_id;

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${project_id}/messages:send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title, body },
        data: { type: 'nudge' },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
              badge: 1
            }
          }
        }
      }
    })
  });
  return response;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { takerUserId, medName, senderName } = await req.json()
    if (!takerUserId) throw new Error("Missing takerUserId")

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const serviceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountRaw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is missing")
    const serviceAccount = JSON.parse(serviceAccountRaw)

    // 1. Get Loved One and check hourly limit (if column exists)
    let lastNudgedAt = null;
    let lovedOneId = null;

    const { data: loData, error: loError } = await supabase
      .from('loved_ones')
      .select('id, last_nudged_at')
      .eq('user_id', takerUserId)
      .maybeSingle();

    if (loError) {
      console.error("Error fetching loved_one:", loError);
      // If column doesn't exist, loError.code will be '42703' (undefined_column)
      // We'll proceed without the limit if the column is missing
      const { data: loIdOnly } = await supabase
        .from('loved_ones')
        .select('id')
        .eq('user_id', takerUserId)
        .single();
      lovedOneId = loIdOnly?.id;
    } else {
      lovedOneId = loData?.id;
      lastNudgedAt = loData?.last_nudged_at;
    }

    if (!lovedOneId) throw new Error("Target user not found in loved_ones table");

    if (lastNudgedAt) {
      const lastNudged = new Date(lastNudgedAt)
      const now = new Date()
      const diffMs = now.getTime() - lastNudged.getTime()
      if (diffMs < 60 * 60 * 1000) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "한 시간에 한 번만 재촉할 수 있습니다.",
          remainingMins: Math.ceil((60 * 60 * 1000 - diffMs) / (60 * 1000))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        })
      }
    }

    // 2. Get Taker's FCM token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', takerUserId)
      .single();

    if (userError || !userData?.fcm_token) {
      throw new Error("Target user has no FCM token");
    }

    const targetFcmToken = userData.fcm_token;

    const title = '약 복용 알림';
    const body = medName 
      ? (senderName ? `${senderName}님이 ${medName} 복용을 잊지 말라고 메시지를 보냈습니다.` : `${medName} 복용을 잊지 마세요!`)
      : (senderName ? `${senderName}님이 약 복용을 잊지 말라고 메시지를 보냈습니다.` : `아직 복용하지 않은 약이 있습니다. 잊지 마세요!`);

    const fcmResponse = await sendPushNotification(targetFcmToken, title, body, serviceAccount)
    
    // Update last_nudged_at (try-catch because column might be missing)
    try {
      await supabase
        .from('loved_ones')
        .update({ last_nudged_at: new Date().toISOString() })
        .eq('id', lovedOneId)
    } catch (e) {
      console.warn("Failed to update last_nudged_at (column probably missing):", e)
    }

    const result = await fcmResponse.json()

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
