// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { geminiEndpoint as buildGeminiEndpoint } from "../_shared/gemini.ts"

// @ts-ignore
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, context, history, userId } = await req.json()

    if (!prompt) {
      throw new Error("Missing prompt")
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing")

    // Fetch the user's persistent health snapshot if a userId was provided.
    // It lets the lab AI personalise answers (e.g. relate this lab to overall
    // trends) rather than reading the lab in isolation.
    let healthProfile: any = null
    if (userId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const { data } = await supabase
        .from('health_profile')
        .select('highlights, risks, watch, next_actions, summary, generated_at')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      healthProfile = data
    }

    const profileBlock = healthProfile
      ? `\n\nRecent health snapshot (the user's overall pattern across meds, vitals, body composition, nutrition, labs):
${JSON.stringify(healthProfile, null, 2)}
Use this only when it makes the answer more useful — do not force-reference it.
`
      : ''

    const systemInstruction = `You are a helpful medical assistant.

Lab result context:
${JSON.stringify(context, null, 2)}${profileBlock}
Please answer the user's question clearly, concisely, and in Korean. If the context
doesn't have the answer, just say so. Do not diagnose; offer observations and
suggest consulting a doctor for medical decisions.`

    const geminiEndpoint = buildGeminiEndpoint(GEMINI_API_KEY)

    const contents = []
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        // Skip duplicate user message
        if (msg.role === 'user' && msg.text === prompt) continue;
        // Skip the canned intro line
        if (msg.role === 'ai' && msg.text.includes('무엇이든 물어보세요')) continue;
        contents.push({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        })
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    })

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: contents
      })
    })

    const geminiData = await response.json()

    if (!response.ok) {
      throw new Error(geminiData.error?.message || "Failed to contact Gemini API")
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch(error) {
    const err = error as Error;
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
