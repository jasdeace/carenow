// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GEMINI_MODEL, geminiEndpoint as buildGeminiEndpoint } from "../_shared/gemini.ts"

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
    const { imageBase64, userText } = await req.json()

    if (!imageBase64) {
      throw Object.assign(new Error("Missing image payload"), { code: 'MISSING_IMAGE' })
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw Object.assign(new Error("GEMINI_API_KEY is not set"), { code: 'MISSING_API_KEY' })

    console.log("analyze-meal using model:", GEMINI_MODEL)
    const geminiEndpoint = buildGeminiEndpoint(GEMINI_API_KEY)

    const imagePart = {
      inline_data: {
        mime_type: "image/jpeg",
        data: imageBase64.replace(/^data:image\/\w+;base64,/, "")
      }
    }

    const prompt = `You are a professional nutritionist AI. Analyze the food in this image and provide accurate nutritional estimates.

${userText ? `User's description: "${userText}"` : ''}

IMPORTANT RULES:
1. Estimate portion sizes visually. If unsure, use standard serving sizes.
2. Be as accurate as possible with calorie and macro estimates.
3. If multiple dishes are visible, sum them all.
4. Consider Korean food portions and ingredients when applicable.
5. Provide the meal description in Korean.

Respond ONLY with a valid JSON object:
{
  "description": "음식 설명 (Korean)",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "items": [
    { "name": "개별 음식 이름", "estimated_grams": 150 }
  ],
  "calories": 450,
  "protein_g": 25.0,
  "carbs_g": 55.0,
  "fat_g": 12.0,
  "fiber_g": 3.0,
  "confidence": "high" | "medium" | "low",
  "notes": "any relevant nutritional notes in Korean"
}`

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            imagePart
          ]
        }]
      })
    })

    const geminiData = await response.json()

    if (!response.ok) {
      console.error("Gemini API Error:", JSON.stringify(geminiData))
      throw Object.assign(
        new Error(geminiData.error?.message || "Failed to analyze meal"),
        { code: 'GEMINI_ERROR', geminiStatus: response.status },
      )
    }

    let jsonString = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim()

    let result = null
    try {
      result = JSON.parse(jsonString)
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", jsonString)
      throw Object.assign(new Error("AI returned invalid response format"), { code: 'INVALID_RESPONSE_FORMAT' })
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: result,
      modelUsed: modelId
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch(error) {
    const err = error as Error & { code?: string; geminiStatus?: number };
    const code = err.code ?? 'UNKNOWN'
    console.error(`analyze-meal error [${code}]:`, err.message)
    return new Response(JSON.stringify({ error: err.message, code, geminiStatus: err.geminiStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // Return 200 so frontend can read the JSON error body
    })
  }
})
