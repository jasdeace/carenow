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

/**
 * Get an OAuth2 Access Token for Firebase FCM v1 API
 */
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

// Helpers for JWT
function b64(str: string) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64sig(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function str2ab(pem: string) {
  // Normalize all possible newline representations
  let str = pem.replace(/\\n/g, "\n").replace(/\\r/g, "");
  
  // Extract just the base64 content between the PEM headers
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const headerStart = str.indexOf(pemHeader);
  const footerStart = str.indexOf(pemFooter);
  
  if (headerStart === -1 || footerStart === -1) {
    throw new Error("Invalid PEM format - missing header/footer");
  }
  
  const pemContents = str.substring(headerStart + pemHeader.length, footerStart).replace(/[\s\n\r]/g, "");
  
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return binaryDer.buffer;
}

async function sendPushNotification(fcmToken: string, title: string, body: string, serviceAccount: any): Promise<{status: number, response: string}> {
  try {
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
          notification: {
            title,
            body
          },
          data: {
            type: 'medication_reminder'
          },
          apns: {
            headers: {
              'apns-priority': '10',
              'apns-push-type': 'alert'
            },
            payload: {
              aps: {
                alert: {
                  title,
                  body
                },
                sound: 'default',
                badge: 1
              }
            }
          }
        }
      })
    });

    const responseText = await response.text();
    console.log('FCM response:', response.status, responseText);
    return { status: response.status, response: responseText };
  } catch (error) {
    console.error("Error sending push (v1):", error);
    return { status: 0, response: error.message };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const serviceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountRaw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is missing");
    const serviceAccount = JSON.parse(serviceAccountRaw);

    // Current time in Seoul
    const now = new Date();
    const seoulTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const currentHour = seoulTime.getHours();
    const currentMinute = seoulTime.getMinutes();
    const todayStr = seoulTime.getFullYear() + '-' + String(seoulTime.getMonth() + 1).padStart(2, '0') + '-' + String(seoulTime.getDate()).padStart(2, '0');

    console.log(`Checking meds at ${currentHour}:${currentMinute} (Seoul Time), date: ${todayStr}`);

    // Fetch active meds with schedules
    const { data: meds, error: medsError } = await supabase
      .from('medications')
      .select(`
        id, name_ko, user_id,
        medication_schedules ( id, time_of_day )
      `)
      .eq('is_active', true);

    if (medsError) throw medsError;

    console.log(`Found ${meds?.length || 0} active medications`);

    let debugInfo: any[] = [];
    let notificationsSent = 0;

    for (const med of meds) {
      if (!med.medication_schedules) continue;
      const takerUserId = med.user_id;
      if (!takerUserId) continue;

      for (const schedule of med.medication_schedules) {
        if (!schedule.time_of_day) continue;
        const [schedHour, schedMin] = schedule.time_of_day.split(':').map(Number);
        
        const diffMinutes = (currentHour * 60 + currentMinute) - (schedHour * 60 + schedMin);

        // On-time alert: 0-4 min window (matches one 5-min cron tick)
        // Late alert: 60-64 min window (matches one 5-min cron tick)
        const isAtTimeAlert = diffMinutes >= 0 && diffMinutes < 5;
        const isSixtyMinAlert = diffMinutes >= 60 && diffMinutes < 65;

        console.log(`Med: ${med.name_ko}, schedule: ${schedule.time_of_day}, diff: ${diffMinutes}min, onTime: ${isAtTimeAlert}, late: ${isSixtyMinAlert}`);

        if (isAtTimeAlert || isSixtyMinAlert) {
          // Check if THIS SPECIFIC DOSE was taken today
          const { data: logs } = await supabase
            .from('medication_logs')
            .select('id, scheduled_at')
            .eq('medication_id', med.id)
            .eq('status', 'taken')
            .gte('taken_at', `${todayStr}T00:00:00+09:00`);

          const isAlreadyTaken = logs?.some(log => {
            if (!log.scheduled_at) return true; // Fallback for old logs without scheduled_at
            // Convert UTC scheduled_at to Seoul time for comparison
            const logDate = new Date(log.scheduled_at);
            const seoulLogTime = logDate.toLocaleTimeString('en-GB', { 
              hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' 
            }); // "09:00"
            const schedTime = schedule.time_of_day.substring(0, 5); // "09:00"
            return seoulLogTime === schedTime;
          });

          console.log(`Med: ${med.name_ko}, already taken: ${isAlreadyTaken}, logs: ${logs?.length || 0}`);

          if (!isAlreadyTaken) {
            const { data: user } = await supabase
              .from('users')
              .select('fcm_token')
              .eq('id', takerUserId)
              .single();

            if (user?.fcm_token) {
              let title = '약 복용 시간입니다';
              let body = `${med.name_ko} 복용 시간입니다. 잊지 마세요!`;

              if (isSixtyMinAlert) {
                title = '약 복용 잊지 않으셨나요?';
                body = `${med.name_ko}을(를) 아직 복용하지 않으셨습니다. 잊지말고 복용해주세요.`;
              }

              const fcmResult = await sendPushNotification(user.fcm_token, title, body, serviceAccount);
              notificationsSent++;

              debugInfo.push({ 
                med: med.name_ko,
                alertType: isSixtyMinAlert ? 'late' : 'ontime',
                schedTime: schedule.time_of_day,
                diffMinutes,
                fcmStatus: fcmResult.status, 
                fcmResponse: fcmResult.response, 
                tokenUsed: user.fcm_token.substring(0, 20) + '...' 
              });
            } else {
              console.log(`No FCM token for user ${takerUserId}`);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notificationsSent,
      serverTime: `${currentHour}:${currentMinute}`,
      today: todayStr,
      medsChecked: meds?.length || 0,
      debug: debugInfo
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch(error) {
    console.error('Error in check-medication-reminders:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    })
  }
})

