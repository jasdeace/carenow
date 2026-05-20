// Diagnostic-only function — lists what Gemini models the project's
// GEMINI_API_KEY can actually call. Delete after we've picked the
// right one for GEMINI_MODEL in ../_shared/gemini.ts.
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// @ts-ignore
declare const Deno: any;

serve(async () => {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Probe both API versions — some models live in only one.
  const v1beta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  const v1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`)
  const v1betaData = await v1beta.json().catch(() => ({ error: 'parse failed' }))
  const v1Data = await v1.json().catch(() => ({ error: 'parse failed' }))

  const compact = (d: any) =>
    Array.isArray(d?.models)
      ? d.models.map((m: any) => ({
          name: m.name,
          methods: m.supportedGenerationMethods,
        }))
      : d

  return new Response(
    JSON.stringify({ v1beta: compact(v1betaData), v1: compact(v1Data) }, null, 2),
    { headers: { 'Content-Type': 'application/json' }, status: 200 },
  )
})
