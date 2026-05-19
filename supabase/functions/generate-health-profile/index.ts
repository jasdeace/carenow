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

const round = (n: number) => Math.round(n * 10) / 10
const avg = (nums: number[]): number | null =>
  nums.length ? round(nums.reduce((s, n) => s + n, 0) / nums.length) : null

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function krDate(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

function krDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return krDate(d)
}

// Used to flag abnormal lab values — matches the same heuristic as the lab
// results UI (H/L suffix markers).
const ABNORMAL = / H$| L$| H | L /

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await req.json()
    if (!userId) throw new Error("Missing userId")

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set")

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const since30iso = isoDaysAgo(30)
    const since14iso = isoDaysAgo(14)
    const since14krDate = krDaysAgo(14)

    // Pull all the user's recent data in parallel — aggregated server-side
    // before being sent to the model to keep token cost low.
    const [medsRes, bpRes, glRes, wtRes, bcRes, nutRes, labRes, goalRes] = await Promise.all([
      supabase
        .from('medications')
        .select('id, name_ko, is_active')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('vitals_blood_pressure')
        .select('systolic, diastolic, pulse, measured_at')
        .eq('user_id', userId)
        .gte('measured_at', since30iso)
        .order('measured_at', { ascending: false }),
      supabase
        .from('vitals_glucose')
        .select('value_mmol, measurement_timing, measured_at')
        .eq('user_id', userId)
        .gte('measured_at', since30iso)
        .order('measured_at', { ascending: false }),
      supabase
        .from('vitals_weight')
        .select('weight_kg, measured_at')
        .eq('user_id', userId)
        .gte('measured_at', since30iso)
        .order('measured_at', { ascending: false }),
      supabase
        .from('body_composition')
        .select('weight_kg, skeletal_muscle_kg, body_fat_kg, body_fat_pct, recorded_at')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(2),
      supabase
        .from('nutrition_entries')
        .select('entry_date, entry_type, meal_type, description, activity_name, duration_minutes, calories, protein_g, carbs_g, fat_g')
        .eq('user_id', userId)
        .gte('entry_date', since14krDate),
      supabase
        .from('lab_results')
        .select('parsed_data, recorded_at')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(3),
      supabase.from('nutrition_goals').select('*').eq('user_id', userId).maybeSingle(),
    ])

    const meds = medsRes.data || []
    const bp = bpRes.data || []
    const gl = glRes.data || []
    const wt = wtRes.data || []
    const bc = bcRes.data || []
    const nut = nutRes.data || []
    const labs = labRes.data || []
    const goal = goalRes.data

    // Medication adherence (last 14 days) — keyed via medication_id, no
    // user_id on the logs table.
    let medAdherence: { taken: number; logged: number; rate_pct: number | null } = {
      taken: 0,
      logged: 0,
      rate_pct: null,
    }
    if (meds.length) {
      const { data: logs } = await supabase
        .from('medication_logs')
        .select('status, scheduled_at, taken_at')
        .in('medication_id', meds.map((m: any) => m.id))
        .or(`scheduled_at.gte.${since14iso},taken_at.gte.${since14iso}`)
      const taken = logs?.filter((l: any) => l.status === 'taken').length || 0
      const logged = logs?.length || 0
      medAdherence = {
        taken,
        logged,
        rate_pct: logged > 0 ? Math.round((taken / logged) * 100) : null,
      }
    }

    const sys = bp.map((b: any) => Number(b.systolic)).filter(Number.isFinite)
    const dia = bp.map((b: any) => Number(b.diastolic)).filter(Number.isFinite)
    const bpSummary = bp.length
      ? {
          count: bp.length,
          avg_sys: avg(sys),
          avg_dia: avg(dia),
          max_sys: Math.max(...sys),
          max_dia: Math.max(...dia),
          latest_sys: bp[0].systolic,
          latest_dia: bp[0].diastolic,
          latest_at: bp[0].measured_at,
        }
      : null

    const glVals = gl.map((g: any) => Number(g.value_mmol)).filter(Number.isFinite)
    const fasting = gl
      .filter((g: any) => g.measurement_timing === 'fasting')
      .map((g: any) => Number(g.value_mmol))
      .filter(Number.isFinite)
    const glSummary = gl.length
      ? {
          count: gl.length,
          avg: avg(glVals),
          avg_fasting: avg(fasting),
          max: Math.max(...glVals),
          latest: gl[0].value_mmol,
          latest_at: gl[0].measured_at,
        }
      : null

    const wtSummary = wt.length
      ? {
          latest_kg: wt[0].weight_kg,
          earliest_kg: wt[wt.length - 1].weight_kg,
          change_kg: round(Number(wt[0].weight_kg) - Number(wt[wt.length - 1].weight_kg)),
          count: wt.length,
        }
      : null

    const bcSummary = bc.length ? { latest: bc[0], previous: bc[1] || null } : null

    const mealEntries = nut.filter((e: any) => e.entry_type === 'meal')
    const activityEntries = nut.filter((e: any) => e.entry_type === 'activity')
    const daysLogged = new Set(mealEntries.map((e: any) => e.entry_date)).size
    const denom = daysLogged || 1
    const nutSummary =
      mealEntries.length || activityEntries.length
        ? {
            days_logged: daysLogged,
            avg_daily_calories_in: Math.round(
              mealEntries.reduce((s: number, e: any) => s + (e.calories || 0), 0) / denom,
            ),
            avg_daily_calories_out: Math.round(
              activityEntries.reduce((s: number, e: any) => s + Math.abs(e.calories || 0), 0) / denom,
            ),
            avg_daily_protein_g: Math.round(
              mealEntries.reduce((s: number, e: any) => s + Number(e.protein_g || 0), 0) / denom,
            ),
            avg_daily_carbs_g: Math.round(
              mealEntries.reduce((s: number, e: any) => s + Number(e.carbs_g || 0), 0) / denom,
            ),
            avg_daily_fat_g: Math.round(
              mealEntries.reduce((s: number, e: any) => s + Number(e.fat_g || 0), 0) / denom,
            ),
            sample_meals: mealEntries.slice(0, 12).map((e: any) => ({
              meal: e.meal_type,
              desc: e.description,
              kcal: e.calories,
            })),
          }
        : null

    const labsAbnormal = labs
      .map((l: any) => {
        const m = l.parsed_data?.metrics ?? l.parsed_data ?? {}
        const abnormal: Record<string, string> = {}
        for (const [k, v] of Object.entries(m)) {
          const s = String(v)
          if (ABNORMAL.test(s)) abnormal[k] = s
        }
        return { recorded_at: l.recorded_at, abnormal }
      })
      .filter((x: any) => Object.keys(x.abnormal).length > 0)
      .slice(0, 2)

    const context = {
      window: 'last 30 days (vitals/labs/body comp), last 14 days (meds/nutrition)',
      medication_adherence: medAdherence,
      medications: meds.map((m: any) => m.name_ko),
      blood_pressure: bpSummary,
      glucose: glSummary,
      weight_trend: wtSummary,
      body_composition: bcSummary,
      nutrition: nutSummary,
      labs_abnormal: labsAbnormal,
      goal,
    }

    const systemInstruction = `You are a careful health-coaching AI for the CareNow app.
Today is ${krDate(new Date())} (Asia/Seoul).

You are given an aggregated 14–30 day snapshot of one user's health data:
${JSON.stringify(context, null, 2)}

Produce a personalised health snapshot. Write in Korean. Be evidence-based and
reference real numbers from the context. DO NOT diagnose; phrase findings as
observations and suggestions. When data for a category is missing, return an
empty array for that bucket — do not invent.

RESPONSE FORMAT — return ONLY this JSON, no markdown:
{
  "highlights": ["2-5 short positive observations, e.g. '복약률 92% 유지'"],
  "risks":      ["2-5 short risk observations grounded in numbers, e.g. '평균 수축기 혈압 145 — 경계'"],
  "watch":      ["2-4 patterns to watch, qualitative OK, e.g. '식단에 나트륨이 많아 보임'"],
  "next_actions": ["2-4 concrete, doable actions, e.g. '하루 단백질 +10g 목표'"],
  "summary":    "한 문장으로 전반적 평가."
}`

    const endpoint = buildGeminiEndpoint(GEMINI_API_KEY)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: '내 건강 리포트를 작성해 주세요.' }] }],
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('Gemini error:', JSON.stringify(data))
      throw new Error(data.error?.message || 'Gemini call failed')
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { highlights: [], risks: [], watch: [], next_actions: [], summary: text }
    }

    const profile = {
      user_id: userId,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      watch: Array.isArray(parsed.watch) ? parsed.watch : [],
      next_actions: Array.isArray(parsed.next_actions) ? parsed.next_actions : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : null,
      updated_at: new Date().toISOString(),
    }

    const { data: saved, error: upErr } = await supabase
      .from('health_profile')
      .upsert(profile)
      .select()
      .single()
    if (upErr) throw upErr

    return new Response(JSON.stringify(saved), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    const err = e as Error
    console.error('generate-health-profile error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
