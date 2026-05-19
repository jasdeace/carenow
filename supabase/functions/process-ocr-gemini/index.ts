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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, imagesBase64 } = await req.json()
    const images = imagesBase64 || (imageBase64 ? [imageBase64] : [])
    
    if (images.length === 0) {
      throw new Error("Missing images payload")
    }

    const imageParts = images.map((b64: string) => ({
      inline_data: {
        mime_type: "image/jpeg",
        data: b64.replace(/^data:image\/\w+;base64,/, "")
      }
    }))

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in Edge Function secrets")
    }

    console.log("Auto-discovered best model:", GEMINI_MODEL)

    const geminiEndpoint = buildGeminiEndpoint(GEMINI_API_KEY)

    const prompt = `
      You are a professional medical data extraction assistant. 
      Your goal is to extract structured data from medical documents (lab results or prescriptions) with 100% accuracy.
      
      CRITICAL INSTRUCTIONS:
      1. Extract all metric names EXACTLY as they appear (e.g., "HbA1c", "AST/ALT").
      2. Keep units (e.g., mg/dL, %) together with the value if possible, or in a clear format.
      3. For lab results, the 'metrics' object should contain every single test item found.
      4. If you see 'H' (High) or 'L' (Low) markers next to values, include them (e.g. "140 H").
      5. The text is in Korean and English. Do not translate metric names; extract them as written.
      6. FIND THE REPORT DATE: Look for "Date of report", "검사일", "수령일", or any date on the document. This is critical.
      
      Respond ONLY with a valid JSON object matching this structure:
      {
        "type": "medication" | "lab_result" | "unknown",
        "reportDate": "YYYY-MM-DD or null",
        "medicationName": "string or null",
        "dosageAmount": "string or null",
        "dosageUnit": "string or null",
        "metrics": { "metricName": "value" },
        "rawTextSummary": "A brief summary of what the document is."
      }
    `

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              ...imageParts
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
        }
      })
    })

    const geminiData = await response.json()

    if (!response.ok) {
      console.error("Gemini Error:", geminiData)
      return new Response(JSON.stringify({ 
        error: geminiData.error?.message || "Failed to contact Gemini API",
        debug: { modelUsed: modelId, status: response.status }
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      })
    }

    // Extract the JSON string from Gemini's response
    let jsonString = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    // Strip markdown formatting if Gemini included it
    jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim()
    
    let structuredJson = null
    try {
      structuredJson = JSON.parse(jsonString)
    } catch (e) {
      console.error("Failed to parse Gemini JSON output:", jsonString)
    }

    return new Response(JSON.stringify({
      rawText: jsonString,
      structuredJson: structuredJson,
      modelUsed: modelId
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch(error) {
    const err = error as Error;
    console.error("Edge Function Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})
