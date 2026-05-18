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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, message, todayEntries, dailySummary, chatHistory } = await req.json()
    
    if (!userId || !message) {
      throw new Error("Missing userId or message")
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set")

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const contextStr = JSON.stringify({
      today_entries: todayEntries || [],
      daily_summary: dailySummary || {},
    }, null, 2)

    const systemInstruction = `You are a professional nutritionist AI for the CareNow app.
Your goal is to help users track their nutrition and activity through conversation.

CURRENT CONTEXT:
${contextStr}

ACTIONS:
You can trigger data changes by including an "actions" array in your JSON response.
Supported actions:
- { "type": "add_meal", "meal_type": "breakfast|lunch|dinner|snack", "description": "name", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }
- { "type": "add_activity", "activity_name": "name", "duration_minutes": number, "calories": number (positive value) }
- { "type": "delete_entry", "id": "entry_uuid" }

RESPONSE FORMAT:
You MUST return a JSON object with this exact structure:
{
  "reply": "Your friendly message to the user in Korean",
  "actions": [ ... list of actions or empty array ... ]
}

RULES:
- Be encouraging and professional.
- If the user mentions eating something, estimate the calories/macros if not provided.
- If the user mentions exercise, estimate calories burned.
- If the user asks to "delete" or "remove" something, find the ID from today_entries in the context.
- Use metric units (g, kcal).
- Keep the reply concise and friendly.
- If the user's message doesn't require any data changes, return empty actions array.
- ALWAYS return valid JSON. No markdown, no explanation outside the JSON.`

    // Use same model pattern as ask-ai (which works)
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`

    // Build conversation contents — same pattern as working ask-ai function
    const contents: any[] = []
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        // Skip duplicate of current message
        if (msg.role === 'user' && msg.text === message) continue;
        // Skip intro messages
        if (msg.role === 'ai' && msg.text.includes('무엇이든')) continue;
        if (msg.role === 'ai' && msg.text.includes('안녕하세요')) continue;
        contents.push({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        })
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
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
      console.error("Gemini API error:", JSON.stringify(geminiData))
      throw new Error(geminiData.error?.message || "Failed to contact Gemini API")
    }

    let text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    // Clean markdown wrappers
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim()

    let result: any = { reply: "죄송합니다, 처리 중 문제가 발생했습니다.", actions: [] }
    try {
      result = JSON.parse(text)
    } catch (e) {
      // If Gemini returned plain text instead of JSON, use it as the reply
      result = { reply: text, actions: [] }
    }

    // Execute actions if any
    const executedActions: any[] = []
    for (const action of (result.actions || [])) {
      try {
        if (action.type === 'add_meal') {
          const { data, error } = await supabase
            .from('nutrition_entries')
            .insert({
              user_id: userId,
              entry_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
              entry_type: 'meal',
              meal_type: action.meal_type,
              description: action.description,
              calories: action.calories,
              protein_g: action.protein_g,
              carbs_g: action.carbs_g,
              fat_g: action.fat_g
            })
            .select()
            .single()

          if (!error) executedActions.push({ type: 'add_meal', success: true, entry: data })
          else console.error('Failed to add meal:', error)
        } else if (action.type === 'add_activity') {
          const { data, error } = await supabase
            .from('nutrition_entries')
            .insert({
              user_id: userId,
              entry_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
              entry_type: 'activity',
              activity_name: action.activity_name,
              duration_minutes: action.duration_minutes,
              calories: -Math.abs(action.calories || 0)
            })
            .select()
            .single()

          if (!error) executedActions.push({ type: 'add_activity', success: true, entry: data })
          else console.error('Failed to add activity:', error)
        } else if (action.type === 'delete_entry' && action.id) {
          const { error } = await supabase
            .from('nutrition_entries')
            .delete()
            .eq('id', action.id)

          if (!error) executedActions.push({ type: 'delete_entry', success: true, id: action.id })
        }
      } catch (actionError) {
        console.error('Action execution error:', actionError)
      }
    }

    return new Response(JSON.stringify({
      reply: result.reply,
      actions: executedActions,
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    })

  } catch(error) {
    const err = error as Error;
    console.error("nutrition-chat error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})
