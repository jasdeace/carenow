// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`

    const prompt = `
      You are a highly accurate medical OCR assistant. Your job is to extract text from the provided image(s) of a lab result or medication prescription. 
      The text might be in English or Korean. Ensure you accurately extract both languages.
      
      If it looks like a Medication Prescription/Label, extract the medication name and dosage amount.
      If it looks like a Lab Result, extract all key metrics (e.g., Blood pressure, Glucose, Cholesterol, White blood cell count) into key-value pairs.
      
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
      throw new Error(geminiData.error?.message || "Failed to contact Gemini API")
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
      structuredJson: structuredJson
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
