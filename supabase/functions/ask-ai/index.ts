// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { prompt, context, history } = await req.json()
    
    if (!prompt) {
      throw new Error("Missing prompt")
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing")

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`

    const systemInstruction = `You are a helpful medical assistant. You are given the following lab result context:
${JSON.stringify(context, null, 2)}

Please answer the user's question clearly, concisely, and in the language they used (likely Korean). If the context doesn't have the answer, just say so.`

    const contents = []
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        // Skip the very first intro message if it's there, or just pass it all
        // The first intro is usually "무엇이든 물어보세요..."
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
