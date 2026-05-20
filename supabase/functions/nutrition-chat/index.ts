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

const seoulDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
const isDate = (s: any) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

// Execute user-confirmed actions. entry_date lets the user log meals/activities
// for a past day ("어제 점심에..."); it defaults to today when absent/invalid.
async function executeActions(supabase: any, userId: string, actions: any[]) {
  const today = seoulDate(new Date())
  const executed: any[] = []

  let goalRow: any = null
  if (actions.some((a) => a?.type === 'set_goal')) {
    const { data } = await supabase
      .from('nutrition_goals').select('*').eq('user_id', userId).maybeSingle()
    goalRow = data
  }

  for (const action of actions) {
    try {
      if (action.type === 'set_goal') {
        const { data, error } = await supabase
          .from('nutrition_goals')
          .upsert({
            user_id: userId,
            goal_type: action.goal_type ?? goalRow?.goal_type ?? null,
            daily_calorie_goal:
              action.daily_calorie_goal ?? goalRow?.daily_calorie_goal ?? 2000,
            daily_protein_goal: action.daily_protein_goal ?? goalRow?.daily_protein_goal ?? null,
            notes: action.notes ?? goalRow?.notes ?? null,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()
        if (!error) executed.push({ type: 'set_goal', success: true, goal: data })
        else console.error('Failed to set goal:', error)
      } else if (action.type === 'add_meal') {
        const { data, error } = await supabase
          .from('nutrition_entries')
          .insert({
            user_id: userId,
            entry_date: isDate(action.entry_date) ? action.entry_date : today,
            entry_type: 'meal',
            meal_type: action.meal_type,
            description: action.description,
            calories: action.calories,
            protein_g: action.protein_g,
            carbs_g: action.carbs_g,
            fat_g: action.fat_g,
          })
          .select()
          .single()
        if (!error) executed.push({ type: 'add_meal', success: true, entry: data })
        else console.error('Failed to add meal:', error)
      } else if (action.type === 'add_activity') {
        const { data, error } = await supabase
          .from('nutrition_entries')
          .insert({
            user_id: userId,
            entry_date: isDate(action.entry_date) ? action.entry_date : today,
            entry_type: 'activity',
            activity_name: action.activity_name,
            duration_minutes: action.duration_minutes,
            calories: -Math.abs(action.calories || 0),
          })
          .select()
          .single()
        if (!error) executed.push({ type: 'add_activity', success: true, entry: data })
        else console.error('Failed to add activity:', error)
      } else if (action.type === 'delete_entry' && action.id) {
        const { error } = await supabase
          .from('nutrition_entries')
          .delete()
          .eq('id', action.id)
        if (!error) executed.push({ type: 'delete_entry', success: true, id: action.id })
      }
    } catch (actionError) {
      console.error('Action execution error:', actionError)
    }
  }
  return executed
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { userId } = body
    if (!userId) throw new Error("Missing userId")

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ── APPLY MODE — execute the actions the user confirmed; no AI call ──
    if (Array.isArray(body.applyActions)) {
      const actions = await executeActions(supabase, userId, body.applyActions)
      return new Response(JSON.stringify({ actions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── CHAT MODE — AI proposes a reply + actions; nothing is saved here ──
    const { message, todayEntries, dailySummary, chatHistory } = body
    if (!message) throw new Error("Missing message")

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set")

    // Current nutrition goal (if any)
    const { data: goalRow } = await supabase
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // Latest body composition (InBody) for more precise coaching
    const { data: bodyRows } = await supabase
      .from('body_composition')
      .select('weight_kg, skeletal_muscle_kg, body_fat_kg, body_fat_pct, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1)
    const bodyRow = bodyRows?.[0] || null

    // Persistent AI health snapshot (overall pattern across all features).
    // Lets the coach reference longer-term trends, not just today's numbers.
    // health_profile is now a history table — pick the latest row.
    const { data: healthProfile } = await supabase
      .from('health_profile')
      .select('highlights, risks, watch, next_actions, summary, generated_at')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const today = seoulDate(new Date())
    const yd = new Date()
    yd.setDate(yd.getDate() - 1)
    const yesterday = seoulDate(yd)

    const contextStr = JSON.stringify({
      today_entries: todayEntries || [],
      daily_summary: dailySummary || {},
      nutrition_goal: goalRow || { daily_calorie_goal: null, goal_type: null, notes: null },
      body_composition: bodyRow,
      health_profile: healthProfile,
    }, null, 2)

    const systemInstruction = `You are a professional nutrition and fitness coach AI for the CareNow app.
You help users with diet AND exercise: tracking what they eat and do, setting realistic
daily calorie/protein goals, and giving personalised coaching advice.

TODAY is ${today} (Asia/Seoul). Yesterday was ${yesterday}.

CURRENT CONTEXT:
${contextStr}

YOUR JOB:
1. GOAL SETTING — When the user describes a goal (e.g. lose weight, gain muscle,
   maintain, "5kg 빼고 싶어", "근육 키우고 싶어"), ask brief clarifying questions if
   needed, then propose a sensible daily calorie goal (and protein goal) and emit a
   "set_goal" action. Base it on their stated goal — a moderate deficit for weight loss,
   a surplus for muscle gain, maintenance otherwise.
2. COACHING — When asked for advice, compare today's intake and exercise (from
   daily_summary / today_entries) against their nutrition_goal and give concrete,
   encouraging guidance: how many calories they have left, whether protein is on track,
   what to eat next, whether to add exercise. When body_composition is available
   (weight, skeletal muscle mass, body fat %), use it to make calorie and especially
   PROTEIN targets more precise (e.g. protein scaled to lean/muscle mass).
3. LOGGING — When the user mentions food or exercise, log it via add_meal / add_activity.

ACTIONS — include an "actions" array in your JSON response:
- { "type": "set_goal", "goal_type": "lose|maintain|gain", "daily_calorie_goal": number, "daily_protein_goal": number, "notes": "the user's goal in their words" }
- { "type": "add_meal", "meal_type": "breakfast|lunch|dinner|snack", "description": "name", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "entry_date": "YYYY-MM-DD (optional)" }
- { "type": "add_activity", "activity_name": "name", "duration_minutes": number, "calories": number (positive), "entry_date": "YYYY-MM-DD (optional)" }
- { "type": "delete_entry", "id": "entry_uuid" }

CONFIRMATION FLOW — the actions you return are NOT saved immediately. The app shows
the user a confirmation card listing them and the user taps 확인 to apply. So your
"reply" must DESCRIBE what you are about to log and ASK the user to confirm — never
claim it is already saved. e.g. "점심으로 김치찌개(약 520kcal)를 기록할까요?"

DATES — add_meal and add_activity may include an optional "entry_date" (YYYY-MM-DD).
If the user refers to a past day (어제 → ${yesterday}, 그저께, a specific date), set
entry_date to that day. Omit it when the user means today.

RESPONSE FORMAT — return ONLY this JSON, no markdown:
{
  "reply": "Your friendly coaching message in Korean",
  "actions": [ ... or empty array ... ]
}

RULES:
- Be encouraging, concrete, and professional. Reply in Korean.
- Estimate calories/macros for foods and calories burned for exercise when not given.
- Only emit set_goal when the user is actually setting/changing a goal.
- When coaching, reference real numbers from the context (remaining calories, protein, etc.).
- If the message needs no data change, return an empty actions array.
- ALWAYS return valid JSON.`

    const geminiEndpoint = buildGeminiEndpoint(GEMINI_API_KEY)

    const contents: any[] = []
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        if (msg.role === 'user' && msg.text === message) continue;
        if (msg.role === 'ai' && msg.text.includes('무엇이든')) continue;
        if (msg.role === 'ai' && msg.text.includes('안녕하세요')) continue;
        contents.push({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        })
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] })

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
      }),
    })

    const geminiData = await response.json()
    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(geminiData))
      throw new Error(geminiData.error?.message || "Failed to contact Gemini API")
    }

    let text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim()

    let result: any = { reply: "죄송합니다, 처리 중 문제가 발생했습니다.", actions: [] }
    try {
      result = JSON.parse(text)
    } catch (e) {
      result = { reply: text, actions: [] }
    }

    return new Response(JSON.stringify({
      reply: result.reply,
      pendingActions: Array.isArray(result.actions) ? result.actions : [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error;
    console.error("nutrition-chat error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
