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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, profileId, prompt, history } = await req.json()
    if (!userId || !profileId || !prompt) {
      throw new Error("Missing userId, profileId, or prompt")
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set")

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Ownership check is the .eq('user_id', userId) here — service role
    // bypasses RLS, so we re-impose it explicitly.
    const { data: report, error: rErr } = await supabase
      .from('health_profile')
      .select('id, user_id, highlights, risks, watch, next_actions, summary, chat_history, generated_at')
      .eq('id', profileId)
      .eq('user_id', userId)
      .maybeSingle()
    if (rErr) throw rErr
    if (!report) throw new Error('Report not found')

    const systemInstruction = `You are a careful health-coaching AI for the Bodacare app.
The user is asking about a specific health report you (the AI) previously generated for
them. Use the report as the primary context for your answers.

REPORT:
${JSON.stringify({
  generated_at: report.generated_at,
  summary: report.summary,
  highlights: report.highlights,
  risks: report.risks,
  watch: report.watch,
  next_actions: report.next_actions,
}, null, 2)}

Answer in Korean. Reference the report's specific points (use the same numbers / phrases
when relevant). DO NOT diagnose; phrase findings as observations and suggestions. If the
user asks about something not covered by the report, you can offer general guidance but
note that it's outside this snapshot.`

    const contents: any[] = []
    if (Array.isArray(history)) {
      for (const msg of history) {
        // Skip the message that's being sent now (avoid double-counting)
        if (msg.role === 'user' && msg.text === prompt) continue
        contents.push({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        })
      }
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] })

    const res = await fetch(buildGeminiEndpoint(GEMINI_API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('Gemini error:', JSON.stringify(data))
      throw new Error(data.error?.message || 'Gemini call failed')
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Persist the new turn so reopening the report shows the chat
    const newHistory = [
      ...(Array.isArray(report.chat_history) ? report.chat_history : []),
      { role: 'user', text: prompt },
      { role: 'ai', text },
    ]
    await supabase
      .from('health_profile')
      .update({ chat_history: newHistory })
      .eq('id', profileId)

    return new Response(JSON.stringify({ text, chat_history: newHistory }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    const err = e as Error
    console.error('chat-health-report error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
