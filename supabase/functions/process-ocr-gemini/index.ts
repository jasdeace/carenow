import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()
    
    if (!imageBase64) {
      throw new Error("Missing imageBase64 payload")
    }

    // Strip out data:image/jpeg;base64, prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in Edge Function secrets")
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

    const prompt = `
      You are a highly accurate medical OCR assistant. Your job is to extract text from the provided image of a lab result or medication prescription. 
      The text might be in English or Korean. Ensure you accurately extract both languages.
      
      If it looks like a Medication Prescription/Label, extract the medication name and dosage amount.
      If it looks like a Lab Result, extract all key metrics (e.g., Blood pressure, Glucose, Cholesterol, White blood cell count) into key-value pairs.
      
      Respond ONLY with a valid JSON object matching this structure:
      {
        "type": "medication" | "lab_result" | "unknown",
        "medicationName": "string or null",
        "dosageAmount": "string or null",
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
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
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
    const jsonString = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    let structuredJson = {}
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
    console.error("Edge Function Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})
